<template>
  <div class="calculator-layout">
    <div class="left-panel">
      <div class="card glass-card">
        <h2><ScaleIcon class="icon" /> Размеры коробки</h2>
        <div class="input-group">
          <label>Длина (мм)</label>
          <input type="number" v-model.number="state.length" min="1" step="1" />
        </div>
        <div class="input-group">
          <label>Ширина (мм)</label>
          <input type="number" v-model.number="state.width" min="1" step="1" />
        </div>
        <div class="input-group">
          <label>Высота (мм)</label>
          <input type="number" v-model.number="state.height" min="1" step="1" />
        </div>
      </div>

      <div class="card glass-card">
        <h2><DocumentIcon class="icon" /> Материал</h2>
        <div class="input-group">
          <label>Марка картона</label>
          <select v-model="state.materialPreset">
            <option v-for="(data, name) in materialDB" :key="name" :value="name">
              {{ name }} (ECT {{ data.ect_knm }} кН/м, {{ data.thickness_mm }} мм)
            </option>
          </select>
        </div>
      </div>

      <div class="card glass-card">
        <h2><ChartBarIcon class="icon" /> Штабелирование</h2>
        <div class="input-group">
          <label>Масса брутто (кг)</label>
          <input type="number" v-model.number="state.weight" min="0.1" step="0.5" />
        </div>
        <div class="input-group">
          <label>Кол-во ярусов</label>
          <input type="number" v-model.number="state.stackHeight" min="1" step="1" />
        </div>
        <div class="input-group">
          <label>Коэф. 1</label>
          <input type="number" v-model.number="state.stackCoef1" min="0" step="0.5" />
        </div>
        <div class="input-group">
          <label>Коэф. 2</label>
          <input type="number" v-model.number="state.stackCoef2" min="0" step="0.5" />
        </div>
        <div class="input-group">
          <label>Условия хранения</label>
          <select v-model="state.storageCondition">
            <option value="dry">Сухое (×1.0)</option>
            <option value="standard">Стандартные (×1.2)</option>
            <option value="humid">Влажные (×1.5)</option>
          </select>
        </div>
      </div>

      <button class="reset-btn glass-btn" @click="reset">
        <ArrowPathIcon class="icon" /> Сбросить
      </button>
    </div>

    <div class="right-panel">
      <div class="card result-card glass-card">
        <h2><CalculatorIcon class="icon" /> Результаты</h2>
        <div class="result-item">
          <span class="label">Коэффициент формы:</span>
          <span class="value">{{ formFactor.toFixed(2) }}</span>
        </div>
        <div class="result-item highlight-box">
          <span class="label">BCT (прочность):</span>
          <span class="value highlight">{{ bct_kg.toFixed(0) }} <small>кгс</small></span>
        </div>
        <hr class="divider" />
        <h2><ExclamationTriangleIcon class="icon" /> Запас прочности</h2>
        <div class="result-item">
          <span class="label">Нагрузка на нижнюю коробку:</span>
          <span class="value">{{ stackLoad.toFixed(0) }} <small>кгс</small></span>
        </div>
        <div class="result-item" v-if="safetyMargin !== null">
          <span class="label">Запас:</span>
          <span class="value" :class="safetyMargin > 30 ? 'safe' : (safetyMargin > 10 ? 'warning' : 'danger')">
            {{ safetyMargin.toFixed(0) }}%
          </span>
        </div>
        <div v-else class="hint">Введите массу и ярусы для расчёта запаса</div>

        <div class="safety-bar" v-if="safetyMargin !== null">
          <div
            class="safety-fill"
            :style="{ width: Math.min(100, (100 - safetyMargin) * 0.8) + '%' }"
            :class="{
              'safe': safetyMargin > 30,
              'warning': safetyMargin <= 30 && safetyMargin > 10,
              'danger': safetyMargin <= 10
            }"
          ></div>
          <span class="bar-label">{{ safetyMargin.toFixed(0) }}% запаса</span>
        </div>
      </div>

      <!-- 3D Viewer -->
      <div class="card viewer-card glass-card">
        <h2><CubeIcon class="icon" /> 3D-визуализация</h2>
        <ThreeViewer :length="state.length" :width="state.width" :height="state.height" />
        <p class="hint">🖱 Вращайте мышью, меняйте размеры – модель обновится</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useBoxStrength } from '../../composables/useBoxStrength';
import { materialDB } from '../../constants/materials';
import ThreeViewer from '../ThreeViewer.vue';

import {
  ScaleIcon,
  DocumentIcon,
  ChartBarIcon,
  CalculatorIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CubeIcon
} from '@heroicons/vue/24/outline';

const { state, formFactor, bct_kg, stackLoad, safetyMargin, reset } = useBoxStrength();
</script>
