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
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { useBoxStrength } from './composables/useBoxStrength';

import CalculatorTab from './components/tabs/CalculatorTab.vue';
import CompareTab from './components/tabs/CompareTab.vue';
import SelectionTab from './components/tabs/SelectionTab.vue';
import PalletizationTab from './components/tabs/PalletizationTab.vue';

import {
  CubeIcon,
  CalculatorIcon,
  ChartBarIcon,
  LightBulbIcon,
  TruckIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/vue/24/outline';

const { state } = useBoxStrength();

const isDarkMode = ref(false);

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