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
    const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const REQUIRED_AMOUNT = 0.99;

    try {
        const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
        const body = {
            jsonrpc: "2.0",
            id: "search-transactions",
            method: "searchTransactions",
            params: {
                account: RECEIVER,
                query: {
                    rawTransaction: {
                        tokenTransfers: {
                            toUserAccount: RECEIVER,
                            fromUserAccount: senderAddress,
                            mint: USDC_MINT,
                        },
                    },
                },
                limit: 20,
            },
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const json = await response.json();
        const transactions = json.result || [];

        console.log(
            "📦 Total matching transactions found:",
            transactions.length
        );

        for (const tx of transactions) {
            const transfers = tx.tokenTransfers || [];
            for (const transfer of transfers) {
                console.log("🔍 Checking transfer:", transfer);
                if (
                    transfer.toUserAccount === RECEIVER &&
                    transfer.fromUserAccount === senderAddress &&
                    transfer.mint === USDC_MINT &&
                    parseFloat(transfer.tokenAmount) >= REQUIRED_AMOUNT
                ) {
                    console.log("✅ Pagamento confirmado:", transfer.signature);
                    return res
                        .status(200)
                        .json({ success: true, signature: transfer.signature });
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
