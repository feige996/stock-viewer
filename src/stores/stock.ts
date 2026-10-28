import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { StockItem, RealtimeQuote, KLinePeriod } from '../types/stock';
import { fetchRealtimeQuotes } from '../services/market';

const STORAGE_KEY = 'stock_viewer_watchlist_v1';

const DEFAULT_STOCKS: StockItem[] = [
  { code: '300413', name: '芒果超媒', market: 'SZ', secid: '0.300413', symbol: 'sz300413' },
  { code: '600031', name: '三一重工', market: 'SH', secid: '1.600031', symbol: 'sh600031' },
  { code: '002920', name: '德赛西威', market: 'SZ', secid: '0.002920', symbol: 'sz002920' },
  { code: '002594', name: '比亚迪', market: 'SZ', secid: '0.002594', symbol: 'sz002594' },
  { code: '600519', name: '贵州茅台', market: 'SH', secid: '1.600519', symbol: 'sh600519' },
  { code: '300750', name: '宁德时代', market: 'SZ', secid: '0.300750', symbol: 'sz300750' },
  { code: '688981', name: '中芯国际', market: 'SH', secid: '1.688981', symbol: 'sh688981' },
  { code: '000001', name: '平安银行', market: 'SZ', secid: '0.000001', symbol: 'sz000001' },
];

function loadInitialWatchlist(): StockItem[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_STOCKS;
  try {
    const list: StockItem[] = JSON.parse(saved);
    for (const def of DEFAULT_STOCKS) {
      if (!list.some((item) => item.code === def.code && item.market === def.market)) {
        list.push(def);
      }
    }
    return list;
  } catch {
    return DEFAULT_STOCKS;
  }
}

export const useStockStore = defineStore('stock', () => {
  // Load watchlist from localStorage or default
  const savedWatchlist = localStorage.getItem(STORAGE_KEY);
  const watchlist = ref<StockItem[]>(loadInitialWatchlist());

  // Active stock
  const activeStock = ref<StockItem>(watchlist.value[0] || DEFAULT_STOCKS[0]);

  // Realtime quotes dict: symbol -> quote
  const quotes = ref<Record<string, RealtimeQuote>>({});

  // Active quote for currently selected stock
  const activeQuote = computed<RealtimeQuote | null>(() => {
    if (!activeStock.value) return null;
    return quotes.value[activeStock.value.symbol] || null;
  });

  // Chart settings
  const period = ref<KLinePeriod>('day');
  const mainIndicator = ref<'MA' | 'EMA' | 'BOLL' | 'none'>('MA');
  const subIndicator = ref<'VOL' | 'MACD' | 'KDJ' | 'RSI' | 'none'>('VOL');

  // Auto refresh
  const autoRefresh = ref(true);
  const isRefreshing = ref(false);
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  // Persist watchlist changes
  watch(
    watchlist,
    (newList) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    },
    { deep: true },
  );

  // Add stock to watchlist
  function addStock(stock: StockItem) {
    if (!watchlist.value.some((s) => s.code === stock.code && s.market === stock.market)) {
      watchlist.value.push(stock);
      fetchQuotes();
    }
    activeStock.value = stock;
  }

  // Remove stock from watchlist
  function removeStock(code: string, market: string) {
    const idx = watchlist.value.findIndex((s) => s.code === code && s.market === market);
    if (idx !== -1) {
      watchlist.value.splice(idx, 1);
      if (activeStock.value?.code === code && activeStock.value?.market === market) {
        activeStock.value = watchlist.value[0] || DEFAULT_STOCKS[0];
      }
    }
  }

  // Select stock
  function selectStock(stock: StockItem) {
    activeStock.value = stock;
  }

  // Fetch quotes for all stocks in watchlist + active stock
  async function fetchQuotes() {
    if (isRefreshing.value) return;
    isRefreshing.value = true;
    try {
      const symbols = Array.from(
        new Set([
          ...watchlist.value.map((s) => s.symbol),
          ...(activeStock.value ? [activeStock.value.symbol] : []),
        ]),
      );
      if (symbols.length > 0) {
        const res = await fetchRealtimeQuotes(symbols);
        quotes.value = { ...quotes.value, ...res };
      }
    } finally {
      isRefreshing.value = false;
    }
  }

  // Polling setup
  function startPolling() {
    stopPolling();
    fetchQuotes();
    pollTimer = setInterval(() => {
      if (autoRefresh.value) {
        fetchQuotes();
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function toggleAutoRefresh() {
    autoRefresh.value = !autoRefresh.value;
  }

  return {
    watchlist,
    activeStock,
    quotes,
    activeQuote,
    period,
    mainIndicator,
    subIndicator,
    autoRefresh,
    isRefreshing,
    addStock,
    removeStock,
    selectStock,
    fetchQuotes,
    startPolling,
    stopPolling,
    toggleAutoRefresh,
  };
});
