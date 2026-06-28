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

      <!-- Схемы раскладки Cape Pack -->
      <div class="input-group">
        <label>Схема укладки (Cape Pack)</label>
        <div class="layout-options">
          <button
            v-for="(layout, key) in availableLayouts"
            :key="key"
            :class="['layout-btn', { active: state.stackingPattern === key }]"
            @click="state.stackingPattern = key"
            :disabled="layout.count === 0"
          >
            <span class="layout-name">{{ layout.name }}</span>
            <span class="layout-count">{{ layout.count }} шт/слой</span>
            <span class="layout-eff" v-if="layout.count > 0">
              {{ ((layout.count * extLength * extWidth) / (palletWidth * palletDepth) * 100).toFixed(0) }}% площади
            </span>
          </button>
        </div>
      </div>

      <!-- Метрики эффективности -->
      <div class="info-box efficiency-box">
        <p><strong>Внешние размеры коробки:</strong></p>
        <p>{{ extLength.toFixed(1) }} × {{ extWidth.toFixed(1) }} × {{ extHeight.toFixed(1) }} мм</p>
        <p><strong>Использование площади:</strong> <span class="highlight-val">{{ efficiencyArea.toFixed(1) }}%</span></p>
        <p><strong>Общая высота паллеты:</strong> {{ totalPalletHeight.toFixed(0) }} мм</p>
        <p><strong>Коробок на паллете:</strong> <span class="highlight-val">{{ currentLayout.count * Math.max(1, state.stackHeight) }} шт.</span></p>
        <p><strong>Общий вес (брутто):</strong> <span class="highlight-val">{{ totalPalletWeight.toFixed(1) }} кг</span></p>
      </div>

      <button class="glass-btn print-btn" @click="exportToPDF" style="width: 100%; margin-top: 16px;">
        <DocumentArrowDownIcon class="icon" /> Экспорт паспорта (PDF)
      </button>
    </div>

    <div class="card viewer-card glass-card">
      <h2><CubeIcon class="icon" /> 3D-визуализация паллетизации</h2>
      <PalletizationViewer
        :layoutBoxes="currentLayout.boxes"
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
import { inject } from 'vue';
import { useBoxStrength, profileOptions } from '../../composables/useBoxStrength';
import PalletizationViewer from '../PalletizationViewer.vue';

import {
  ArchiveBoxIcon,
  CubeIcon,
  DocumentArrowDownIcon
} from '@heroicons/vue/24/outline';

const {
  state,
  palletWidth,
  palletDepth,
  profileThickness,
  extLength,
  extWidth,
  extHeight,
  totalPalletHeight,
  availableLayouts,
  currentLayout,
  efficiencyArea,
  totalPalletWeight
} = useBoxStrength();

const exportToPDF = inject('exportToPDF');
</script>

<style scoped>
.layout-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-top: 8px;
}

.layout-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.layout-btn:hover:not(:disabled) {
  border-color: var(--primary);
  background-color: var(--tab-hover);
  transform: translateY(-1px);
}

.layout-btn.active {
  border-color: var(--primary);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.03) 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.layout-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.layout-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.layout-count {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.layout-eff {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
  margin-top: 4px;
}

.efficiency-box {
  border-left-color: var(--success-color);
}

.highlight-val {
  font-weight: 700;
  color: var(--primary);
}

@media (min-width: 480px) and (max-width: 992px) {
  .layout-options {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
