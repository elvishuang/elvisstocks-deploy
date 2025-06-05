function initPage() {
  const apikey = localStorage.getItem('AV_API_KEY');
  if (apikey) {
    document.getElementById('api-key-input').style.display = 'none';
    loadStockData(apikey);
  }
}

function saveApiKey() {
  const key = document.getElementById('apikey').value;
  if (key) {
    localStorage.setItem('AV_API_KEY', key);
    document.getElementById('api-key-input').style.display = 'none';
    loadStockData(key);
  }
}

function loadStockData(apikey) {
  const content = document.getElementById('content');
  content.innerHTML = "<p>正在載入股票資料...</p>";
  fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=MSFT&apikey=${apikey}`)
    .then(res => res.json())
    .then(data => {
      if (data["Time Series (Daily)"]) {
        const latestDate = Object.keys(data["Time Series (Daily)"])[0];
        const price = data["Time Series (Daily)"][latestDate]["4. close"];
        content.innerHTML = `<p>MSFT 最新收盤價（${latestDate}）：$${price}</p>`;
      } else {
        content.innerHTML = "<p>讀取資料失敗，請確認 API 金鑰是否正確</p>";
      }
    })
    .catch(() => {
      content.innerHTML = "<p>資料載入錯誤，請稍後再試。</p>";
    });
}

window.addEventListener('DOMContentLoaded', initPage);