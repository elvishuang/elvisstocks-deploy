const API_JSON_URL = "ai.json";
let notified = {};

function init() {
  const apikey = localStorage.getItem("AV_API_KEY");
  const scoreMin = localStorage.getItem("scoreMin") || 7;
  document.getElementById("score-filter").value = scoreMin;

  if (apikey) {
    document.getElementById("api-key-input").style.display = "none";
    loadAll();
  }

  document.getElementById("search-symbol").addEventListener("keypress", e => {
    if (e.key === "Enter") {
      const symbol = e.target.value.trim().toUpperCase();
      if (symbol) {
        renderChart(symbol);
        loadStockData(symbol);
      }
    }
  });

  document.getElementById("score-filter").addEventListener("input", e => {
    const val = parseFloat(e.target.value) || 0;
    localStorage.setItem("scoreMin", val);
    loadAIRecommendation();
  });

  loadWatchlist();
  loadMarketSummary();
}

function saveApiKey() {
  const key = document.getElementById("apikey").value;
  if (key) {
    localStorage.setItem("AV_API_KEY", key);
    document.getElementById("api-key-input").style.display = "none";
    loadAll();
  }
}

function loadAll() {
  loadAIRecommendation();
  renderChart("2330.TW");
  loadStockData("2330.TW");
}

function renderChart(symbol) {
  document.getElementById("chart").innerHTML = `<iframe src="https://www.tradingview.com/embed-widget/advanced-chart/?symbol=${symbol}&theme=light"
    style="width:100%; height:400px;" frameborder="0"></iframe>`;
}

function loadStockData(symbol) {
  const content = document.getElementById("content");
  content.textContent = "正在讀取即時股價...";

  const url = symbol.endsWith(".TW")
    ? `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`
    : `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${localStorage.getItem("AV_API_KEY")}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      let price = null;
      if (symbol.endsWith(".TW")) {
        price = data.quoteResponse?.result?.[0]?.regularMarketPrice;
      } else {
        price = parseFloat(data["Global Quote"]?.["05. price"]);
      }
      if (!price) {
        content.innerHTML = `<p class="text-red-600">❗️ 無法取得 ${symbol} 價格資料</p>`;
      } else {
        content.innerHTML = `<p>${symbol} 現價：$${price.toFixed(2)}</p>`;
      }
    })
    .catch(() => {
      content.innerHTML = "<p class='text-red-600'>❗️ 價格讀取錯誤</p>";
    });
}

function loadAIRecommendation() {
  const scoreMin = parseFloat(localStorage.getItem("scoreMin") || 7);
  fetch(API_JSON_URL)
    .then(res => res.json())
    .then(data => {
      const filtered = data.filter(stock => stock.score >= scoreMin);
      const watchedList = getWatchlist();
      const hotList = filtered.filter(stock => stock.tag === "hot");
      const longtermList = filtered.filter(stock => stock.tag === "longterm");
      const normalList = filtered.filter(stock => !stock.tag);

      renderSection("hot-recommend", "🔥 熱門推薦", hotList, watchedList);
      renderSection("longterm-recommend", "📈 長期投資", longtermList, watchedList);
      renderSection("ai-recommend", "🤖 其他推薦", normalList, watchedList);

      pollPrices(filtered);
    });
}

function renderSection(containerId, title, list, watchedList) {
  const container = document.getElementById(containerId);
  if (!list.length) {
    container.innerHTML = "";
    return;
  }
  let html = `<h2 class="text-xl font-bold mb-2">${title}</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;
  list.forEach((stock, idx) => {
    const watched = watchedList.includes(stock.symbol);
    const chartId = `${containerId}-chart-${idx}`;
    html += `
      <div class="bg-white rounded shadow p-4">
        <h3 class="font-bold text-lg">${stock.symbol} - ${stock.name}</h3>
        <p>📈 評分：${stock.score}/10</p>
        <p>📣 原因：${stock.reason}</p>
        <p>💰 進場價：$${stock.buy}</p>
        <p>🏁 出場價：$${stock.sell}</p>
        <ul class="list-disc list-inside text-sm text-gray-700 my-2">
          ${stock.details.map(d => `<li>${d}</li>`).join("")}
        </ul>
        <canvas id="${chartId}" width="400" height="200" class="my-3"></canvas>
        <button onclick="toggleWatch('${stock.symbol}')" class="mt-2 px-3 py-1 bg-yellow-200 border rounded font-semibold">
          ${watched ? "💔 取消收藏" : "⭐ 加入收藏"}
        </button>
      </div>`;
    setTimeout(() => renderChipChart(stock, chartId), 100);
  });
  html += "</div>";
  container.innerHTML = html;
}

function renderChipChart(stock, canvasId) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["-4","-3","-2","-1","今日"],
      datasets: [
        { label:"外資", data:stock.chip.foreign, backgroundColor:"rgba(54,162,235,0.7)" },
        { label:"投信", data:stock.chip.investment, backgroundColor:"rgba(75,192,192,0.7)" },
        { label:"自營商", data:stock.chip.dealer, backgroundColor:"rgba(255,159,64,0.7)" }
      ]
    },
    options:{
      plugins: { legend:{position:"top"} }, scales:{ y:{beginAtZero:true} }
    }
  });
}

function getWatchlist() {
  const list = localStorage.getItem("watchlist");
  return list ? JSON.parse(list) : [];
}

function toggleWatch(symbol) {
  let list = getWatchlist();
  if (list.includes(symbol)) { list = list.filter(s=>s!==symbol); }
  else { list.push(symbol); }
  localStorage.setItem("watchlist", JSON.stringify(list));
  loadAIRecommendation();
  loadWatchlist();
}

function loadWatchlist() {
  const list = getWatchlist();
  const section = document.getElementById("watchlist");
  if (!list.length) { section.innerHTML=""; return; }
  let content = '<h2 class="text-xl font-bold mb-2">⭐ 我的自選推薦</h2><ul class="list-disc pl-5">';
  list.forEach(s=>content+=`<li>${s}</li>`);
  content+="</ul>";
  section.innerHTML = content;
}

function pollPrices(aiList) {
  const watch = getWatchlist();
  const tracked = aiList.filter(s=>watch.includes(s.symbol));
  tracked.forEach(stock=>{
    const url = stock.symbol.endsWith(".TW")
      ? `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${stock.symbol}`
      : `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stock.symbol}&apikey=${localStorage.getItem("AV_API_KEY")}`;
    fetch(url).then(res=>res.json()).then(data=>{
      let price = stock.symbol.endsWith(".TW")
        ? data.quoteResponse?.result?.[0]?.regularMarketPrice
        : parseFloat(data["Global Quote"]?.["05. price"]);
      if (!price||notified[stock.symbol]) return;
      if (price>=stock.buy) {
        showToast(`📣 ${stock.symbol} 已突破進場價 $${stock.buy}，現價 $${price.toFixed(2)}`);
        notified[stock.symbol]=true;
      }
    });
  });
  setTimeout(()=>pollPrices(aiList),60000);
}

function showToast(msg) {
  const toast=document.getElementById("toast");
  toast.textContent=msg; toast.classList.remove("hidden");
  setTimeout(()=>toast.classList.add("hidden"),8000);
}

function loadMarketSummary() {
  const summary=document.getElementById("market-data");
  const symbols="^TWII,^IXIC,^GSPC";
  const url=`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
  fetch(url).then(res=>res.json()).then(data=>{
    let html="<div class='grid grid-cols-1 md:grid-cols-3 gap-4'>";
    data.quoteResponse.result.forEach(item=>{
      const chg=item.regularMarketChange?.toFixed(2), pct=item.regularMarketChangePercent?.toFixed(2), up=chg>=0;
      html+=`
        <div class="p-3 bg-gray-50 border rounded shadow">
          <div class="font-bold">${item.shortName||item.symbol}</div>
          <div class="${up?'text-green-600':'text-red-600'} font-semibold">
            ${item.regularMarketPrice?.toFixed(2)} (${chg}/${pct}%)
          </div>
        </div>`;
    });
    html+="</div>";
    summary.innerHTML=html;
  }).catch(()=>{
    summary.innerHTML="<p class='text-red-600'>無法載入市場資料</p>";
  });
}

window.addEventListener("DOMContentLoaded", init);