const platformBg = {
    binance: "assets/binance-bg.png",
    mexc: "assets/mexc-bg.png",
    bybit: "assets/bybit-bg.png",
};

document.getElementById("tradeForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const platform = document.getElementById("platform").value;
    const position = document.getElementById("position").value;
    const leverage = parseFloat(document.getElementById("leverage").value);
    const pair = document.getElementById("pair").value;
    const entry = parseFloat(document.getElementById("entry").value);
    const last = parseFloat(document.getElementById("last").value);
    const rawTimestamp = document.getElementById("timestamp").value;

    const date = new Date(rawTimestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}`;

    let pnl = ((last - entry) / entry) * 100 * leverage;
    if (position === "Short") pnl *= -1;

    const formattedEntry = entry.toFixed(3);
    const formattedLast = last.toFixed(3);
    const formattedPnL = (pnl >= 0 ? "+" : "") + pnl.toFixed(2);

    const previewHTML = `
      <div id="card" class="screenshot-card ${platform}" style="background-image: url('${
        platformBg[platform]
    }');">
        <div class="position-line">
          <span class="position-type ${position.toLowerCase()}">${position}</span>
          <span class="leverage">${leverage}X</span>
          <span class="pair">${pair} Perpetual</span>
        </div>
        <div class="pnl ${
            pnl >= 0 ? "positive" : "negative"
        }">${formattedPnL}%</div>
        <div class="entry"><span class="value">${formattedEntry}</span></div>
        <div class="last"><span class="value">${formattedLast}</span></div>
        <div class="timestamp">${timestamp}</div>
        <div class="watermark-overlay">FAKETRADESHOT.XYZ</div>
      </div>
    `;

    document.getElementById("preview").innerHTML = previewHTML;
    document.getElementById("downloadBtn").style.display = "block";
});

document.getElementById("downloadBtn").addEventListener("click", function () {
    const card = document.getElementById("card");

    html2canvas(card, {
        useCORS: true,
        backgroundColor: null,
    }).then((canvas) => {
        const link = document.createElement("a");
        link.download = "fake-trade.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
});
