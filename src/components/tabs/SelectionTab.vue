<template>
  <div class="main-grid">
    <div class="card glass-card">
      <h2><ClipboardIcon class="icon" /> Условия штабелирования</h2>
      <div class="input-group">
        <label>Длина коробки (мм)</label>
        <input type="number" v-model.number="state.length" min="1" step="1" />
      </div>
      <div class="input-group">
        <label>Ширина коробки (мм)</label>
        <input type="number" v-model.number="state.width" min="1" step="1" />
      </div>
      <div class="input-group">
        <label>Высота коробки (мм)</label>
        <input type="number" v-model.number="state.height" min="1" step="1" />
      </div>
      <div class="input-group">
        <label>Вес брутто (кг)</label>
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

    <div class="card result-card glass-card">
      <h2><LightBulbIcon class="icon" /> Рекомендация</h2>
      <div class="result-item">
        <span class="label">Требуемая нагрузка:</span>
        <span class="value">{{ requiredLoad !== null ? requiredLoad.toFixed(0) : '—' }} кгс</span>
      </div>
      <div class="result-item" v-if="recommendedMaterial">
        <span class="label">Рекомендуемая марка:</span>
        <span class="value highlight">{{ recommendedMaterial }}</span>
        <span class="hint">
          (ECT {{ materialDB[recommendedMaterial].ect_knm }} кН/м,
          толщина {{ materialDB[recommendedMaterial].thickness_mm }} мм)
        </span>
      </div>
      <div v-else-if="requiredLoad > 0" class="result-item">
        <span class="label" style="color: var(--danger-color);">Нет подходящей марки в справочнике</span>
      </div>
      <div class="info-box">
        <p><small>Подбор выполнен по таблице BCT для заданных размеров. Выбирается марка с наименьшим ECT, обеспечивающая требуемую нагрузку.</small></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useBoxStrength } from '../../composables/useBoxStrength';
import { materialDB } from '../../constants/materials';

import {
  ClipboardIcon,
  LightBulbIcon
} from '@heroicons/vue/24/outline';

const { state, requiredLoad, recommendedMaterial } = useBoxStrength();
</script>
