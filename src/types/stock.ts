export type MarketType = 'SH' | 'SZ' | 'BJ';

export interface StockItem {
  code: string;
  name: string;
  market: MarketType;
  secid: string;   // e.g. 1.600519 or 0.000001
  symbol: string;  // e.g. sh600519 or sz000001
}

export interface OrderLevel {
  price: number;
  volume: number; // 手
}

export interface RealtimeQuote {
  code: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  preClose: number;
  high: number;
  low: number;
  volume: number;       // 手
  amount: number;       // 万元
  turnoverRate: number; // 换手率 %
  pe: number;           // 市盈率
  amplitude: number;    // 振幅 %
  highLimit: number;    // 涨停价
  lowLimit: number;     // 跌停价
  time: string;
  buyLevels: OrderLevel[];
  sellLevels: OrderLevel[];
}

export type KLinePeriod = '1m' | '5m' | '15m' | '30m' | '60m' | 'day' | 'week' | 'month';

export interface KBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover?: number;
  [key: string]: unknown;
}
