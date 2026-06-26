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
let scene, camera, renderer, labelRenderer, controls;
let boxGroup = new THREE.Group();
let labelGroup = new THREE.Group();

function initScene() {
  const rect = container.value.getBoundingClientRect();
  const width = rect.width || 400;
  const height = rect.height || 350;

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 5000);
  camera.position.set(600, 400, 600);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(200, 400, 300);
  scene.add(dirLight);
  const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
  backLight.position.set(-200, 100, -300);
  scene.add(backLight);

  boxGroup = new THREE.Group();
  labelGroup = new THREE.Group();
  scene.add(boxGroup);
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

function createBox(length, width, height) {
  while (boxGroup.children.length > 0) boxGroup.remove(boxGroup.children[0]);
  while (labelGroup.children.length > 0) labelGroup.remove(labelGroup.children[0]);

  const scale = 0.5;
  const l = length * scale;
  const w = width * scale;
  const h = height * scale;

  const geometry = new THREE.BoxGeometry(l, h, w);
  const material = new THREE.MeshPhongMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  const cube = new THREE.Mesh(geometry, material);
  boxGroup.add(cube);

  const edges = new THREE.EdgesGeometry(geometry);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
  const wireframe = new THREE.LineSegments(edges, lineMat);
  boxGroup.add(wireframe);

  const labelStyle = {
    color: '#0b1a33',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    fontWeight: '600',
    background: 'rgba(255,255,255,0.85)',
    padding: '2px 8px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    pointerEvents: 'none',
    userSelect: 'none',
  };

  const labelL = document.createElement('div');
  labelL.textContent = `${length} мм`;
  Object.assign(labelL.style, labelStyle);
  const labelLObj = new CSS2DObject(labelL);
  labelLObj.position.set(0, -h/2 - 15, w/2 + 10);
  labelGroup.add(labelLObj);

  const labelW = document.createElement('div');
  labelW.textContent = `${width} мм`;
  Object.assign(labelW.style, labelStyle);
  const labelWObj = new CSS2DObject(labelW);
  labelWObj.position.set(l/2 + 10, -h/2 - 15, 0);
  labelGroup.add(labelWObj);

  const labelH = document.createElement('div');
  labelH.textContent = `${height} мм`;
  Object.assign(labelH.style, labelStyle);
  const labelHObj = new CSS2DObject(labelH);
  labelHObj.position.set(l/2 + 10, 0, -w/2 - 10);
  labelGroup.add(labelHObj);

  boxGroup.position.y = 0;
  labelGroup.position.y = 0;
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
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
  if (renderer) renderer.dispose();
  if (labelRenderer) labelRenderer.domElement.remove();
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