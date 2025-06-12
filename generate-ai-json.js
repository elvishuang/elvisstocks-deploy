const fs = require('fs');

// 定義台股列表
const symbols = ['2330.TW', '2303.TW', '3715.TW', '2317.TW'];

// 輔助計算簡單移動平均 (SMA)
function calcSMA(data) {
  if (data.length === 0) return null;
  const sum = data.reduce((a, b) => a + b, 0);
  return sum / data.length;
}

async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=7d&interval=1d`;
  const res = await fetch(url);
  const json = await res.json();
  const result = json.chart.result[0];
  const close = result.indicators.quote[0].close;
  const latestPrice = close[close.length - 1];
  const sma5 = calcSMA(close.slice(-5));
  return { latestPrice, sma5, history: close.slice(-5) };
}

(async () => {
  const stocks = [];
  for (const symbol of symbols) {
    try {
      const { latestPrice, sma5, history } = await fetchQuote(symbol);
      stocks.push({
        symbol,
        price: latestPrice,
        sma5,
        history,
      });
    } catch (err) {
      console.error('Error fetching', symbol, err);
    }
  }
  fs.writeFileSync('ai.json', JSON.stringify(stocks, null, 2), 'utf-8');
})();
