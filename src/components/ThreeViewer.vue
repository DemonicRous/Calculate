<template>
  <div ref="container" class="three-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

const props = defineProps({
  length: { type: Number, default: 400 },
  width: { type: Number, default: 300 },
  height: { type: Number, default: 200 }
});

const container = ref(null);
let scene, camera, renderer, labelRenderer, controls, resizeObserver;
let boxGroup = new THREE.Group();
let labelGroup = new THREE.Group();
let animationFrameId;

function initScene() {
  const rect = container.value.getBoundingClientRect();
  const width = rect.width || 400;
  const height = rect.height || 350;

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 5000);
  camera.position.set(600, 400, 600);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
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
  controls.autoRotateSpeed = 1.2;
  controls.target.set(0, 0, 0);
  controls.maxDistance = 2000;
  controls.minDistance = 100;

  // Освещение для реалистичности
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(300, 500, 400);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 1500;
  dirLight.shadow.camera.left = -500;
  dirLight.shadow.camera.right = 500;
  dirLight.shadow.camera.top = 500;
  dirLight.shadow.camera.bottom = -500;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);
  
  const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
  backLight.position.set(-300, 200, -300);
  scene.add(backLight);

  // Невидимая плоскость для приема теней
  const planeGeometry = new THREE.PlaneGeometry(3000, 3000);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.15 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = - (props.height * 0.5 * 0.5) - 2; // Чуть ниже коробки
  plane.receiveShadow = true;
  scene.add(plane);

  boxGroup = new THREE.Group();
  labelGroup = new THREE.Group();
  scene.add(boxGroup);
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

function createBox(length, width, height) {
  while (boxGroup.children.length > 0) boxGroup.remove(boxGroup.children[0]);
  while (labelGroup.children.length > 0) labelGroup.remove(labelGroup.children[0]);

  const scale = 0.5;
  const l = length * scale;
  const w = width * scale;
  const h = height * scale;

  const geometry = new THREE.BoxGeometry(l, h, w);
  
  // Реалистичный материал картона
  const material = new THREE.MeshStandardMaterial({
    color: 0xc4a482, // Цвет крафт-картона
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  
  const cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  cube.receiveShadow = true;
  boxGroup.add(cube);

  const edges = new THREE.EdgesGeometry(geometry);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x8b6c4b, linewidth: 2 });
  const wireframe = new THREE.LineSegments(edges, lineMat);
  boxGroup.add(wireframe);

  const labelStyle = {
    color: '#1e293b',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '13px',
    fontWeight: '700',
    background: 'rgba(255,255,255,0.9)',
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.1)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    pointerEvents: 'none',
    userSelect: 'none',
  };

  const labelL = document.createElement('div');
  labelL.textContent = `${length} мм`;
  Object.assign(labelL.style, labelStyle);
  const labelLObj = new CSS2DObject(labelL);
  labelLObj.position.set(0, -h/2 - 20, w/2 + 20);
  labelGroup.add(labelLObj);

  const labelW = document.createElement('div');
  labelW.textContent = `${width} мм`;
  Object.assign(labelW.style, labelStyle);
  const labelWObj = new CSS2DObject(labelW);
  labelWObj.position.set(l/2 + 20, -h/2 - 20, 0);
  labelGroup.add(labelWObj);

  const labelH = document.createElement('div');
  labelH.textContent = `${height} мм`;
  Object.assign(labelH.style, labelStyle);
  const labelHObj = new CSS2DObject(labelH);
  labelHObj.position.set(l/2 + 20, 0, -w/2 - 20);
  labelGroup.add(labelHObj);

  boxGroup.position.y = 0;
  labelGroup.position.y = 0;
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
  if (labelRenderer && scene && camera) labelRenderer.render(scene, camera);
}

watch(() => [props.length, props.width, props.height], () => {
  if (scene) createBox(props.length, props.width, props.height);
});

onMounted(() => {
  initScene();
  createBox(props.length, props.width, props.height);
  animate();
  controls.addEventListener('start', () => { controls.autoRotate = false; });
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
.three-container {
  width: 100%;
  height: 400px;
  border-radius: 16px;
  overflow: hidden;
  background: transparent !important;
  position: relative;
}
</style>