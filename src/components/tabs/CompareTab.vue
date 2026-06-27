<template>
  <div class="compare-wrapper">
    <div class="compare-grid">
      <div class="card box glass-card">
        <h3><ArchiveBoxIcon class="icon" /> Короб 1</h3>
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
        <div class="input-group">
          <label>Марка</label>
          <select v-model="state.materialPreset">
            <option v-for="(data, name) in materialDB" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>
        <div class="result-item">
          <span class="label">BCT:</span>
          <span class="value highlight">{{ bct_kg.toFixed(0) }} кгс</span>
        </div>
      </div>

      <div class="vs">⚔️</div>

      <div class="card box glass-card">
        <h3><ArchiveBoxIcon class="icon" /> Короб 2</h3>
        <div class="input-group">
          <label>Длина (мм)</label>
          <input type="number" v-model.number="state.length2" min="1" step="1" />
        </div>
        <div class="input-group">
          <label>Ширина (мм)</label>
          <input type="number" v-model.number="state.width2" min="1" step="1" />
        </div>
        <div class="input-group">
          <label>Высота (мм)</label>
          <input type="number" v-model.number="state.height2" min="1" step="1" />
        </div>
        <div class="input-group">
          <label>Марка</label>
          <select v-model="state.materialPreset2">
            <option v-for="(data, name) in materialDB" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>
        <div class="result-item">
          <span class="label">BCT:</span>
          <span class="value highlight">{{ bct2_kg.toFixed(0) }} кгс</span>
        </div>
      </div>
    </div>

    <div class="compare-result card glass-card" v-if="diffPercent !== null">
      <h3><ChartBarIcon class="icon" /> Сравнение</h3>
      <div class="result-item">
        <span class="label">Разница абсолютная:</span>
        <span class="value" :class="diffAbsolute > 0 ? 'positive' : 'negative'">
          {{ diffAbsolute > 0 ? '+' : '' }}{{ diffAbsolute.toFixed(0) }} кгс
        </span>
      </div>
      <div class="result-item">
        <span class="label">Разница относительная:</span>
        <span class="value" :class="diffPercent > 0 ? 'positive' : 'negative'">
          {{ diffPercent > 0 ? '+' : '' }}{{ diffPercent.toFixed(1) }}%
        </span>
      </div>
      <div class="hint" v-if="Math.abs(diffPercent) < 5">➖ Почти одинаковые</div>
      <div class="hint" v-else-if="diffPercent > 0">📈 Короб 2 прочнее</div>
      <div class="hint" v-else>📉 Короб 1 прочнее</div>
    </div>
  </div>
</template>

<script setup>
import { useBoxStrength } from '../../composables/useBoxStrength';
import { materialDB } from '../../constants/materials';

import {
  ArchiveBoxIcon,
  ChartBarIcon
} from '@heroicons/vue/24/outline';

const { state, bct_kg, bct2_kg, diffAbsolute, diffPercent } = useBoxStrength();
</script>
