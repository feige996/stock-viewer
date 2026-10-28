<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { init, dispose, type Chart, type KLineData } from 'klinecharts';
import { useStockStore } from '../stores/stock';
import { fetchKLineData } from '../services/market';
import type { KLinePeriod } from '../types/stock';
import { RefreshCw, BarChart2 } from '@lucide/vue';

const stockStore = useStockStore();
const chartContainerRef = ref<HTMLDivElement | null>(null);
const isLoading = ref(false);

let chart: Chart | null = null;
let realtimeUpdateCallback: ((data: KLineData) => void) | null = null;
let resizeObserver: ResizeObserver | null = null;

const periods: { label: string; value: KLinePeriod }[] = [
  { label: '分时(1m)', value: '1m' },
  { label: '5分', value: '5m' },
  { label: '15分', value: '15m' },
  { label: '30分', value: '30m' },
  { label: '60分', value: '60m' },
  { label: '日K', value: 'day' },
  { label: '周K', value: 'week' },
  { label: '月K', value: 'month' },
];

const mainIndicators: ('MA' | 'EMA' | 'BOLL' | 'none')[] = ['MA', 'EMA', 'BOLL', 'none'];
const subIndicators: ('VOL' | 'MACD' | 'KDJ' | 'RSI' | 'none')[] = ['VOL', 'MACD', 'KDJ', 'RSI', 'none'];

const periodMap: Record<KLinePeriod, { type: 'minute' | 'day' | 'week' | 'month'; span: number }> = {
  '1m': { type: 'minute', span: 1 },
  '5m': { type: 'minute', span: 5 },
  '15m': { type: 'minute', span: 15 },
  '30m': { type: 'minute', span: 30 },
  '60m': { type: 'minute', span: 60 },
  'day': { type: 'day', span: 1 },
  'week': { type: 'week', span: 1 },
  'month': { type: 'month', span: 1 },
};

function initChart() {
  if (!chartContainerRef.value) return;

  chart = init(chartContainerRef.value, {
    locale: 'zh-CN',
    styles: {
      grid: {
        show: true,
        horizontal: {
          color: 'rgba(255, 255, 255, 0.05)',
          style: 'dashed',
        },
        vertical: {
          color: 'rgba(255, 255, 255, 0.05)',
          style: 'dashed',
        },
      },
      candle: {
        bar: {
          upColor: '#ef4444',
          downColor: '#22c55e',
          noChangeColor: '#9ca3af',
          upBorderColor: '#ef4444',
          downBorderColor: '#22c55e',
          noChangeBorderColor: '#9ca3af',
          upWickColor: '#ef4444',
          downWickColor: '#22c55e',
          noChangeWickColor: '#9ca3af',
        },
        priceMark: {
          last: {
            show: true,
            upColor: '#ef4444',
            downColor: '#22c55e',
            noChangeColor: '#9ca3af',
          },
        },
        tooltip: {
          showRule: 'always',
        },
      },
      indicator: {
        ohlc: {
          upColor: 'rgba(239, 68, 68, 0.7)',
          downColor: 'rgba(34, 197, 94, 0.7)',
          noChangeColor: '#9ca3af',
        },
      },
      xAxis: {
        axisLine: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        tickLine: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        tickText: {
          color: '#94a3b8',
        },
      },
      yAxis: {
        axisLine: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        tickLine: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        tickText: {
          color: '#94a3b8',
        },
      },
    },
  });

  if (!chart) return;

  // Set DataLoader
  chart.setDataLoader({
    getBars: async (params) => {
      isLoading.value = true;
      try {
        const bars = await fetchKLineData(stockStore.activeStock, stockStore.period, 240);
        params.callback(bars, { backward: false, forward: false });
      } finally {
        isLoading.value = false;
      }
    },
    subscribeBar: (params) => {
      realtimeUpdateCallback = params.callback;
    },
    unsubscribeBar: () => {
      realtimeUpdateCallback = null;
    },
  });

  updateChartConfig();
  updateIndicators();

  // Resize listener
  resizeObserver = new ResizeObserver(() => {
    chart?.resize();
  });
  resizeObserver.observe(chartContainerRef.value);
}

function updateChartConfig() {
  if (!chart || !stockStore.activeStock) return;

  chart.setSymbol({
    ticker: stockStore.activeStock.code,
    name: stockStore.activeStock.name,
    shortName: stockStore.activeStock.name,
    exchange: stockStore.activeStock.market,
    market: 'A',
    pricePrecision: 2,
    volumePrecision: 0,
  });

  chart.setPeriod(periodMap[stockStore.period] || { type: 'day', span: 1 });
}

function updateIndicators() {
  if (!chart) return;

  // Remove existing main indicators
  ['MA', 'EMA', 'BOLL'].forEach((name) => {
    chart?.removeIndicator({ name });
  });

  if (stockStore.mainIndicator !== 'none') {
    chart.createIndicator({ name: stockStore.mainIndicator, paneId: 'candle_pane' });
  }

  // Remove existing sub indicators
  ['VOL', 'MACD', 'KDJ', 'RSI'].forEach((name) => {
    chart?.removeIndicator({ name });
  });

  if (stockStore.subIndicator !== 'none') {
    chart.createIndicator({ name: stockStore.subIndicator });
  }
}

// Watch active stock change
watch(
  () => stockStore.activeStock,
  () => {
    updateChartConfig();
    chart?.resetData();
  }
);

// Watch period change
watch(
  () => stockStore.period,
  () => {
    updateChartConfig();
    chart?.resetData();
  }
);

// Watch indicators change
watch([() => stockStore.mainIndicator, () => stockStore.subIndicator], () => {
  updateIndicators();
});

// Update real-time candle when quote changes
watch(
  () => stockStore.activeQuote,
  (newQuote) => {
    if (!newQuote || !realtimeUpdateCallback || stockStore.period !== 'day') return;
    const now = new Date();
    // Round to midnight today for daily K
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    realtimeUpdateCallback({
      timestamp: today,
      open: newQuote.open || newQuote.price,
      high: newQuote.high || newQuote.price,
      low: newQuote.low || newQuote.price,
      close: newQuote.price,
      volume: newQuote.volume,
      turnover: newQuote.amount * 10000,
    });
  }
);

onMounted(() => {
  initChart();
});

onUnmounted(() => {
  if (resizeObserver && chartContainerRef.value) {
    resizeObserver.unobserve(chartContainerRef.value);
    resizeObserver.disconnect();
  }
  if (chartContainerRef.value) {
    dispose(chartContainerRef.value);
  }
  chart = null;
});
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-slate-950 min-w-0 relative">
    <!-- Toolbar -->
    <div class="px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-4 flex-wrap text-xs select-none">
      <!-- Period Selector -->
      <div class="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
        <button
          v-for="p in periods"
          :key="p.value"
          @click="stockStore.period = p.value"
          class="px-2.5 py-1 rounded-md font-medium transition"
          :class="stockStore.period === p.value
            ? 'bg-red-500/20 text-red-400 font-semibold shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Indicators Selector -->
      <div class="flex items-center gap-4">
        <!-- Main Indicator -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500">主图:</span>
          <div class="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <button
              v-for="ind in mainIndicators"
              :key="ind"
              @click="stockStore.mainIndicator = ind"
              class="px-2 py-0.5 rounded font-mono font-medium transition"
              :class="stockStore.mainIndicator === ind
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'"
            >
              {{ ind === 'none' ? '无' : ind }}
            </button>
          </div>
        </div>

        <!-- Sub Indicator -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500">副图:</span>
          <div class="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <button
              v-for="ind in subIndicators"
              :key="ind"
              @click="stockStore.subIndicator = ind"
              class="px-2 py-0.5 rounded font-mono font-medium transition"
              :class="stockStore.subIndicator === ind
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'"
            >
              {{ ind === 'none' ? '无' : ind }}
            </button>
          </div>
        </div>

        <!-- Refresh chart data -->
        <button
          @click="chart?.resetData()"
          class="p-1.5 rounded bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition"
          title="重新加载K线"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

    <!-- Chart Container -->
    <div class="flex-1 relative w-full h-full overflow-hidden">
      <!-- Loading Overlay -->
      <div
        v-if="isLoading"
        class="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none transition"
      >
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-xs text-slate-300">
          <RefreshCw class="w-3.5 h-3.5 animate-spin text-red-400" />
          <span>加载K线数据中...</span>
        </div>
      </div>

      <div ref="chartContainerRef" class="w-full h-full"></div>
    </div>
  </div>
</template>
