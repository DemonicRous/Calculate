<template>
  <div class="pallet-viewer-wrapper">
    <div ref="container" class="pallet-container"></div>
    <div class="controls">
      <button @click="resetCamera" class="ctrl-btn glass-btn">Сбросить вид</button>
      <label class="checkbox-label">
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
  thickness: { type: Number, default: 3 },
  totalHeight: { type: Number, default: 0 }
});

const container = ref(null);
let scene, camera, renderer, labelRenderer, controls, resizeObserver;
let mainGroup = new THREE.Group();
let labelGroup = new THREE.Group();
let autoRotate = ref(true);
let animationFrameId;

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

  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 8000);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // Включаем тени
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
  controls.autoRotateSpeed = 0.8;
  controls.target.set(0, 0, 0);
  controls.maxDistance = 4000;
  controls.minDistance = 200;

  // Освещение
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(400, 800, 500);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 3000;
  dirLight.shadow.camera.left = -800;
  dirLight.shadow.camera.right = 800;
  dirLight.shadow.camera.top = 800;
  dirLight.shadow.camera.bottom = -800;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-400, 300, -500);
  scene.add(fillLight);

  // Невидимая плоскость для приема теней
  const planeGeometry = new THREE.PlaneGeometry(5000, 5000);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.15 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -2; // Чуть ниже поддона
  plane.receiveShadow = true;
  scene.add(plane);

  mainGroup = new THREE.Group();
  labelGroup = new THREE.Group();
  scene.add(mainGroup);
  scene.add(labelGroup);

  resizeObserver = new ResizeObserver(() => {
    if (!container.value) return;
    const rect = container.value.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    if (w === 0 || h === 0) return;
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
  const totalH = props.totalHeight || (pH + layers * bH);

  const scale = 0.4;
  const sw = pW * scale;
  const sd = pD * scale;
  const sh = pH * scale;
  const boxL = bL * scale;
  const boxW = bW * scale;
  const boxH = bH * scale;

  // ---- Поддон ----
  const platformMat = new THREE.MeshStandardMaterial({
    color: 0x8B5A2B,
    roughness: 0.8,
    metalness: 0.1,
  });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), platformMat);
  platform.position.y = sh / 2;
  platform.castShadow = true;
  platform.receiveShadow = true;
  mainGroup.add(platform);

  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(sw, sh, sd));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x4A2F1A });
  const wireframe = new THREE.LineSegments(edges, lineMat);
  wireframe.position.y = sh / 2;
  mainGroup.add(wireframe);

  // ---- Метки поддона ----
  const labelStyle = {
    color: '#1e293b',
    fontFamily: 'Inter, sans-serif',
    fontSize: '13px',
    fontWeight: '700',
    background: 'rgba(255,255,255,0.9)',
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.1)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    pointerEvents: 'none',
    userSelect: 'none',
  };

  const labelL = document.createElement('div');
  labelL.textContent = `${pW} мм`;
  Object.assign(labelL.style, labelStyle);
  const labelLObj = new CSS2DObject(labelL);
  labelLObj.position.set(0, -5, sd / 2 + 25);
  labelGroup.add(labelLObj);

  const labelW = document.createElement('div');
  labelW.textContent = `${pD} мм`;
  Object.assign(labelW.style, labelStyle);
  const labelWObj = new CSS2DObject(labelW);
  labelWObj.position.set(sw / 2 + 25, -5, 0);
  labelGroup.add(labelWObj);

  const labelH = document.createElement('div');
  labelH.textContent = `${pH} мм`;
  Object.assign(labelH.style, labelStyle);
  const labelHObj = new CSS2DObject(labelH);
  labelHObj.position.set(sw / 2 + 25, sh / 2, -sd / 2 - 25);
  labelGroup.add(labelHObj);

  // ---- Метка общей высоты паллеты ----
  const totalHeightLabelStyle = {
    color: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    fontWeight: '700',
    background: '#3b82f6',
    padding: '6px 14px',
    borderRadius: '12px',
    border: '2px solid #2563eb',
    boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
    pointerEvents: 'none',
    userSelect: 'none',
  };
  const totalHeightLabel = document.createElement('div');
  totalHeightLabel.textContent = `Общая высота: ${Math.round(totalH)} мм`;
  Object.assign(totalHeightLabel.style, totalHeightLabelStyle);
  const totalHeightLabelObj = new CSS2DObject(totalHeightLabel);
  totalHeightLabelObj.position.set(sw / 2 + 80, totalH * scale / 2, 0);
  labelGroup.add(totalHeightLabelObj);

  // ---- Укладка коробок (столбцовая) ----
  const gapScale = 0.01;
  const gapL = boxL * gapScale;
  const gapW = boxW * gapScale;
  const effL = boxL + gapL;
  const effW = boxW + gapW;

  let countX = Math.floor(sw / effL);
  let countZ = Math.floor(sd / effW);
  if (countX < 1) countX = 1;
  if (countZ < 1) countZ = 1;

  const totalW = countX * boxL + (countX - 1) * gapL;
  const totalD = countZ * boxW + (countZ - 1) * gapW;
  const startX = -totalW / 2 + boxL / 2;
  const startZ = -totalD / 2 + boxW / 2;

  // ---- Статистика: общее количество коробок ----
  const totalBoxes = countX * countZ * layers;
  const statsLabelStyle = {
    color: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    fontWeight: '700',
    background: '#10b981',
    padding: '6px 14px',
    borderRadius: '12px',
    border: '2px solid #059669',
    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
    pointerEvents: 'none',
    userSelect: 'none',
  };
  const statsLabel = document.createElement('div');
  statsLabel.textContent = `Коробок на паллете: ${totalBoxes}`;
  Object.assign(statsLabel.style, statsLabelStyle);
  const statsLabelObj = new CSS2DObject(statsLabel);
  statsLabelObj.position.set(0, totalH * scale + 60, 0);
  labelGroup.add(statsLabelObj);

  // ---- Материалы коробок (картон) ----
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0xc4a482, // Цвет крафт-картона
    roughness: 0.85,
    metalness: 0.05,
  });

  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x8b6c4b,
    depthTest: true,
  });

  // ---- Создание слоёв ----
  const boxGeo = new THREE.BoxGeometry(boxL, boxH, boxW);
  const edgeGeo = new THREE.EdgesGeometry(boxGeo);
  
  const yOffset = 1;

  // Используем InstancedMesh для оптимизации (особенно если коробок много)
  // Но для простоты оставим Mesh, так как слоев обычно немного
  for (let layer = 0; layer < layers; layer++) {
    const yPos = sh + boxH / 2 + layer * boxH + yOffset;

    for (let i = 0; i < countX; i++) {
      for (let j = 0; j < countZ; j++) {
        const x = startX + i * (boxL + gapL);
        const z = startZ + j * (boxW + gapW);

        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(x, yPos, z);
        box.castShadow = true;
        box.receiveShadow = true;
        mainGroup.add(box);

        const edge = new THREE.LineSegments(edgeGeo, edgeMat);
        edge.position.set(x, yPos, z);
        mainGroup.add(edge);
      }
    }
  }

  // Центрирование сцены
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
  animationFrameId = requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
  if (labelRenderer && scene && camera) labelRenderer.render(scene, camera);
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
  controls.target.set(center.x, center.y + 50, center.z);
  controls.update();
}

watch(autoRotate, (val) => { controls.autoRotate = val; });

watch(
  () => [props.boxLength, props.boxWidth, props.boxHeight, props.layers,
          props.palletWidth, props.palletDepth, props.palletHeight,
          props.thickness, props.totalHeight],
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
  cancelAnimationFrame(animationFrameId);
  if (resizeObserver) resizeObserver.disconnect();
  if (renderer) renderer.dispose();
  if (labelRenderer && labelRenderer.domElement) labelRenderer.domElement.remove();
  if (container.value) container.value.innerHTML = '';
});
</script>

<style scoped>
.pallet-viewer-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  padding: 8px;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--text-main);
  cursor: pointer;
}
input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
</style>