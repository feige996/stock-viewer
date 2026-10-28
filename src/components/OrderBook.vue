<script setup lang="ts">
import { computed } from 'vue';
import { useStockStore } from '../stores/stock';

const stockStore = useStockStore();
const quote = computed(() => stockStore.activeQuote);

function formatPrice(p: number) {
  return p > 0 ? p.toFixed(2) : '--';
}

function getPriceColor(p: number) {
  if (!p || !quote.value?.preClose) return 'text-slate-400';
  if (p > quote.value.preClose) return 'text-red-400';
  if (p < quote.value.preClose) return 'text-emerald-400';
  return 'text-slate-300';
}

// Calculate max volume for relative depth bar
const maxVolume = computed(() => {
  if (!quote.value) return 1;
  const buyVols = quote.value.buyLevels.map((l) => l.volume);
  const sellVols = quote.value.sellLevels.map((l) => l.volume);
  return Math.max(...buyVols, ...sellVols, 1);
});

const sellList = computed(() => {
  if (!quote.value) return [];
  // 卖五 down to 卖一
  return quote.value.sellLevels
    .map((level, idx) => ({
      name: `卖${5 - idx}`,
      ...level,
    }))
    .reverse();
});

const buyList = computed(() => {
  if (!quote.value) return [];
  // 买一 down to 买五
  return quote.value.buyLevels.map((level, idx) => ({
    name: `买${idx + 1}`,
    ...level,
  }));
});
</script>

<template>
  <div class="w-64 shrink-0 border-l border-slate-800 bg-slate-900/80 flex flex-col h-full text-xs font-mono select-none">
    <!-- Header -->
    <div class="p-3 border-b border-slate-800 flex items-center justify-between text-slate-400">
      <span class="font-semibold text-slate-300">五档盘口</span>
      <div class="flex items-center gap-2 text-[10px]">
        <span class="text-red-400">涨停 {{ quote?.highLimit ? quote.highLimit.toFixed(2) : '--' }}</span>
        <span class="text-emerald-400">跌停 {{ quote?.lowLimit ? quote.lowLimit.toFixed(2) : '--' }}</span>
      </div>
    </div>

    <!-- Levels container -->
    <div class="flex-1 p-2 flex flex-col justify-between overflow-y-auto">
      <!-- Sells (卖五 ~ 卖一) -->
      <div class="space-y-1">
        <div
          v-for="item in sellList"
          :key="item.name"
          class="relative flex items-center justify-between px-2 py-1 rounded overflow-hidden"
        >
          <!-- Depth bar -->
          <div
            class="absolute right-0 top-0 bottom-0 bg-emerald-500/10 transition-all pointer-events-none"
            :style="{ width: `${(item.volume / maxVolume) * 100}%` }"
          ></div>
          <span class="text-slate-500 z-10">{{ item.name }}</span>
          <span class="font-bold z-10" :class="getPriceColor(item.price)">
            {{ formatPrice(item.price) }}
          </span>
          <span class="text-slate-400 z-10">{{ item.volume || '--' }}</span>
        </div>
      </div>

      <!-- Divider / Current spread -->
      <div class="my-2 border-t border-dashed border-slate-800 flex items-center justify-between px-2 pt-2 text-slate-500 text-[11px]">
        <span>现价:</span>
        <span class="font-bold text-slate-200 text-sm">
          {{ quote?.price ? quote.price.toFixed(2) : '--' }}
        </span>
      </div>

      <!-- Buys (买一 ~ 买五) -->
      <div class="space-y-1">
        <div
          v-for="item in buyList"
          :key="item.name"
          class="relative flex items-center justify-between px-2 py-1 rounded overflow-hidden"
        >
          <!-- Depth bar -->
          <div
            class="absolute right-0 top-0 bottom-0 bg-red-500/10 transition-all pointer-events-none"
            :style="{ width: `${(item.volume / maxVolume) * 100}%` }"
          ></div>
          <span class="text-slate-500 z-10">{{ item.name }}</span>
          <span class="font-bold z-10" :class="getPriceColor(item.price)">
            {{ formatPrice(item.price) }}
          </span>
          <span class="text-slate-400 z-10">{{ item.volume || '--' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
