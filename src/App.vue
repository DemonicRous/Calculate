<template>
  <div id="app">
    <header>
      <div class="logo">
        <CubeIcon class="icon" />
        <h1>Калькулятор BCT</h1>
      </div>
      <p>Точный расчёт прочности гофроупаковки по табличным данным</p>
    </header>

    <!-- Вкладки -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: state.mode === tab.key }]"
        @click="state.mode = tab.key"
      >
        <component :is="tab.icon" class="tab-icon" />
        {{ tab.label }}
      </button>
    </div>

    <div class="tab-content">
      <!-- Вкладка 1: Калькулятор -->
      <div v-if="state.mode === 'calculator'" class="calculator-layout">
        <div class="left-panel">
          <div class="card">
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

          <div class="card">
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

          <div class="card">
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

          <button class="reset-btn" @click="reset">
            <ArrowPathIcon class="icon" /> Сбросить
          </button>
        </div>

        <div class="right-panel">
          <div class="card result-card">
            <h2><CalculatorIcon class="icon" /> Результаты</h2>
            <div class="result-item">
              <span class="label">Коэффициент формы:</span>
              <span class="value">{{ formFactor.toFixed(2) }}</span>
            </div>
            <div class="result-item highlight-box">
              <span class="label">BCT (прочность):</span>
              <span class="value highlight">{{ bct_kg.toFixed(0) }} <small>кгс</small></span>
            </div>
            <hr />
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

          <!-- 3D Viewer – только коробка -->
          <div class="card viewer-card">
            <h2><CubeIcon class="icon" /> 3D-визуализация</h2>
            <ThreeViewer :length="state.length" :width="state.width" :height="state.height" />
            <p class="hint">🖱 Вращайте мышью, меняйте размеры – модель обновится</p>
          </div>
        </div>
      </div>

      <!-- Вкладка 2: Сравнение -->
      <div v-if="state.mode === 'compare'">
        <div class="compare-grid">
          <div class="card box">
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
              <span class="value">{{ bct_kg.toFixed(0) }} кгс</span>
            </div>
          </div>

          <div class="vs">⚔️</div>

          <div class="card box">
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
              <span class="value">{{ bct2_kg.toFixed(0) }} кгс</span>
            </div>
          </div>
        </div>

        <div class="compare-result card" v-if="diffPercent !== null">
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

      <!-- Вкладка 3: Подбор материала -->
      <div v-if="state.mode === 'selection'">
        <div class="main-grid">
          <div class="card">
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

          <div class="card result-card">
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
              <span class="label" style="color: #dc2626;">Нет подходящей марки в справочнике</span>
            </div>
            <div class="info-box">
              <p><small>Подбор выполнен по таблице BCT для заданных размеров. Выбирается марка с наименьшим ECT, обеспечивающая требуемую нагрузку.</small></p>
            </div>
          </div>
        </div>
      </div>

      <!-- Вкладка 4: Паллетизация -->
      <div v-if="state.mode === 'palletization'">
        <div class="main-grid">
          <div class="card">
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

          <div class="card viewer-card">
            <h2><CubeIcon class="icon" /> 3D-визуализация паллетизации</h2>
            <!-- Вкладка 4: Паллетизация -->
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
      </div>
    </div>

    <footer>
      <p>© 2026 — Калькулятор BCT | Данные лабораторных испытаний</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useBoxStrength, profileOptions } from './composables/useBoxStrength';
import { materialDB } from './constants/materials';
import ThreeViewer from './components/ThreeViewer.vue';
import PalletizationViewer from './components/PalletizationViewer.vue';

import {
  CubeIcon,
  ScaleIcon,
  DocumentIcon,
  ChartBarIcon,
  CalculatorIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  ClipboardIcon,
  LightBulbIcon,
  ArrowPathIcon,
  TruckIcon
} from '@heroicons/vue/24/outline';

const { state, formFactor, bct_kg, stackLoad, safetyMargin,
        formFactor2, bct2_kg, diffAbsolute, diffPercent,
        requiredLoad, requiredECT_knm, recommendedMaterial,
        palletWidth, palletDepth, palletHeight,
        profileThickness, extLength, extWidth, extHeight, totalPalletHeight,
        reset } = useBoxStrength();

const tabs = [
  { key: 'calculator', label: 'Калькулятор', icon: CalculatorIcon },
  { key: 'compare', label: 'Сравнение', icon: ChartBarIcon },
  { key: 'selection', label: 'Подбор материала', icon: LightBulbIcon },
  { key: 'palletization', label: 'Паллетизация', icon: TruckIcon }
];
</script>

<style scoped>
/* ---- Глобальные стили (современный дизайн) ---- */
* {
  box-sizing: border-box;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
body {
  background: #f1f5f9;
}
#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
  background: white;
  border-radius: 32px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.06);
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding-bottom: 20px;
  border-bottom: 2px solid #eef2f6;
  margin-bottom: 28px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #0b1a33;
  margin: 0;
  letter-spacing: -0.02em;
}
header p {
  color: #64748b;
  font-size: 1rem;
  margin: 0;
}

.icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: #3b82f6;
}

/* ---- Вкладки ---- */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 28px;
  flex-wrap: wrap;
  background: #f8fafc;
  padding: 6px;
  border-radius: 40px;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border: none;
  border-radius: 30px;
  background: transparent;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
  font-size: 0.95rem;
  color: #475569;
}
.tab-btn.active {
  background: white;
  color: #1e293b;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.tab-btn:hover:not(.active) {
  background: rgba(255,255,255,0.5);
}
.tab-icon {
  width: 20px;
  height: 20px;
}

/* ---- Карточки ---- */
.card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  border: 1px solid #eef2f6;
  transition: 0.2s;
  margin-bottom: 20px;
}
.card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
}

h2, h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #0b1a33;
  margin: 0 0 16px 0;
  border-bottom: 2px solid #eef2f6;
  padding-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
h3 {
  font-size: 1rem;
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 12px;
}

/* ---- Ввод ---- */
.input-group {
  margin-bottom: 14px;
}
.input-group label {
  display: block;
  font-weight: 500;
  font-size: 0.85rem;
  margin-bottom: 4px;
  color: #334155;
}
.input-group input, .input-group select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.95rem;
  background: white;
  transition: 0.15s;
}
.input-group input:focus, .input-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}

/* ---- Результаты ---- */
.result-item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}
.result-item:last-child {
  border-bottom: none;
}
.result-item .label {
  flex: 1 1 160px;
  font-weight: 500;
  color: #475569;
}
.result-item .value {
  font-weight: 700;
  font-size: 1.2rem;
}
.value.highlight {
  color: #2563eb;
  font-size: 1.6rem;
}
.value.safe { color: #16a34a; }
.value.warning { color: #eab308; }
.value.danger { color: #dc2626; }
.positive { color: #16a34a; }
.negative { color: #dc2626; }
.value small {
  font-weight: 400;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-left: 4px;
}

.highlight-box {
  background: #f0f7ff;
  border-radius: 12px;
  padding: 8px 12px;
  margin: 6px -8px;
}

.hint {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 6px;
}

.reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  background: #f1f5f9;
  border: none;
  padding: 10px 20px;
  border-radius: 30px;
  cursor: pointer;
  color: #1e293b;
  font-weight: 600;
  transition: 0.15s;
}
.reset-btn:hover {
  background: #e2e8f0;
}

/* ---- Индикатор запаса ---- */
.safety-bar {
  margin-top: 16px;
  background: #e2e8f0;
  height: 30px;
  border-radius: 15px;
  overflow: hidden;
  position: relative;
}
.safety-fill {
  height: 100%;
  border-radius: 15px;
  transition: width 0.4s;
}
.safety-fill.safe { background: linear-gradient(90deg, #22c55e, #16a34a); }
.safety-fill.warning { background: linear-gradient(90deg, #eab308, #ca8a04); }
.safety-fill.danger { background: linear-gradient(90deg, #ef4444, #dc2626); }
.bar-label {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 30px;
  color: white;
  text-shadow: 0 1px 4px rgba(0,0,0,0.2);
}

.info-box {
  margin-top: 20px;
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border-left: 4px solid #94a3b8;
  font-size: 0.9rem;
  color: #475569;
}

/* ---- Layouts ---- */
.calculator-layout {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 28px;
}
@media (max-width: 900px) {
  .calculator-layout {
    grid-template-columns: 1fr;
  }
}

.left-panel, .right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.compare-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 28px;
  align-items: start;
}
.vs {
  font-size: 2.8rem;
  font-weight: 300;
  color: #cbd5e1;
  padding-top: 20px;
  text-align: center;
}
@media (max-width: 768px) {
  .compare-grid {
    grid-template-columns: 1fr;
  }
  .vs {
    display: none;
  }
}

.compare-result {
  margin-top: 24px;
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 28px;
}
@media (max-width: 768px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

.viewer-card {
  padding-bottom: 16px;
}

footer {
  margin-top: 40px;
  text-align: center;
  font-size: 0.8rem;
  color: #94a3b8;
  border-top: 1px solid #eef2f6;
  padding-top: 20px;
}
</style>