<script setup lang="ts">
import { computed } from 'vue';
import { useStockStore } from '../stores/stock';
import type { StockItem } from '../types/stock';
import { Trash2, TrendingUp, TrendingDown } from '@lucide/vue';

const stockStore = useStockStore();

function formatPrice(val?: number) {
  if (val === undefined || val === null || isNaN(val) || val === 0) return '--';
  return val.toFixed(2);
}

function formatChange(val?: number) {
  if (val === undefined || val === null || isNaN(val)) return '--';
  return (val > 0 ? '+' : '') + val.toFixed(2);
}

function formatPercent(val?: number) {
  if (val === undefined || val === null || isNaN(val)) return '--';
  return (val > 0 ? '+' : '') + val.toFixed(2) + '%';
}

function getChangeColor(val?: number) {
  if (val === undefined || val === null || isNaN(val) || val === 0) return 'text-slate-400';
  return val > 0 ? 'text-red-400' : 'text-emerald-400';
}

function getBadgeBg(val?: number) {
  if (val === undefined || val === null || isNaN(val) || val === 0) return 'bg-slate-800 border-slate-700 text-slate-400';
  return val > 0 
    ? 'bg-red-500/15 border-red-500/30 text-red-400' 
    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
}

const stats = computed(() => {
  let up = 0;
  let down = 0;
  let flat = 0;
  for (const item of stockStore.watchlist) {
    const q = stockStore.quotes[item.symbol];
    if (!q || q.changePercent === 0) {
      flat++;
    } else if (q.changePercent > 0) {
      up++;
    } else {
      down++;
    }
  }
  return { up, down, flat, total: stockStore.watchlist.length };
});
</script>

<template>
  <aside class="w-72 shrink-0 border-r border-slate-800 bg-slate-900/60 flex flex-col h-full select-none">
    <!-- Header -->
    <div class="p-3 border-b border-slate-800/80 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold tracking-wider text-slate-400 uppercase">自选列表</span>
        <span class="px-1.5 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300">
          {{ stats.total }}
        </span>
      </div>

      <!-- Quick mini stats -->
      <div class="flex items-center gap-2 text-xs font-mono">
        <span class="text-red-400 flex items-center gap-0.5">
          <TrendingUp class="w-3 h-3" /> {{ stats.up }}
        </span>
        <span class="text-emerald-400 flex items-center gap-0.5">
          <TrendingDown class="w-3 h-3" /> {{ stats.down }}
        </span>
      </div>
    </div>

    <!-- Stock Cards List -->
    <div class="flex-1 overflow-y-auto divide-y divide-slate-800/40">
      <div
        v-for="item in stockStore.watchlist"
        :key="item.code + item.market"
        @click="stockStore.selectStock(item)"
        class="p-3 cursor-pointer transition relative group flex items-center justify-between"
        :class="stockStore.activeStock?.code === item.code && stockStore.activeStock?.market === item.market
          ? 'bg-slate-800/90 border-l-2 border-l-red-500'
          : 'hover:bg-slate-800/40'"
      >
        <!-- Left: Name & Code -->
        <div class="min-w-0 pr-2">
          <div class="flex items-center gap-1.5">
            <span class="text-xs px-1 py-0.2 rounded font-mono font-medium text-slate-400 bg-slate-800 text-[10px]">
              {{ item.market }}
            </span>
            <span class="text-sm font-semibold text-slate-100 truncate">
              {{ item.name }}
            </span>
          </div>
          <div class="text-xs font-mono text-slate-500 mt-0.5">
            {{ item.code }}
          </div>
        </div>

        <!-- Right: Realtime Price & Percent -->
        <div class="text-right shrink-0">
          <div class="text-sm font-mono font-bold" :class="getChangeColor(stockStore.quotes[item.symbol]?.changePercent)">
            {{ formatPrice(stockStore.quotes[item.symbol]?.price) }}
          </div>
          <div class="mt-0.5">
            <span
              class="inline-block px-1.5 py-0.5 rounded text-xs font-mono font-medium border"
              :class="getBadgeBg(stockStore.quotes[item.symbol]?.changePercent)"
            >
              {{ formatPercent(stockStore.quotes[item.symbol]?.changePercent) }}
            </span>
          </div>
        </div>

        <!-- Hover Remove Button -->
        <button
          @click.stop="stockStore.removeStock(item.code, item.market)"
          class="absolute right-2 top-2 p-1 rounded bg-slate-900/90 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shadow"
          title="移除自选"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>

      <div v-if="stockStore.watchlist.length === 0" class="p-8 text-center text-slate-500 text-xs">
        暂无自选股，可在上方搜索框添加
      </div>
    </div>
  </aside>
</template>
