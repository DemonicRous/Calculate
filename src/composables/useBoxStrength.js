import { reactive, computed } from 'vue';
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

export function useBoxStrength() {
  const state = reactive({
    mode: 'calculator',
    // Основной режим
    length: 400,
    width: 300,
    height: 200,
    materialPreset: 'Т-24',
    // Для нагрузки
    weight: 15,
    stackHeight: 6,
    stackCoef1: 4,
    stackCoef2: 10,
    storageCondition: 'standard',
    // Для сравнения
    length2: 470,
    width2: 185,
    height2: 240,
    materialPreset2: 'Т-23',
    // Для паллетизации
    palletSize: '800x1200',
    selectedProfile: 'B',        // выбранный профиль
    stackingPattern: 'straight', // 'straight' | 'rotated' | 'cross'
  });

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

  // Общая высота паллеты (поддон + все ярусы)
  const totalPalletHeight = computed(() => {
    const palletH = 150;
    const layers = Math.max(1, state.stackHeight);
    return palletH + layers * extHeight.value;
  });

  function reset() {
    state.length = 400;
    state.width = 300;
    state.height = 200;
    state.materialPreset = 'Т-24';
    state.weight = 15;
    state.stackHeight = 6;
    state.stackCoef1 = 4;
    state.stackCoef2 = 10;
    state.storageCondition = 'standard';
    state.length2 = 470;
    state.width2 = 185;
    state.height2 = 240;
    state.materialPreset2 = 'Т-23';
    state.palletSize = '800x1200';
    state.selectedProfile = 'B';
    state.stackingPattern = 'straight';
  }

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
    reset
  };
}