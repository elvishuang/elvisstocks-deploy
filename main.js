const API_JSON_URL = "ai.json";
let notified = {};

function init() {
  const apikey = localStorage.getItem("AV_API_KEY");
  const scoreMin = localStorage.getItem("scoreMin") || 7;
  document.getElementById("score-filter").value = scoreMin;

  if (apikey) {
    document.getElementById("api-key-input").style.display = "none";
    loadAll(apikey);
  }

  document.getElementById("search-symbol").addEventListener("keypress", e => {
    if (e.key === "Enter") {
      const symbol = e.target.value.trim().toUpperCase();
      if (symbol) {
        renderChart(symbol);
        loadStockData(apikey, symbol);
      }
    }
  });

  document.getElementById("score-filter").addEventListener("input", e => {
    const val = parseFloat(e.target.value) || 0;
    localStorage.setItem("scoreMin", val);
    loadAIRecommendation(apikey);
  });

  loadWatchlist();
}

function saveApiKey() {
  const key = document.getElementById("apikey").value;
  if (key) {
    localStorage.setItem("AV_API_KEY", key);
    document.getElementById("api-key-input").style.display = "none";
    loadAll(key);
  }
}

function loadAll(apikey) {
  loadAIRecommendation(apikey);
  renderChart("2330.TW");
  loadStockData(apikey, "2330.TW");
}

function renderChart(symbol) {
  const chart = document.getElementById("chart");
  chart.innerHTML = `<iframe src="https://www.tradingview.com/embed-widget/advanced-chart/?symbol=${symbol}&theme=light"
    style="width:100%; height:400px;" frameborder="0"></iframe>`;
}

function loadStockData(apikey, symbol) {
  const content = document.getElementById("content");
  content.textContent = "正在讀取即時股價...";
  fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apikey}`)
    .then(res => res.json())
    .then(data => {
      const quote = data["Global Quote"];
      if (!quote) {
        content.innerHTML = `<p class="text-red-600">❗️ 無法取得 ${symbol} 資料</p>`;
        return;
      }
      content.innerHTML = `<p>${symbol} 現價：$${parseFloat(quote["05. price"]).toFixed(2)}</p>`;
    })
    .catch(() => {
      content.innerHTML = "<p class='text-red-600'>❗️ 載入錯誤</p>";
    });
}

function loadAIRecommendation(apikey) {
  const scoreMin = parseFloat(localStorage.getItem("scoreMin") || 7);
  fetch(API_JSON_URL)
    .then(res => res.json())
    .then(data => {
      const section = document.getElementById("ai-recommend");
      let content = '<h2 class="text-xl font-bold mb-2">🤖 AI 智能推薦清單</h2>';
      content += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';

      const filtered = data.filter(stock => stock.score >= scoreMin);
      const watchedList = getWatchlist();

      filtered.forEach((stock, idx) => {
        const watched = watchedList.includes(stock.symbol);
        const chartId = `chart-${idx}`;

        content += `
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

      content += '</div>';
      section.innerHTML = content;

      if (apikey) pollPrices(apikey, filtered);
    });
}

function renderChipChart(stock, canvasId) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  const labels = ["-4", "-3", "-2", "-1", "今日"];
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "外資",
          data: stock.chip.foreign,
          backgroundColor: "rgba(54, 162, 235, 0.7)"
        },
        {
          label: "投信",
          data: stock.chip.investment,
          backgroundColor: "rgba(75, 192, 192, 0.7)"
        },
        {
          label: "自營商",
          data: stock.chip.dealer,
          backgroundColor: "rgba(255, 159, 64, 0.7)"
        }
      ]
    },
    options: {
      plugins: {
        legend: { position: "top" }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
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
  loadAIRecommendation(localStorage.getItem("AV_API_KEY"));
  loadWatchlist();
}

function loadWatchlist() {
  const list = getWatchlist();
  const section = document.getElementById("watchlist");
  if (!list.length) {
    section.innerHTML = "";
    return;
  }
  let content = '<h2 class="text-xl font-bold mb-2">⭐ 我的自選推薦</h2>';
  content += "<ul class='list-disc pl-5'>";
  list.forEach(symbol => {
    content += `<li>${symbol}</li>`;
  });
  content += "</ul>";
  section.innerHTML = content;
}

function pollPrices(apikey, aiList) {
  const watch = getWatchlist();
  const tracked = aiList.filter(s => watch.includes(s.symbol));
  tracked.forEach(stock => {
    fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stock.symbol}&apikey=${apikey}`)
      .then(res => res.json())
      .then(data => {
        const price = parseFloat(data["Global Quote"]?.["05. price"]);
        if (!price || notified[stock.symbol]) return;
        if (price >= stock.buy) {
          showToast(`📣 ${stock.symbol} 已突破進場價 $${stock.buy}，現價 $${price.toFixed(2)}`);
          notified[stock.symbol] = true;
        }
      });
  });
  setTimeout(() => pollPrices(apikey, aiList), 60000);
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 8000);
}

window.addEventListener("DOMContentLoaded", init);
