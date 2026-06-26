<template>
  <div class="pallet-viewer-wrapper">
    <div ref="container" class="pallet-container"></div>
    <div class="controls">
      <button @click="resetCamera" class="ctrl-btn">Сбросить вид</button>
      <label>
        <input type="checkbox" v-model="autoRotate" /> Автовращение
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const props = defineProps({
  boxLength: { type: Number, default: 400 },
  boxWidth: { type: Number, default: 300 },
  boxHeight: { type: Number, default: 200 },
  layers: { type: Number, default: 1 },
  palletWidth: { type: Number, default: 800 },
  palletDepth: { type: Number, default: 1200 },
  palletHeight: { type: Number, default: 150 },
  pattern: { type: String, default: 'straight' },
  thickness: { type: Number, default: 3 }
});

const container = ref(null);
let scene, camera, renderer, labelRenderer, controls;
let mainGroup = new THREE.Group();
let labelGroup = new THREE.Group();
let autoRotate = ref(true);

// Внешние размеры коробки
const extLength = computed(() => props.boxLength + 2 * props.thickness);
const extWidth = computed(() => props.boxWidth + 2 * props.thickness);
const extHeight = computed(() => props.boxHeight + 2 * props.thickness);

function initScene() {
  const rect = container.value.getBoundingClientRect();
  const width = rect.width || 600;
  const height = rect.height || 450;

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 5000);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.sortObjects = true; // для правильного порядка прозрачных объектов
  container.value.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.value.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;
  controls.target.set(0, 0, 0);
  controls.maxDistance = 3000;
  controls.minDistance = 200;

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(300, 500, 400);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-300, 200, -400);
  scene.add(fillLight);

  mainGroup = new THREE.Group();
  labelGroup = new THREE.Group();
  scene.add(mainGroup);
  scene.add(labelGroup);

  const resizeObserver = new ResizeObserver(() => {
    const rect = container.value.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
  });
  resizeObserver.observe(container.value);
}

function buildPallet() {
  while (mainGroup.children.length > 0) mainGroup.remove(mainGroup.children[0]);
  while (labelGroup.children.length > 0) labelGroup.remove(labelGroup.children[0]);

  const pW = props.palletWidth;
  const pD = props.palletDepth;
  const pH = props.palletHeight;
  const bL = extLength.value;
  const bW = extWidth.value;
  const bH = extHeight.value;
  const layers = Math.max(1, props.layers);
  const pattern = props.pattern;

  // Масштаб для 3D
  const scale = 0.4;
  const sw = pW * scale;
  const sd = pD * scale;
  const sh = pH * scale;
  const boxL = bL * scale;
  const boxW = bW * scale;
  const boxH = bH * scale;

  // ---- Поддон (простой прямоугольник) ----
  const platformMat = new THREE.MeshStandardMaterial({
    color: 0x8B5A2B,
    roughness: 0.7,
    metalness: 0.1,
  });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), platformMat);
  platform.position.y = sh / 2;
  mainGroup.add(platform);

  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(sw, sh, sd));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x4A2F1A });
  const wireframe = new THREE.LineSegments(edges, lineMat);
  wireframe.position.y = sh / 2;
  mainGroup.add(wireframe);

  // ---- Метки размеров поддона ----
  const labelStyle = {
    color: '#0b1a33',
    fontFamily: 'Inter, sans-serif',
    fontSize: '13px',
    fontWeight: '600',
    background: 'rgba(255,255,255,0.85)',
    padding: '2px 10px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    pointerEvents: 'none',
    userSelect: 'none',
  };

  const labelL = document.createElement('div');
  labelL.textContent = `${pW} мм`;
  Object.assign(labelL.style, labelStyle);
  const labelLObj = new CSS2DObject(labelL);
  labelLObj.position.set(0, -5, sd / 2 + 15);
  labelGroup.add(labelLObj);

  const labelW = document.createElement('div');
  labelW.textContent = `${pD} мм`;
  Object.assign(labelW.style, labelStyle);
  const labelWObj = new CSS2DObject(labelW);
  labelWObj.position.set(sw / 2 + 15, -5, 0);
  labelGroup.add(labelWObj);

  const labelH = document.createElement('div');
  labelH.textContent = `${pH} мм`;
  Object.assign(labelH.style, labelStyle);
  const labelHObj = new CSS2DObject(labelH);
  labelHObj.position.set(sw / 2 + 15, sh / 2, -sd / 2 - 15);
  labelGroup.add(labelHObj);

  // ---- Укладка коробок ----
  // Микро-зазор для устранения мерцания (0.2% от размера)
  const gapScale = 0.002; // очень маленький зазор
  const gapL = boxL * gapScale;
  const gapW = boxW * gapScale;
  const effectiveL = boxL + gapL;
  const effectiveW = boxW + gapW;

  // Функция вычисления сетки для заданной ориентации (rot=0 или PI/2)
  function calcGrid(rot) {
    const useL = rot === 0 ? boxL : boxW;
    const useW = rot === 0 ? boxW : boxL;
    const effL = useL + gapL;
    const effW = useW + gapW;
    const countX = Math.floor(sw / effL);
    const countZ = Math.floor(sd / effW);
    const totalW = countX * useL + (countX - 1) * gapL;
    const totalD = countZ * useW + (countZ - 1) * gapW;
    const startX = -totalW / 2 + useL / 2;
    const startZ = -totalD / 2 + useW / 2;
    return { countX, countZ, startX, startZ, useL, useW };
  }

  // Для шахматной (кирпичной) – используем смещение на полкоробки
  function calcBrickGrid(rot, shiftX) {
    const useL = rot === 0 ? boxL : boxW;
    const useW = rot === 0 ? boxW : boxL;
    const effL = useL + gapL;
    const effW = useW + gapW;
    // Для нечётных рядов смещаем на половину useL (или useW?)
    const shift = shiftX ? useL / 2 : 0;
    // Количество с учётом смещения
    let countX = Math.floor((sw + shift) / effL);
    let countZ = Math.floor(sd / effW);
    if (countX < 1) countX = 1;
    if (countZ < 1) countZ = 1;
    const totalW = countX * useL + (countX - 1) * gapL;
    const totalD = countZ * useW + (countZ - 1) * gapW;
    // Смещаем старт, чтобы центрировать
    const startX = -totalW / 2 + useL / 2;
    const startZ = -totalD / 2 + useW / 2;
    return { countX, countZ, startX, startZ, useL, useW, shift };
  }

  // Выбираем схему
  let gridFunc;
  let rot = 0;
  let useBrick = false;
  let shiftX = false;

  if (pattern === 'straight') {
    gridFunc = () => calcGrid(0);
  } else if (pattern === 'rotated') {
    // Пробуем оба варианта и выбираем лучший по количеству
    const g1 = calcGrid(0);
    const g2 = calcGrid(Math.PI / 2);
    if (g1.countX * g1.countZ >= g2.countX * g2.countZ) {
      rot = 0;
      gridFunc = () => g1;
    } else {
      rot = Math.PI / 2;
      gridFunc = () => g2;
    }
  } else if (pattern === 'cross') {
    // Шахматная (кирпичная) – каждый слой смещён на полкоробки
    useBrick = true;
    // Для первого слоя – прямая
    const g1 = calcGrid(0);
    // Для второго слоя – смещение по X
    const g2 = calcBrickGrid(0, true);
    // Выбираем вариант с большим количеством, но используем brick для всех слоёв
    if (g1.countX * g1.countZ >= g2.countX * g2.countZ) {
      rot = 0;
      shiftX = false;
      gridFunc = () => calcGrid(0);
    } else {
      rot = 0;
      shiftX = true;
      gridFunc = () => calcBrickGrid(0, true);
    }
  }

  // Если pattern не распознан – прямая
  if (!gridFunc) {
    gridFunc = () => calcGrid(0);
  }

  // Материалы с polygonOffset для устранения мерцания
  const boxMat = new THREE.MeshPhongMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.20,
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x1e293b });

  // Генерируем слои
  for (let layer = 0; layer < layers; layer++) {
    const yPos = sh + boxH / 2 + layer * boxH;
    let currentRot = rot;
    let currentGrid;

    if (useBrick && layer % 2 === 1) {
      // Нечётный слой – применяем смещение
      if (shiftX) {
        const g = calcBrickGrid(currentRot, true);
        currentGrid = g;
      } else {
        // Можно также смещение по Z
        const g = calcBrickGrid(currentRot, false);
        currentGrid = g;
      }
    } else {
      currentGrid = gridFunc();
    }

    const { countX, countZ, startX, startZ, useL, useW } = currentGrid;

    for (let i = 0; i < countX; i++) {
      for (let j = 0; j < countZ; j++) {
        const x = startX + i * (useL + gapL);
        const z = startZ + j * (useW + gapW);
        const box = new THREE.Mesh(new THREE.BoxGeometry(useL, boxH, useW), boxMat);
        box.position.set(x, yPos, z);
        if (currentRot !== 0) box.rotation.y = currentRot;
        mainGroup.add(box);
        const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(useL, boxH, useW));
        const edge = new THREE.LineSegments(edgeGeo, edgeMat);
        edge.position.set(x, yPos, z);
        if (currentRot !== 0) edge.rotation.y = currentRot;
        // Небольшой сдвиг для рёбер по Y, чтобы избежать z-fighting
        edge.position.y += 0.01;
        mainGroup.add(edge);
      }
    }
  }

  // Центрируем и настраиваем камеру
  const box = new THREE.Box3().setFromObject(mainGroup);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const minY = box.min.y;
  mainGroup.position.y = -minY;
  labelGroup.position.y = -minY;

  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim * 1.8 + 200;
  camera.position.set(distance * 0.8, distance * 0.6, distance * 0.8);
  controls.target.set(center.x, center.y + 50, center.z);
  controls.update();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

function resetCamera() {
  const box = new THREE.Box3().setFromObject(mainGroup);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim * 1.8 + 200;
  camera.position.set(distance * 0.8, distance * 0.6, distance * 0.8);
  controls.target.copy(center);
  controls.update();
}

watch(autoRotate, (val) => { controls.autoRotate = val; });

watch(
  () => [props.boxLength, props.boxWidth, props.boxHeight, props.layers,
          props.palletWidth, props.palletDepth, props.palletHeight,
          props.pattern, props.thickness],
  () => { if (scene) buildPallet(); },
  { deep: true }
);

onMounted(() => {
  initScene();
  buildPallet();
  animate();
  autoRotate.value = controls.autoRotate;
});

onBeforeUnmount(() => {
  if (renderer) renderer.dispose();
  if (labelRenderer) labelRenderer.domElement.remove();
  if (container.value) container.value.innerHTML = '';
});
</script>

<style scoped>
.pallet-viewer-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pallet-container {
  width: 100%;
  height: 450px;
  border-radius: 16px;
  overflow: hidden;
  background: transparent !important;
  position: relative;
}
.controls {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 8px;
}
.ctrl-btn {
  background: #f1f5f9;
  border: none;
  padding: 4px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: #1e293b;
  transition: 0.15s;
}
.ctrl-btn:hover {
  background: #e2e8f0;
}
.controls label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  font-size: 0.9rem;
  color: #334155;
  cursor: pointer;
}
</style>