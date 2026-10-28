<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStockStore } from '../stores/stock';
import { searchStocks } from '../services/market';
import type { StockItem } from '../types/stock';
import { Search, RefreshCw, Plus, Check, Activity, Clock } from '@lucide/vue';

const stockStore = useStockStore();

// Search state
const searchQuery = ref('');
const searchResults = ref<StockItem[]>([]);
const isSearching = ref(false);
const showDropdown = ref(false);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  const q = searchQuery.value.trim();
  if (!q) {
    searchResults.value = [];
    showDropdown.value = false;
    return;
  }
  isSearching.value = true;
  searchDebounceTimer = setTimeout(async () => {
    try {
      searchResults.value = await searchStocks(q);
      showDropdown.value = searchResults.value.length > 0;
    } finally {
      isSearching.value = false;
    }
  }, 300);
}

function handleSelectStock(item: StockItem) {
  stockStore.addStock(item);
  searchQuery.value = '';
  showDropdown.value = false;
}

function isStockInWatchlist(stock: StockItem) {
  return stockStore.watchlist.some((s) => s.code === stock.code && s.market === stock.market);
}

// Market trading status
const currentTime = ref(new Date());
let timeTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timeTimer = setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

onUnmounted(() => {
  if (timeTimer) clearInterval(timeTimer);
});

const marketStatus = computed(() => {
  const d = currentTime.value;
  const day = d.getDay(); // 0 is Sunday, 6 is Saturday
  if (day === 0 || day === 6) {
    return { text: '休市中 (周末)', color: 'text-slate-400 bg-slate-800/80 border-slate-700' };
  }
  const h = d.getHours();
  const m = d.getMinutes();
  const totalMin = h * 60 + m;

  if (totalMin >= 9 * 60 + 15 && totalMin < 9 * 60 + 30) {
    return { text: '集合竞价 (09:15-09:30)', color: 'text-amber-400 bg-amber-950/60 border-amber-800' };
  }
  if (totalMin >= 9 * 60 + 30 && totalMin <= 11 * 60 + 30) {
    return { text: '早盘交易中 (09:30-11:30)', color: 'text-red-400 bg-red-950/60 border-red-800 animate-pulse' };
  }
  if (totalMin > 11 * 60 + 30 && totalMin < 13 * 60) {
    return { text: '午间休市 (11:30-13:00)', color: 'text-slate-400 bg-slate-800/80 border-slate-700' };
  }
  if (totalMin >= 13 * 60 && totalMin <= 15 * 60) {
    return { text: '午盘交易中 (13:00-15:00)', color: 'text-red-400 bg-red-950/60 border-red-800 animate-pulse' };
  }
  return { text: '已收盘 (15:00)', color: 'text-slate-400 bg-slate-800/80 border-slate-700' };
});
</script>

<template>
  <header class="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between gap-4 select-none shrink-0 z-30">
    <!-- Brand / Title -->
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/20">
        <Activity class="w-5 h-5" />
      </div>
      <div>
        <h1 class="text-base font-semibold text-white tracking-wide flex items-center gap-2">
          A股行情查看器
          <span class="text-xs px-2 py-0.5 rounded-full font-normal border" :class="marketStatus.color">
            {{ marketStatus.text }}
          </span>
        </h1>
      </div>
    </div>

    <!-- Search Bar with dropdown -->
    <div class="relative w-80 max-w-full">
      <div class="relative">
        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          @input="onSearchInput"
          @focus="onSearchInput"
          type="text"
          placeholder="搜索股票代码 / 名称 / 拼音..."
          class="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/40 transition placeholder:text-slate-500"
        />
      </div>

      <!-- Dropdown Results -->
      <div
        v-if="showDropdown && searchResults.length > 0"
        class="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden max-h-80 overflow-y-auto z-50 divide-y divide-slate-800"
      >
        <div
          v-for="item in searchResults"
          :key="item.code + item.market"
          @click="handleSelectStock(item)"
          class="px-3 py-2 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition group"
        >
          <div class="flex items-center gap-2">
            <span class="text-xs px-1.5 py-0.5 rounded font-mono font-medium text-slate-300 bg-slate-800 border border-slate-700">
              {{ item.market }}
            </span>
            <span class="text-sm font-medium text-slate-200 group-hover:text-red-400 transition">
              {{ item.name }}
            </span>
            <span class="text-xs font-mono text-slate-400">
              {{ item.code }}
            </span>
          </div>

          <button
            class="text-xs px-2 py-1 rounded flex items-center gap-1 transition"
            :class="isStockInWatchlist(item) ? 'text-slate-500 hover:text-slate-400' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'"
          >
            <component :is="isStockInWatchlist(item) ? Check : Plus" class="w-3.5 h-3.5" />
            <span>{{ isStockInWatchlist(item) ? '已自选' : '加自选' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-3">
      <!-- Auto Refresh Switch -->
      <button
        @click="stockStore.toggleAutoRefresh()"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition"
        :class="stockStore.autoRefresh 
          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/50' 
          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'"
      >
        <span class="w-2 h-2 rounded-full" :class="stockStore.autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'"></span>
        <span>实时刷新 (3s)</span>
      </button>

      <!-- Manual Refresh Button -->
      <button
        @click="stockStore.fetchQuotes()"
        class="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:bg-slate-700 hover:text-white transition"
        :title="'立即刷新行情'"
      >
        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': stockStore.isRefreshing }" />
      </button>
    </div>
  </header>
</template>
