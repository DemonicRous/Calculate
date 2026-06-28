<template>
  <div id="app" :class="{ 'dark-mode': isDarkMode }">
    <div class="app-container">
      <header>
        <div class="logo">
          <CubeIcon class="icon logo-icon" />
          <div class="header-text">
            <h1>Калькулятор BCT</h1>
            <p>Точный расчёт прочности гофроупаковки</p>
          </div>
        </div>
        
        <button class="theme-toggle" @click="toggleTheme" title="Переключить тему">
          <SunIcon v-if="isDarkMode" class="icon" />
          <MoonIcon v-else class="icon" />
        </button>
      </header>

      <!-- Вкладки -->
      <div class="tabs-container">
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
      </div>

      <div class="tab-content">
        <transition name="fade" mode="out-in">
          <component :is="currentTabComponent" :key="state.mode" />
        </transition>
      </div>

      <footer>
        <p>© 2026 — Калькулятор BCT | Данные лабораторных испытаний</p>
      </footer>
    </div>

    <!-- Печатный отчет (Паспорт паллетизации) -->
    <div id="print-report" class="print-only">
      <div class="print-header">
        <h1>Паспорт расчета и паллетизации гофроупаковки</h1>
        <p class="print-date">Дата формирования: {{ new Date().toLocaleString() }}</p>
      </div>

      <div class="print-section">
        <h2>1. Характеристики короба и прочность</h2>
        <div class="print-row">
          <table class="print-table">
            <tr>
              <td>Длина / Ширина / Высота (внутренние):</td>
              <td><strong>{{ state.length }} × {{ state.width }} × {{ state.height }} мм</strong></td>
            </tr>
            <tr>
              <td>Марка картона / Профиль:</td>
              <td><strong>{{ state.materialPreset }} (профиль {{ state.selectedProfile }}, {{ thickness_mm }} мм)</strong></td>
            </tr>
            <tr>
              <td>ECT (сопротивление сжатию):</td>
              <td><strong>{{ ect_knm }} кН/м</strong></td>
            </tr>
            <tr>
              <td>BCT (прочность короба на сжатие):</td>
              <td><strong>{{ bct_kg.toFixed(0) }} кгс</strong></td>
            </tr>
            <tr>
              <td>Нагрузка штабеля (на нижний короб):</td>
              <td><strong>{{ stackLoad.toFixed(0) }} кгс</strong></td>
            </tr>
            <tr>
              <td>Фактический запас прочности:</td>
              <td>
                <strong :class="safetyMargin > 30 ? 'safe' : (safetyMargin > 10 ? 'warning' : 'danger')">
                  {{ safetyMargin !== null ? safetyMargin.toFixed(0) + '%' : '—' }}
                </strong>
              </td>
            </tr>
          </table>
          <div class="print-screenshot-container">
            <ThreeViewer class="print-viewer" :length="state.length" :width="state.width" :height="state.height" />
          </div>
        </div>
      </div>

      <div class="print-section">
        <h2>2. Параметры паллетизации и раскладки</h2>
        <div class="print-row">
          <table class="print-table">
            <tr>
              <td>Тип поддона (паллеты):</td>
              <td><strong>{{ state.palletSize === '800x1200' ? 'Европаллета (800 × 1200)' : 'Финпаллета (1000 × 1200)' }}</strong></td>
            </tr>
            <tr>
              <td>Схема укладки (раскладка):</td>
              <td><strong>{{ currentLayout.name }}</strong></td>
            </tr>
            <tr>
              <td>Коробок на один ярус:</td>
              <td><strong>{{ currentLayout.count }} шт.</strong></td>
            </tr>
            <tr>
              <td>Количество ярусов:</td>
              <td><strong>{{ state.stackHeight }} ярусов</strong></td>
            </tr>
            <tr>
              <td>Всего коробок на паллете:</td>
              <td><strong>{{ currentLayout.count * Math.max(1, state.stackHeight) }} шт.</strong></td>
            </tr>
            <tr>
              <td>Внешние габариты короба:</td>
              <td><strong>{{ extLength.toFixed(1) }} × {{ extWidth.toFixed(1) }} × {{ extHeight.toFixed(1) }} мм</strong></td>
            </tr>
            <tr>
              <td>Общая высота паллеты (с поддоном):</td>
              <td><strong>{{ totalPalletHeight.toFixed(0) }} мм</strong></td>
            </tr>
            <tr>
              <td>Общий вес брутто паллеты:</td>
              <td><strong>{{ totalPalletWeight.toFixed(1) }} кг</strong></td>
            </tr>
            <tr>
              <td>Эффективность площади укладки:</td>
              <td><strong>{{ efficiencyArea.toFixed(1) }}%</strong></td>
            </tr>
          </table>
          <div class="print-screenshot-container">
            <PalletizationViewer
              class="print-viewer"
              :layoutBoxes="currentLayout.boxes"
              :boxHeight="state.height"
              :layers="state.stackHeight"
              :palletWidth="palletWidth"
              :palletDepth="palletDepth"
              :palletHeight="150"
              :thickness="profileThickness"
              :totalHeight="totalPalletHeight"
            />
          </div>
        </div>
      </div>

      <div class="print-footer">
        <p>Калькулятор прочности BCT &copy; 2026. Данные получены на основе лабораторных испытаний и ГОСТ.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, provide } from 'vue';
import { useBoxStrength } from './composables/useBoxStrength';

import CalculatorTab from './components/tabs/CalculatorTab.vue';
import CompareTab from './components/tabs/CompareTab.vue';
import SelectionTab from './components/tabs/SelectionTab.vue';
import PalletizationTab from './components/tabs/PalletizationTab.vue';
import ThreeViewer from './components/ThreeViewer.vue';
import PalletizationViewer from './components/PalletizationViewer.vue';

import {
  CubeIcon,
  CalculatorIcon,
  ChartBarIcon,
  LightBulbIcon,
  TruckIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/vue/24/outline';

const {
  state,
  ect_knm,
  thickness_mm,
  bct_kg,
  stackLoad,
  safetyMargin,
  extLength,
  extWidth,
  extHeight,
  totalPalletHeight,
  currentLayout,
  efficiencyArea,
  totalPalletWeight,
  palletWidth,
  palletDepth,
  profileThickness
} = useBoxStrength();

const isDarkMode = ref(false);

const exportToPDF = () => {
  window.print();
};

provide('exportToPDF', exportToPDF);

onMounted(() => {
  const savedTheme = localStorage.getItem('bct_theme');
  if (savedTheme) {
    isDarkMode.value = savedTheme === 'dark';
  } else {
    isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  updateBodyClass();
});

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem('bct_theme', isDarkMode.value ? 'dark' : 'light');
  updateBodyClass();
};

const updateBodyClass = () => {
  if (isDarkMode.value) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
};

const tabs = [
  { key: 'calculator', label: 'Калькулятор', icon: CalculatorIcon, component: CalculatorTab },
  { key: 'compare', label: 'Сравнение', icon: ChartBarIcon, component: CompareTab },
  { key: 'selection', label: 'Подбор', icon: LightBulbIcon, component: SelectionTab },
  { key: 'palletization', label: 'Паллетизация', icon: TruckIcon, component: PalletizationTab }
];

const currentTabComponent = computed(() => {
  const activeTab = tabs.find(t => t.key === state.mode);
  return activeTab ? activeTab.component : CalculatorTab;
});
</script>

<style>
/* Мы удаляем scoped, чтобы глобальные переменные и стили карточек применялись к компонентам вкладок */
@import './style.css';
</style>