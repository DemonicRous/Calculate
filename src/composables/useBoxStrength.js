import { reactive, computed, watch } from 'vue';
import { materialDB, bctMatrix, safetyFactors } from '../constants/materials';

// Профили гофрокартона и их толщина (мм)
export const profileOptions = {
  'F': 1,
  'E': 2,
  'D': 2.5,
  'B': 3,
  'C': 4,
  'BE': 5,
  'BD': 5,
  'BC': 7
};

const defaultState = {
  mode: 'calculator',
  // Основной режим
  length: 300,
  width: 200,
  height: 100,
  materialPreset: 'Т-24',
  // Для нагрузки
  weight: 1.5,
  stackHeight: 10,
  stackCoef1: 4,
  stackCoef2: 10,
  storageCondition: 'standard',
  // Для сравнения
  length2: 300,
  width2: 200,
  height2: 100,
  materialPreset2: 'Т-23',
  // Для паллетизации
  palletSize: '800x1200',
  selectedProfile: 'B',        // выбранный профиль
  stackingPattern: 'straight', // 'straight' | 'rotated' | 'cross'
};

const savedState = localStorage.getItem('bct_calculator_state');
const initialState = savedState ? JSON.parse(savedState) : defaultState;

const state = reactive(initialState);

watch(state, (newState) => {
  localStorage.setItem('bct_calculator_state', JSON.stringify(newState));
}, { deep: true });

// ---- Вспомогательные функции ----

function computeFormFactor(L, W, H) {
  const l = L / 10, w = W / 10, h = H / 10;
  if (l <= 0 || w <= 0 || h <= 0) return null;
  return (w * l) / (2 * (w + l)) + (l / w) + (w / h);
}

function getBCTFromTable(markNum, formFactor) {
  const row = bctMatrix[String(markNum)];
  if (!row) return null;
  const minCoeff = 6, maxCoeff = 20;
  if (formFactor < minCoeff || formFactor > maxCoeff) return null;
  const idxLow = Math.floor(formFactor - minCoeff);
  const idxHigh = Math.ceil(formFactor - minCoeff);
  if (idxLow === idxHigh) return row[idxLow] !== undefined ? row[idxLow] : null;
  const valLow = row[idxLow], valHigh = row[idxHigh];
  if (valLow == null) return valHigh;
  if (valHigh == null) return valLow;
  const frac = (formFactor - (idxLow + minCoeff)) / 1;
  return valLow + (valHigh - valLow) * frac;
}

// ---- Основные вычисления для первого короба ----

const ect_knm = computed(() => materialDB[state.materialPreset]?.ect_knm || 0);
const thickness_mm = computed(() => materialDB[state.materialPreset]?.thickness_mm || 0);

const formFactor = computed(() => {
  const ff = computeFormFactor(state.length, state.width, state.height);
  return ff !== null ? ff : 0;
});

const bct_kg = computed(() => {
  const match = state.materialPreset.match(/\d+$/);
  if (!match) return 0;
  const markNum = parseInt(match[0], 10);
  const ff = formFactor.value;
  if (ff < 6 || ff > 20) return 0;
  const val = getBCTFromTable(markNum, ff);
  return val !== null ? val : 0;
});

const conditionFactor = computed(() => safetyFactors[state.storageCondition] || 1.2);

const stackLoad = computed(() => {
  const { weight, stackHeight, stackCoef1, stackCoef2 } = state;
  if (weight <= 0 || stackHeight <= 1) return 0;
  return weight * (stackHeight - 1) * stackCoef1 * stackCoef2 * conditionFactor.value;
});

const safetyMargin = computed(() => {
  const load = stackLoad.value, bct = bct_kg.value;
  if (load <= 0 || bct <= 0) return null;
  return ((bct - load) / bct * 100);
});

// ---- Для второго короба (сравнение) ----

const formFactor2 = computed(() => {
  const ff = computeFormFactor(state.length2, state.width2, state.height2);
  return ff !== null ? ff : 0;
});

const bct2_kg = computed(() => {
  const match = state.materialPreset2.match(/\d+$/);
  if (!match) return 0;
  const markNum = parseInt(match[0], 10);
  const ff = formFactor2.value;
  if (ff < 6 || ff > 20) return 0;
  const val = getBCTFromTable(markNum, ff);
  return val !== null ? val : 0;
});

const diffAbsolute = computed(() => bct2_kg.value - bct_kg.value);
const diffPercent = computed(() => {
  const bct1 = bct_kg.value;
  if (bct1 <= 0) return null;
  return (bct2_kg.value - bct1) / bct1 * 100;
});

// ---- Подбор материала (табличный) ----
const requiredLoad = computed(() => {
  const { weight, stackHeight, stackCoef1, stackCoef2 } = state;
  if (weight <= 0 || stackHeight <= 1) return 0;
  return weight * (stackHeight - 1) * stackCoef1 * stackCoef2 * conditionFactor.value;
});

const recommendedMaterial = computed(() => {
  const load = requiredLoad.value;
  if (load <= 0) return null;

  const L = state.length, W = state.width, H = state.height;
  const ff = computeFormFactor(L, W, H);
  if (ff === null || ff < 6 || ff > 20) return null;

  let best = null;
  let bestECT = Infinity;

  for (const [name, data] of Object.entries(materialDB)) {
    const match = name.match(/\d+$/);
    if (!match) continue;
    const markNum = parseInt(match[0], 10);
    const bct = getBCTFromTable(markNum, ff);
    if (bct !== null && bct >= load) {
      if (data.ect_knm < bestECT) {
        bestECT = data.ect_knm;
        best = name;
      }
    }
  }
  return best;
});

const requiredECT_knm = computed(() => {
  if (!recommendedMaterial.value) return null;
  return materialDB[recommendedMaterial.value]?.ect_knm || null;
});

// ---- Для паллетизации ----
const palletWidth = computed(() => {
  const parts = state.palletSize.split('x');
  return parseInt(parts[0], 10);
});
const palletDepth = computed(() => {
  const parts = state.palletSize.split('x');
  return parseInt(parts[1], 10);
});
const palletHeight = 150; // фиксированная высота поддона

// Толщина выбранного профиля
const profileThickness = computed(() => profileOptions[state.selectedProfile] || 3);

// Внешние размеры коробки (с учётом толщины профиля)
const extLength = computed(() => state.length + 2 * profileThickness.value);
const extWidth = computed(() => state.width + 2 * profileThickness.value);
const extHeight = computed(() => state.height + 2 * profileThickness.value);

// Вспомогательная функция для генерации раскладок
function getLayouts(pW, pD, bL, bW) {
  if (bL <= 0 || bW <= 0) return {};

  const layouts = {};

  // 1. Сетка (straight)
  const colsStraight = Math.floor(pW / bL);
  const rowsStraight = Math.floor(pD / bW);
  if (colsStraight > 0 && rowsStraight > 0) {
    const boxes = [];
    const usedW = colsStraight * bL;
    const usedD = rowsStraight * bW;
    const offsetX = (pW - usedW) / 2;
    const offsetZ = (pD - usedD) / 2;

    for (let i = 0; i < colsStraight; i++) {
      for (let j = 0; j < rowsStraight; j++) {
        boxes.push({
          x: -pW / 2 + offsetX + i * bL + bL / 2,
          z: -pD / 2 + offsetZ + j * bW + bW / 2,
          w: bL,
          d: bW,
          rotated: false
        });
      }
    }
    layouts.straight = {
      name: 'Сетка',
      count: boxes.length,
      boxes
    };
  } else {
    layouts.straight = { name: 'Сетка', count: 0, boxes: [] };
  }

  // 2. Поворот (rotated)
  const colsRotated = Math.floor(pW / bW);
  const rowsRotated = Math.floor(pD / bL);
  if (colsRotated > 0 && rowsRotated > 0) {
    const boxes = [];
    const usedW = colsRotated * bW;
    const usedD = rowsRotated * bL;
    const offsetX = (pW - usedW) / 2;
    const offsetZ = (pD - usedD) / 2;

    for (let i = 0; i < colsRotated; i++) {
      for (let j = 0; j < rowsRotated; j++) {
        boxes.push({
          x: -pW / 2 + offsetX + i * bW + bW / 2,
          z: -pD / 2 + offsetZ + j * bL + bL / 2,
          w: bW,
          d: bL,
          rotated: true
        });
      }
    }
    layouts.rotated = {
      name: 'Поворот',
      count: boxes.length,
      boxes
    };
  } else {
    layouts.rotated = { name: 'Поворот', count: 0, boxes: [] };
  }

  // 3. Перевязка (interlocking)
  // Ищем лучший сплит по ширине или глубине
  let bestInterlocking = { count: 0, boxes: [] };

  // Сплит по ширине
  const maxColsL = Math.floor(pW / bL);
  for (let c1 = 0; c1 <= maxColsL; c1++) {
    const w1 = c1 * bL;
    const w2 = pW - w1;
    const c2 = Math.floor(w2 / bW);

    const r1 = Math.floor(pD / bW);
    const r2 = Math.floor(pD / bL);

    const count = c1 * r1 + c2 * r2;
    if (count > bestInterlocking.count && c1 > 0 && c2 > 0) {
      const boxes = [];
      const totalUsedW = w1 + c2 * bW;
      const offsetX = (pW - totalUsedW) / 2;

      // Блок 1 (продольные)
      const offsetZ1 = (pD - r1 * bW) / 2;
      for (let i = 0; i < c1; i++) {
        for (let j = 0; j < r1; j++) {
          boxes.push({
            x: -pW / 2 + offsetX + i * bL + bL / 2,
            z: -pD / 2 + offsetZ1 + j * bW + bW / 2,
            w: bL,
            d: bW,
            rotated: false
          });
        }
      }
      // Блок 2 (поперечные)
      const offsetZ2 = (pD - r2 * bL) / 2;
      for (let i = 0; i < c2; i++) {
        for (let j = 0; j < r2; j++) {
          boxes.push({
            x: -pW / 2 + offsetX + w1 + i * bW + bW / 2,
            z: -pD / 2 + offsetZ2 + j * bL + bL / 2,
            w: bW,
            d: bL,
            rotated: true
          });
        }
      }
      bestInterlocking = { count, boxes };
    }
  }

  // Сплит по глубине
  const maxRowsW = Math.floor(pD / bW);
  for (let r1 = 0; r1 <= maxRowsW; r1++) {
    const d1 = r1 * bW;
    const d2 = pD - d1;
    const r2 = Math.floor(d2 / bL);

    const c1 = Math.floor(pW / bL);
    const c2 = Math.floor(pW / bW);

    const count = c1 * r1 + c2 * r2;
    if (count > bestInterlocking.count && r1 > 0 && r2 > 0) {
      const boxes = [];
      const totalUsedD = d1 + r2 * bL;
      const offsetZ = (pD - totalUsedD) / 2;

      // Блок 1 (продольные)
      const offsetX1 = (pW - c1 * bL) / 2;
      for (let i = 0; i < c1; i++) {
        for (let j = 0; j < r1; j++) {
          boxes.push({
            x: -pW / 2 + offsetX1 + i * bL + bL / 2,
            z: -pD / 2 + offsetZ + j * bW + bW / 2,
            w: bL,
            d: bW,
            rotated: false
          });
        }
      }
      // Блок 2 (поперечные)
      const offsetX2 = (pW - c2 * bW) / 2;
      for (let i = 0; i < c2; i++) {
        for (let j = 0; j < r2; j++) {
          boxes.push({
            x: -pW / 2 + offsetX2 + i * bW + bW / 2,
            z: -pD / 2 + offsetZ + d1 + j * bL + bL / 2,
            w: bW,
            d: bL,
            rotated: true
          });
        }
      }
      bestInterlocking = { count, boxes };
    }
  }

  layouts.interlocking = {
    name: 'Перевязка',
    count: bestInterlocking.count,
    boxes: bestInterlocking.boxes
  };

  return layouts;
}

// Все рассчитанные раскладки
const availableLayouts = computed(() => {
  return getLayouts(palletWidth.value, palletDepth.value, extLength.value, extWidth.value);
});

// Активная раскладка
const currentLayout = computed(() => {
  const pattern = state.stackingPattern || 'straight';
  return availableLayouts.value[pattern] || availableLayouts.value.straight || { count: 0, boxes: [] };
});

// Эффективность использования площади (%)
const efficiencyArea = computed(() => {
  const pW = palletWidth.value;
  const pD = palletDepth.value;
  if (pW <= 0 || pD <= 0) return 0;
  const palletArea = pW * pD;
  const boxArea = extLength.value * extWidth.value;
  const totalBoxArea = currentLayout.value.count * boxArea;
  return (totalBoxArea / palletArea) * 100;
});

// Общая высота паллеты (поддон + все ярусы)
const totalPalletHeight = computed(() => {
  const palletH = 150;
  const layers = Math.max(1, state.stackHeight);
  return palletH + layers * extHeight.value;
});

// Общий вес паллеты (кг)
const totalPalletWeight = computed(() => {
  const layers = Math.max(1, state.stackHeight);
  const countPerLayer = currentLayout.value.count;
  const cargoWeight = countPerLayer * layers * state.weight;
  const palletEmptyWeight = 15; // Вес поддона 15 кг
  return cargoWeight + palletEmptyWeight;
});

function reset() {
  state.length = 300;
  state.width = 200;
  state.height = 100;
  state.materialPreset = 'Т-24';
  state.weight = 1.5;
  state.stackHeight = 10;
  state.stackCoef1 = 4;
  state.stackCoef2 = 10;
  state.storageCondition = 'standard';
  state.length2 = 300;
  state.width2 = 200;
  state.height2 = 100;
  state.materialPreset2 = 'Т-23';
  state.palletSize = '800x1200';
  state.selectedProfile = 'B';
  state.stackingPattern = 'straight';
}

export function useBoxStrength() {
  return {
    state,
    ect_knm,
    thickness_mm,
    formFactor,
    bct_kg,
    stackLoad,
    safetyMargin,
    conditionFactor,
    formFactor2,
    bct2_kg,
    diffAbsolute,
    diffPercent,
    requiredLoad,
    requiredECT_knm,
    recommendedMaterial,
    palletWidth,
    palletDepth,
    palletHeight,
    profileThickness,
    extLength,
    extWidth,
    extHeight,
    totalPalletHeight,
    availableLayouts,
    currentLayout,
    efficiencyArea,
    totalPalletWeight,
    reset
  };
}