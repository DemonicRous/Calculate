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
  thickness: { type: Number, default: 3 },
  totalHeight: { type: Number, default: 0 }
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
  renderer.sortObjects = true;
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

  // ---- Метки поддона ----
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

  // ---- Метка общей высоты паллеты ----
  const totalHeightLabelStyle = {
    color: '#0b1a33',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    fontWeight: '700',
    background: 'rgba(255,255,255,0.9)',
    padding: '4px 12px',
    borderRadius: '12px',
    border: '2px solid #3b82f6',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
    color: '#0b1a33',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    fontWeight: '700',
    background: 'rgba(255,255,255,0.9)',
    padding: '4px 12px',
    borderRadius: '12px',
    border: '2px solid #10b981',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    pointerEvents: 'none',
    userSelect: 'none',
  };
  const statsLabel = document.createElement('div');
  statsLabel.textContent = `Коробок на паллете: ${totalBoxes}`;
  Object.assign(statsLabel.style, statsLabelStyle);
  const statsLabelObj = new CSS2DObject(statsLabel);
  statsLabelObj.position.set(0, totalH * scale + 50, 0);
  labelGroup.add(statsLabelObj);

  // ---- Материалы для граней коробки ----
  const colors = [
    0xff6666, // +x (длина)
    0xff6666, // -x
    0x66ff66, // +y (высота)
    0x66ff66, // -y
    0x6666ff, // +z (ширина)
    0x6666ff  // -z
  ];
  const materials = colors.map(c => new THREE.MeshPhongMaterial({
    color: c,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
  }));

  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x1e293b,
    depthTest: true,
  });

  // ---- Создание слоёв с увеличенным отступом от поддона ----
  const yOffset = 2; // увеличенный отступ для устранения мерцания (в масштабе)

  for (let layer = 0; layer < layers; layer++) {
    const yPos = sh + boxH / 2 + layer * boxH + yOffset;

    for (let i = 0; i < countX; i++) {
      for (let j = 0; j < countZ; j++) {
        const x = startX + i * (boxL + gapL);
        const z = startZ + j * (boxW + gapW);

        const geometry = new THREE.BoxGeometry(boxL, boxH, boxW);
        const box = new THREE.Mesh(geometry, materials);
        box.position.set(x, yPos, z);
        box.renderOrder = 0;
        mainGroup.add(box);

        const edgeGeo = new THREE.EdgesGeometry(geometry);
        const edge = new THREE.LineSegments(edgeGeo, edgeMat);
        edge.position.set(x, yPos, z);
        edge.renderOrder = 1;
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