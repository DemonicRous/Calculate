<template>
  <div class="main-grid">
    <div class="card glass-card">
      <h2><ArchiveBoxIcon class="icon" /> Параметры паллетизации</h2>
      <div class="input-group">
        <label>Размер поддона</label>
        <select v-model="state.palletSize">
          <option value="800x1200">800 × 1200 мм</option>
          <option value="1000x1200">1000 × 1200 мм</option>
        </select>
      </div>
      <div class="input-group">
        <label>Профиль гофрокартона</label>
        <select v-model="state.selectedProfile">
          <option v-for="(thick, profile) in profileOptions" :key="profile" :value="profile">
            {{ profile }} ({{ thick }} мм)
          </option>
        </select>
      </div>
      <div class="input-group">
        <label>Количество ярусов</label>
        <input type="number" v-model.number="state.stackHeight" min="1" step="1" />
      </div>
      <div class="info-box">
        <p><strong>Внешние размеры коробки:</strong></p>
        <p>Длина: {{ extLength.toFixed(1) }} мм, Ширина: {{ extWidth.toFixed(1) }} мм, Высота: {{ extHeight.toFixed(1) }} мм</p>
        <p><strong>Общая высота паллеты:</strong> {{ totalPalletHeight.toFixed(1) }} мм (поддон 150 мм + {{ state.stackHeight }} ярусов)</p>
      </div>
    </div>

    <div class="card viewer-card glass-card">
      <h2><CubeIcon class="icon" /> 3D-визуализация паллетизации</h2>
      <PalletizationViewer
        :boxLength="state.length"
        :boxWidth="state.width"
        :boxHeight="state.height"
        :layers="state.stackHeight"
        :palletWidth="palletWidth"
        :palletDepth="palletDepth"
        :palletHeight="150"
        :thickness="profileThickness"
        :totalHeight="totalPalletHeight"
      />
      <p class="hint">🖱 Вращайте мышью, меняйте параметры – модель обновится</p>
    </div>
  </div>
</template>

<script setup>
import { useBoxStrength, profileOptions } from '../../composables/useBoxStrength';
import PalletizationViewer from '../PalletizationViewer.vue';

import {
  ArchiveBoxIcon,
  CubeIcon
} from '@heroicons/vue/24/outline';

const {
  state,
  palletWidth,
  palletDepth,
  profileThickness,
  extLength,
  extWidth,
  extHeight,
  totalPalletHeight
} = useBoxStrength();
</script>
