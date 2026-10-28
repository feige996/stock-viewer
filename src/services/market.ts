import axios from 'axios';
import type { StockItem, RealtimeQuote, KLinePeriod, KBar, OrderLevel } from '../types/stock';

export function getStockMeta(code: string, quoteId?: string): { secid: string; symbol: string; market: 'SH' | 'SZ' | 'BJ' } {
  if (quoteId) {
    const [mkt, c] = quoteId.split('.');
    const isSH = mkt === '1';
    const isBJ = c.startsWith('8') || c.startsWith('4') || c.startsWith('92');
    const market = isSH ? 'SH' : isBJ ? 'BJ' : 'SZ';
    const prefix = isSH ? 'sh' : isBJ ? 'bj' : 'sz';
    return {
      secid: quoteId,
      symbol: `${prefix}${c}`,
      market,
    };
  }

  // Fallback heuristic based on code
  if (code.startsWith('6') || code.startsWith('900') || code.startsWith('51') || code.startsWith('11')) {
    return { secid: `1.${code}`, symbol: `sh${code}`, market: 'SH' };
  }
  if (code.startsWith('8') || code.startsWith('4') || code.startsWith('92')) {
    return { secid: `0.${code}`, symbol: `bj${code}`, market: 'BJ' };
  }
  return { secid: `0.${code}`, symbol: `sz${code}`, market: 'SZ' };
}

/**
 * Fetch real-time quotes using Tencent Qt API
 */
export async function fetchRealtimeQuotes(symbols: string[]): Promise<Record<string, RealtimeQuote>> {
  if (!symbols.length) return {};
  
  try {
    const res = await axios.get(`/api/tencent/q=${symbols.join(',')}`, {
      responseType: 'arraybuffer',
    });
    
    // Decode GBK response from Tencent
    const decoder = new TextDecoder('gbk');
    const text = decoder.decode(res.data);
    
    const quotes: Record<string, RealtimeQuote> = {};
    const lines = text.split(';\n');

    for (const line of lines) {
      const match = line.match(/v_([a-z0-9]+)="([^"]+)"/);
      if (!match) continue;

      const symbol = match[1];
      const parts = match[2].split('~');
      if (parts.length < 35) continue;

      const name = parts[1];
      const code = parts[2];
      const price = parseFloat(parts[3]) || 0;
      const preClose = parseFloat(parts[4]) || 0;
      const open = parseFloat(parts[5]) || 0;
      const volume = parseFloat(parts[6]) || 0;

      // Buy levels (1 to 5)
      const buyLevels: OrderLevel[] = [
        { price: parseFloat(parts[9]) || 0, volume: parseFloat(parts[10]) || 0 },
        { price: parseFloat(parts[11]) || 0, volume: parseFloat(parts[12]) || 0 },
        { price: parseFloat(parts[13]) || 0, volume: parseFloat(parts[14]) || 0 },
        { price: parseFloat(parts[15]) || 0, volume: parseFloat(parts[16]) || 0 },
        { price: parseFloat(parts[17]) || 0, volume: parseFloat(parts[18]) || 0 },
      ];

      // Sell levels (1 to 5)
      const sellLevels: OrderLevel[] = [
        { price: parseFloat(parts[19]) || 0, volume: parseFloat(parts[20]) || 0 },
        { price: parseFloat(parts[21]) || 0, volume: parseFloat(parts[22]) || 0 },
        { price: parseFloat(parts[23]) || 0, volume: parseFloat(parts[24]) || 0 },
        { price: parseFloat(parts[25]) || 0, volume: parseFloat(parts[26]) || 0 },
        { price: parseFloat(parts[27]) || 0, volume: parseFloat(parts[28]) || 0 },
      ];

      const time = parts[30] || '';
      const change = parseFloat(parts[31]) || 0;
      const changePercent = parseFloat(parts[32]) || 0;
      const high = parseFloat(parts[33]) || 0;
      const low = parseFloat(parts[34]) || 0;
      const amount = parseFloat(parts[37]) || 0;
      const turnoverRate = parseFloat(parts[38]) || 0;
      const pe = parseFloat(parts[39]) || 0;
      const amplitude = parseFloat(parts[43]) || 0;
      const highLimit = parseFloat(parts[47]) || 0;
      const lowLimit = parseFloat(parts[48]) || 0;

      quotes[symbol] = {
        code,
        name,
        symbol,
        price,
        change,
        changePercent,
        open,
        preClose,
        high,
        low,
        volume,
        amount,
        turnoverRate,
        pe,
        amplitude,
        highLimit,
        lowLimit,
        time,
        buyLevels,
        sellLevels,
      };
    }

    return quotes;
  } catch (err) {
    console.error('Failed to fetch realtime quotes:', err);
    return {};
  }
}

/**
 * Fetch K-Line history bars using Tencent (Day/Week/Month/1m) and Sina (5m/15m/30m/60m)
 */
export async function fetchKLineData(stock: StockItem, period: KLinePeriod = 'day', limit = 240): Promise<KBar[]> {
  // 1. Minute intraday (1m) via Tencent
  if (period === '1m') {
    try {
      const res = await axios.get('/api/tencent-kline/appstock/app/minute/query', {
        params: { code: stock.symbol },
        timeout: 4000,
      });
      const dataObj = res.data?.data?.[stock.symbol]?.data;
      const points: string[] = dataObj?.data || [];
      const dateStr = dataObj?.date || new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const y = dateStr.slice(0, 4);
      const m = dateStr.slice(4, 6);
      const d = dateStr.slice(6, 8);

      let prevVolume = 0;
      return points.map((pStr) => {
        const [timePart, priceStr, volStr, amountStr] = pStr.split(' ');
        const hh = timePart.slice(0, 2);
        const mm = timePart.slice(2, 4);
        const timestamp = new Date(`${y}/${m}/${d} ${hh}:${mm}:00`).getTime();
        const price = parseFloat(priceStr);
        const cumVol = parseFloat(volStr);
        const stepVol = Math.max(0, cumVol - prevVolume);
        prevVolume = cumVol;

        return {
          timestamp,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: stepVol,
          turnover: parseFloat(amountStr),
        };
      });
    } catch (err) {
      console.warn('Tencent 1m fetch failed:', err);
    }
  }

  // 2. Day / Week / Month via Tencent QFQ K-line API
  if (period === 'day' || period === 'week' || period === 'month') {
    try {
      const res = await axios.get('/api/tencent-kline/appstock/app/fqkline/get', {
        params: {
          param: `${stock.symbol},${period},,,${limit},qfq`,
        },
        timeout: 4000,
      });

      const stockData = res.data?.data?.[stock.symbol];
      const key = `qfq${period}`;
      const list = stockData?.[key] || stockData?.[period] || [];

      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: string[]) => {
          // item: [date, open, close, high, low, volume]
          const dateStr = item[0];
          const timestamp = new Date(dateStr.replace(/-/g, '/')).getTime();
          return {
            timestamp,
            open: parseFloat(item[1]),
            close: parseFloat(item[2]),
            high: parseFloat(item[3]),
            low: parseFloat(item[4]),
            volume: parseFloat(item[5]),
          };
        });
      }
    } catch (err) {
      console.warn('Tencent fqkline fetch failed, trying Sina:', err);
    }
  }

  // 3. 5m / 15m / 30m / 60m (and fallback for day) via Sina API
  try {
    const scaleMap: Partial<Record<KLinePeriod, number>> = {
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '60m': 60,
      'day': 240,
    };
    const scale = scaleMap[period] || 240;
    const res = await axios.get('/api/sina/quotes_service/api/json_v2.php/CN_MarketData.getKLineData', {
      params: {
        symbol: stock.symbol,
        scale,
        ma: 'no',
        datalen: limit,
      },
      timeout: 4000,
    });

    if (Array.isArray(res.data)) {
      return res.data.map((item: any) => ({
        timestamp: new Date(item.day.replace(/-/g, '/')).getTime(),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(item.volume),
      }));
    }
  } catch (sinaErr) {
    console.error('Sina kline fetch failed:', sinaErr);
  }

  return [];
}

/**
 * Search stocks from Eastmoney Suggest API (stable, never hangs up)
 */
export async function searchStocks(keyword: string): Promise<StockItem[]> {
  if (!keyword.trim()) return [];

  try {
    const res = await axios.get('/api/em-search/api/suggest/get', {
      params: {
        input: keyword.trim(),
        type: 14,
      },
      timeout: 4000,
    });

    const dataList = res.data?.QuotationCodeTable?.Data;
    if (Array.isArray(dataList)) {
      return dataList.map((item: any) => {
        const meta = getStockMeta(item.Code, item.QuoteID);
        return {
          code: item.Code,
          name: item.Name,
          secid: item.QuoteID || meta.secid,
          symbol: meta.symbol,
          market: meta.market,
        };
      });
    }
  } catch (err) {
    console.error('Search stock failed:', err);
  }

  return [];
}
