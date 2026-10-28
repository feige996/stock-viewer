<script setup lang="ts">
import { computed } from 'vue';
import { useStockStore } from '../stores/stock';
import { Layers } from '@lucide/vue';

const props = defineProps<{
  showOrderBook: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggleOrderBook'): void;
}>();

const stockStore = useStockStore();
const quote = computed(() => stockStore.activeQuote);

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

function formatVolume(vol?: number) {
  if (!vol) return '--';
  if (vol >= 1000000) return (vol / 10000).toFixed(0) + '万手';
  if (vol >= 10000) return (vol / 10000).toFixed(2) + '万手';
  return vol + '手';
}

function formatAmount(amt?: number) {
  // amt is in 10,000 CNY (万元)
  if (!amt) return '--';
  if (amt >= 10000) return (amt / 10000).toFixed(2) + '亿';
  return amt.toFixed(0) + '万';
}

const changeColor = computed(() => {
  const p = quote.value?.changePercent;
  if (!p) return 'text-slate-300';
  return p > 0 ? 'text-red-400' : 'text-emerald-400';
});
</script>

<template>
  <div class="px-5 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between gap-6 shrink-0">
    <!-- Left: Stock Name & Huge Price -->
    <div class="flex items-center gap-6">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-bold text-white tracking-tight">
            {{ stockStore.activeStock?.name }}
          </h2>
          <span class="text-xs px-1.5 py-0.5 rounded font-mono bg-slate-800 text-slate-400 border border-slate-700">
            {{ stockStore.activeStock?.market }} {{ stockStore.activeStock?.code }}
          </span>
        </div>
        <div class="text-[11px] font-mono text-slate-500 mt-0.5">
          更新时间: {{ quote?.time || '--' }}
        </div>
      </div>

      <!-- Price & Change -->
      <div class="flex items-baseline gap-3">
        <span class="text-3xl font-extrabold font-mono tracking-tight" :class="changeColor">
          {{ formatPrice(quote?.price) }}
        </span>
        <div class="flex items-center gap-1.5 font-mono text-sm font-semibold" :class="changeColor">
          <span>{{ formatChange(quote?.change) }}</span>
          <span>({{ formatPercent(quote?.changePercent) }})</span>
        </div>
      </div>
    </div>

    <!-- Center/Right: Metrics Grid -->
    <div class="hidden xl:grid grid-cols-4 gap-x-6 gap-y-1 text-xs">
      <div class="flex justify-between gap-2">
        <span class="text-slate-500">今开</span>
        <span class="font-mono text-slate-200">{{ formatPrice(quote?.open) }}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span class="text-slate-500">最高</span>
        <span class="font-mono text-red-400">{{ formatPrice(quote?.high) }}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span class="text-slate-500">成交量</span>
        <span class="font-mono text-slate-200">{{ formatVolume(quote?.volume) }}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span class="text-slate-500">换手率</span>
        <span class="font-mono text-slate-200">{{ quote?.turnoverRate ? quote.turnoverRate.toFixed(2) + '%' : '--' }}</span>
      </div>

      <div class="flex justify-between gap-2">
        <span class="text-slate-500">昨收</span>
        <span class="font-mono text-slate-200">{{ formatPrice(quote?.preClose) }}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span class="text-slate-500">最低</span>
        <span class="font-mono text-emerald-400">{{ formatPrice(quote?.low) }}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span class="text-slate-500">成交额</span>
        <span class="font-mono text-slate-200">{{ formatAmount(quote?.amount) }}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span class="text-slate-500">市盈率</span>
        <span class="font-mono text-slate-200">{{ quote?.pe ? quote.pe.toFixed(2) : '--' }}</span>
      </div>
    </div>

    <!-- Right: OrderBook Toggle -->
    <button
      @click="emit('toggleOrderBook')"
      class="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition shrink-0"
      :class="showOrderBook 
        ? 'bg-slate-700 border-slate-600 text-white' 
        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200'"
      title="切换五档盘口"
    >
      <Layers class="w-4 h-4" />
      <span>五档盘口</span>
    </button>
  </div>
</template>
