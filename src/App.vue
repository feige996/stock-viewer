<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useStockStore } from './stores/stock';
import Header from './components/Header.vue';
import Watchlist from './components/Watchlist.vue';
import StockHeader from './components/StockHeader.vue';
import KLineChart from './components/KLineChart.vue';
import OrderBook from './components/OrderBook.vue';

const stockStore = useStockStore();
const showOrderBook = ref(true);

onMounted(() => {
  stockStore.startPolling();
});

onUnmounted(() => {
  stockStore.stopPolling();
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
    <!-- Header -->
    <Header />

    <!-- Main Workspace -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Left: Watchlist -->
      <Watchlist />

      <!-- Center: Stock details & K-Line Chart -->
      <section class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <StockHeader
          :showOrderBook="showOrderBook"
          @toggleOrderBook="showOrderBook = !showOrderBook"
        />
        <KLineChart />
      </section>

      <!-- Right: Order Book -->
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-4"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-4"
      >
        <OrderBook v-if="showOrderBook" />
      </transition>
    </main>
  </div>
</template>
