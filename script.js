const DEBUG_MODE = false;

const platformBg = {
    binance: "assets/binance-bg.png",
    mexc: "assets/mexc-bg.png",
    bybit: "assets/bybit-bg.png",
};

const downloadBtn = document.getElementById("downloadBtn");
const paymentModal = document.getElementById("paymentModal");
const paidBtn = document.getElementById("paidBtn");
const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");

let lastCanvas = null; // canvas sem watermark para download

function generatePreview(withWatermark = true) {
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
    if (position.toLowerCase() === "short") pnl *= -1;

    const formattedEntry = entry.toFixed(3);
    const formattedLast = last.toFixed(3);
    const formattedPnL = (pnl >= 0 ? "+" : "") + pnl.toFixed(2);

    if (withWatermark) {
        const watermarkHtml = `<div class="watermark-overlay">FAKETRADESHOT.XYZ</div>`;

        const previewHTML = `
            <div id="card" class="screenshot-card ${platform}">
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
              ${watermarkHtml}
            </div>
        `;

        document.getElementById(
            "preview"
        ).innerHTML = `<div class="preview-wrapper">${previewHTML}</div>`;
    } else {
        const cleanCard = document.createElement("div");
        cleanCard.className = `screenshot-card ${platform}`;
        cleanCard.style.backgroundImage = `url('${platformBg[platform]}')`;
        cleanCard.style.width = "1160px";
        cleanCard.style.height = "652px";
        cleanCard.style.position = "absolute";
        cleanCard.style.left = "-9999px";
        cleanCard.style.top = "0";

        cleanCard.innerHTML = `
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
        `;

        document.body.appendChild(cleanCard);

        html2canvas(cleanCard, {
            useCORS: true,
            backgroundColor: null,
            width: 1160,
            height: 652,
            scale: 1,
        }).then((canvas) => {
            lastCanvas = canvas;
            document.body.removeChild(cleanCard);
        });
    }

    downloadBtn.style.display = "block";
}

if (DEBUG_MODE) {
    document.getElementById("platform").value = "binance";
    document.getElementById("position").value = "Long";
    document.getElementById("leverage").value = 100;
    document.getElementById("pair").value = "SOLUSDT";
    document.getElementById("entry").value = 103.25;
    document.getElementById("last").value = 120.745;
    document.getElementById("timestamp").value = "2025-06-22T14:45";

    generatePreview(true);
    generatePreview(false);
}

document.getElementById("tradeForm").addEventListener("submit", function (e) {
    e.preventDefault();
    generatePreview(true); // atualiza preview visível com watermark
    generatePreview(false); // atualiza canvas invisível para download sem watermark
});

downloadBtn.addEventListener("click", () => {
    paymentModal.style.display = "flex";
});

function copyWallet() {
    const wallet = document.getElementById("receiverWallet").textContent.trim();
    navigator.clipboard
        .writeText(wallet)
        .then(() => {
            alert("Wallet address copied to clipboard!");
        })
        .catch(() => {
            alert("Failed to copy wallet address.");
        });
}

paidBtn.addEventListener("click", async () => {
    if (!lastCanvas) {
        alert("Please generate the preview first.");
        return;
    }

    const payerPublicKey = prompt(
        "Please enter your Solana wallet address used for payment:"
    );

    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

    if (!payerPublicKey) {
        alert("Wallet address is required.");
        return;
    }

    if (!base58Regex.test(payerPublicKey)) {
        alert("Invalid Solana address format.");
        return;
    }

    try {
        const response = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payerPublicKey }),
        });
        const data = await response.json();

        if (data.success) {
            alert("Payment confirmed! Download will start now.");
            paymentModal.style.display = "none";
            const link = document.createElement("a");
            link.download = "fake-trade-no-watermark.png";
            link.href = lastCanvas.toDataURL("image/png");
            link.click();
        } else {
            alert(
                "Payment not found yet. Please wait a few minutes and try again."
            );
        }
    } catch (err) {
        alert("Error verifying payment. Please try again later.");
        console.error(err);
    }
});

async function loadReceiverWallet() {
    try {
        const response = await fetch("/api/get-wallet");
        const data = await response.json();
        if (data.wallet) {
            const walletEl = document.getElementById("receiverWallet");
            if (walletEl) {
                walletEl.textContent = data.wallet;
            }
        }
    } catch (e) {
        console.error("Failed to load wallet address:", e);
    }
}

cancelPaymentBtn.addEventListener("click", () => {
    paymentModal.style.display = "none";
});

window.onload = () => {
    loadReceiverWallet();
};
