const API_JSON_URL = "https://elvishuang.github.io/data/ai.json";

const stockSymbols = {
  Taiwan: [
    { symbol: '2330.TW', name: '台積電', industry: 'TECHNOLOGY', style: 'value', size: 'large', reason: '先進製程領先全球，AI晶片需求強勁' },
    { symbol: '2317.TW', name: '鴻海', industry: 'TECHNOLOGY', style: 'value', size: 'large', reason: '電動車布局加速，轉型效益顯現' },
    { symbol: '2454.TW', name: '聯發科', industry: 'TECHNOLOGY', style: 'growth', size: 'large', reason: '手機晶片市占率持續提升' },
    { symbol: '2412.TW', name: '中華電', industry: 'COMMUNICATION_SERVICES', style: 'dividend', size: 'large', reason: '5G布局完善，高股息率' }
  ],
  US: [
    { symbol: 'AAPL', name: '蘋果', industry: 'TECHNOLOGY', style: 'growth', size: 'large', reason: '生態系完整，服務收入成長' },
    { symbol: 'MSFT', name: '微軟', industry: 'TECHNOLOGY', style: 'growth', size: 'large', reason: '雲端與AI領先' },
    { symbol: 'GOOGL', name: '谷歌', industry: 'COMMUNICATION_SERVICES', style: 'growth', size: 'large', reason: '廣告與AI應用強勁' }
  ]
};

function initPage() {
  const apikey = localStorage.getItem('AV_API_KEY');
  if (apikey) {
    document.getElementById('api-key-input').style.display = 'none';
    loadAll(apikey);
  }
  document.getElementById('search-symbol').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const symbol = e.target.value.trim().toUpperCase();
      if (symbol) {
        renderChart(symbol);
        loadStockData(apikey, symbol);
      }
    }
  });
  loadWatchlist();
}

function saveApiKey() {
  const key = document.getElementById('apikey').value;
  if (key) {
    localStorage.setItem('AV_API_KEY', key);
    document.getElementById('api-key-input').style.display = 'none';
    loadAll(key);
  }
}

function loadAll(apikey) {
  loadMarquee(apikey);
  loadHotRecommendations(apikey);
  loadLongTermRecommendations(apikey);
  loadMarketOverview(apikey);
  loadAIRecommendation();
  renderChart("2330.TW");
  loadStockData(apikey, "2330.TW");
}

function renderChart(symbol) {
  const chart = document.getElementById('chart');
  chart.innerHTML = `
    <iframe src="https://www.tradingview.com/embed-widget/advanced-chart/?symbol=${symbol}&theme=light"
      style="width:100%; height:400px;" frameborder="0"></iframe>`;
}

function loadStockData(apikey, symbol) {
  const content = document.getElementById('content');
  content.innerHTML = `<p>正在載入 ${symbol} 資料...</p>`;
  fetch(\`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=\${symbol}&apikey=\${apikey}\`)
    .then(res => res.json())
    .then(data => {
      const quote = data["Global Quote"];
      if (!quote) {
        content.innerHTML = \`<p class="text-red-600">❗️ 無法取得 \${symbol} 的資料</p>\`;
        return;
      }
      const price = quote["05. price"];
      content.innerHTML = \`<p>\${symbol} 即時價格：$\${parseFloat(price).toFixed(2)}</p>\`;
    }).catch(() => {
      content.innerHTML = \`<p class='text-red-600'>❗️ 載入錯誤</p>\`;
    });
}

function loadMarquee(apikey) {
  const box = document.getElementById('marquee');
  const symbols = ['2330.TW', '2317.TW', 'AAPL', 'MSFT'];
  const promises = symbols.map(sym =>
    fetch(\`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=\${sym}&apikey=\${apikey}\`)
      .then(res => res.json())
      .then(data => {
        const quote = data["Global Quote"];
        const price = quote?.["05. price"];
        const change = quote?.["10. change percent"];
        return \`\${sym}: $\${parseFloat(price).toFixed(2)} (\${change})\`;
      }).catch(() => \`\${sym}: N/A\`)
  );
  Promise.all(promises).then(results => {
    box.textContent = results.join('  |  ');
  });
}

function loadHotRecommendations(apikey) {
  const section = document.getElementById('recommend');
  let content = '<h2 class="text-xl font-bold mb-2">🔥 熱門推薦</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
  const hot = [...stockSymbols.Taiwan.slice(0,3), stockSymbols.US[0]];
  hot.forEach(stock => {
    content += `
    <div class="bg-white p-4 rounded shadow">
      <h3 class="font-bold text-lg">${stock.symbol} ${stock.name}</h3>
      <p>📌 理由：${stock.reason}</p>
      <button onclick="toggleWatch('${stock.symbol}')" class="mt-2 px-2 py-1 border rounded bg-yellow-200">${getWatchlist().includes(stock.symbol) ? "💔 移除自選" : "⭐ 加入自選"}</button>
    </div>`;
  });
  content += '</div>';
  section.innerHTML = content;
}

function loadLongTermRecommendations(apikey) {
  const section = document.getElementById('longterm');
  let content = '<h2 class="text-xl font-bold mb-2">⏳ 長期投資</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
  const longTerm = ['2330.TW','2412.TW','MSFT','JNJ'];
  longTerm.forEach(sym => {
    content += `
    <div class="bg-white p-4 rounded shadow">
      <h3 class="font-bold text-lg">${sym}</h3>
      <p>穩健型長期推薦</p>
      <button onclick="toggleWatch('${sym}')" class="mt-2 px-2 py-1 border rounded bg-yellow-200">${getWatchlist().includes(sym) ? "💔 移除自選" : "⭐ 加入自選"}</button>
    </div>`;
  });
  content += '</div>';
  section.innerHTML = content;
}

function loadMarketOverview(apikey) {
  const section = document.getElementById('market');
  let content = '<h2 class="text-xl font-bold mb-2">🌍 市場概況</h2><div class="bg-white p-4 rounded shadow">';
  const indices = [
    {symbol:'^TWII', name:'台灣加權指數'},
    {symbol:'^IXIC', name:'NASDAQ'},
    {symbol:'^GSPC', name:'S&P 500'}
  ];
  indices.forEach(idx => {
    content += `<div id="idx-${idx.symbol}">${idx.name}: 載入中...</div>`;
    fetch(\`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=\${idx.symbol}&apikey=\${apikey}\`)
      .then(res => res.json())
      .then(data => {
        const quote = data["Global Quote"];
        const price = quote["05. price"];
        document.getElementById(\`idx-\${idx.symbol}\`).textContent = \`\${idx.name}: $\${parseFloat(price).toFixed(2)}\`;
      }).catch(()=>{});
  });
  content += '</div>';
  section.innerHTML = content;
}

function loadAIRecommendation() {
  fetch(API_JSON_URL)
    .then(res => res.json())
    .then(data => {
      const section = document.getElementById('ai-recommend');
      let content = '<h2 class="text-xl font-bold mb-2">🤖 AI 智能推薦</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
      data.forEach(stock => {
        content += `
        <div class="bg-white p-4 rounded shadow">
          <h3 class="font-bold text-lg">${stock.symbol} - ${stock.name}</h3>
          <p>📈 評分：${stock.score}/10</p>
          <p>📣 原因：${stock.reason}</p>
          <p>💰 進場價：$${stock.buy}</p>
          <p>🏁 出場價：$${stock.sell}</p>
          <button onclick="toggleWatch('${stock.symbol}')" class="mt-2 px-2 py-1 border rounded bg-yellow-200">${getWatchlist().includes(stock.symbol) ? "💔 移除自選" : "⭐ 加入自選"}</button>
        </div>`;
      });
      content += '</div>';
      section.innerHTML = content;
    });
}

function getWatchlist() {
  const list = localStorage.getItem("watchlist");
  return list ? JSON.parse(list) : [];
}

function toggleWatch(symbol) {
  let list = getWatchlist();
  if (list.includes(symbol)) {
    list = list.filter(s => s !== symbol);
  } else {
    list.push(symbol);
  }
  localStorage.setItem("watchlist", JSON.stringify(list));
  loadHotRecommendations();
  loadLongTermRecommendations();
  loadAIRecommendation();
  loadWatchlist();
}

function loadWatchlist() {
  const list = getWatchlist();
  const section = document.getElementById('watchlist');
  if (!list.length) {
    section.innerHTML = "";
    return;
  }
  let content = '<h2 class="text-xl font-bold mb-2">⭐ 我的自選推薦</h2><ul class="list-disc pl-5">';
  list.forEach(symbol => {
    content += `<li class="mb-1">${symbol}</li>`;
  });
  content += "</ul>";
  section.innerHTML = content;
}

window.addEventListener("DOMContentLoaded", initPage);