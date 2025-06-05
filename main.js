function initPage() {
  const apikey = localStorage.getItem('AV_API_KEY');
  if (apikey) {
    document.getElementById('api-key-input').style.display = 'none';
    loadAll(apikey);
  }
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
  loadHotRecommendations();
  loadLongTerm();
  loadMarketOverview();
  loadStockData(apikey);
}

function loadStockData(apikey) {
  const content = document.getElementById('content');
  content.innerHTML = "<p>正在載入股票資料...</p>";
  fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=MSFT&apikey=${apikey}`)
    .then(res => res.json())
    .then(data => {
      if (!data["Time Series (Daily)"]) {
        content.innerHTML = `<p class="text-red-600">❗️ 資料讀取失敗。請檢查 API 金鑰是否正確、是否超出流量限制，或稍後再試。</p>`;
        console.error("API response:", data); // 除錯用
        return;
      }
      const latestDate = Object.keys(data["Time Series (Daily)"])[0];
      const price = data["Time Series (Daily)"][latestDate]["4. close"];
      content.innerHTML = `<p>MSFT 最新收盤價（${latestDate}）：$${price}</p>`;
    })
    .catch(() => {
      content.innerHTML = "<p class='text-red-600'>❗️ 資料載入錯誤，請稍後再試。</p>";
    });
}

function loadHotRecommendations() {
  const section = document.getElementById('recommend');
  let content = '<h2 class="text-xl font-bold mb-2">🔥 熱門推薦</h2><div class="grid grid-cols-2 md:grid-cols-3 gap-4">';
  const stocks = ['TSMC', 'AAPL', 'NVDA'];
  stocks.forEach(s => {
    content += `
    <div class="bg-white p-4 rounded shadow">
      <h3 class="font-bold">${s}</h3>
      <p>評價：極佳</p>
      <p>理由：技術面與籌碼面同步轉強</p>
    </div>`;
  });
  content += '</div>';
  section.innerHTML = content;
}

function loadLongTerm() {
  const section = document.getElementById('longterm');
  let content = '<h2 class="text-xl font-bold mb-2">⏳ 長期投資</h2><div class="grid grid-cols-2 md:grid-cols-3 gap-4">';
  const stocks = ['BRK.B', 'VTI', 'VOO'];
  stocks.forEach(s => {
    content += `
    <div class="bg-white p-4 rounded shadow">
      <h3 class="font-bold">${s}</h3>
      <p>穩健成長型資產</p>
    </div>`;
  });
  content += '</div>';
  section.innerHTML = content;
}

function loadMarketOverview() {
  const section = document.getElementById('market');
  section.innerHTML = `
    <h2 class="text-xl font-bold mb-2">🌍 市場概況</h2>
    <div class="bg-white p-4 rounded shadow">
      <p>目前市場情緒：偏多</p>
      <p>成交量：增加</p>
    </div>`;
}

function loadMarquee(apikey) {
  const box = document.getElementById('marquee');
  const symbols = ['MSFT', 'AAPL', 'TSLA'];
  const promises = symbols.map(sym =>
    fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${apikey}`)
      .then(res => res.json())
      .then(data => {
        const quote = data["Global Quote"];
        const price = quote?.["05. price"];
        return `${sym}: $${price}`;
      }).catch(() => `${sym}: N/A`)
  );
  Promise.all(promises).then(results => {
    box.textContent = results.join('  |  ');
  });
}

window.addEventListener('DOMContentLoaded', initPage);