export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res
            .status(405)
            .json({ success: false, error: "Method Not Allowed" });
    }

    const { senderAddress } = req.body;
    console.log("🔔 verify-payment called. senderAddress:", senderAddress);

    if (!senderAddress) {
        return res
            .status(400)
            .json({ success: false, error: "Missing senderAddress" });
    }

    const HELIUS_API_KEY = "de8a1ffd-8910-4f4b-a6e1-b8d1778296ea";
    const RECEIVER = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
    const USDC_MINT = "Es9vMFrzaCERJJk5f6ehdE8S7s8Z2RyAwqu7gTgnf2K";
    const REQUIRED_AMOUNT = 0.99;

    try {
        const url = `https://api.helius.xyz/v0/addresses/${RECEIVER}/transactions?api-key=${HELIUS_API_KEY}&type=TRANSFER`;

        const response = await fetch(url);
        const transactions = await response.json();

        console.log(
            "📦 Total TRANSFER transactions found:",
            transactions.length
        );

        for (const tx of transactions) {
            const transfers = tx.tokenTransfers || [];

            for (const transfer of transfers) {
                if (
                    transfer.fromUserAccount === senderAddress &&
                    transfer.toUserAccount === RECEIVER &&
                    transfer.mint === USDC_MINT &&
                    parseFloat(transfer.tokenAmount) >= REQUIRED_AMOUNT
                ) {
                    console.log("✅ Pagamento confirmado:", tx.signature);
                    return res
                        .status(200)
                        .json({ success: true, signature: tx.signature });
                }
            }
        }

        console.log("🚫 Nenhum pagamento válido encontrado.");
        return res.status(200).json({ success: false });
    } catch (error) {
        console.error("❌ Erro ao verificar pagamento:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal Server Error" });
    }
}
