import { Connection, PublicKey } from "@solana/web3.js";

const HELIUS_API_KEY = "de8a1ffd-8910-4f4b-a6e1-b8d1778296ea";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const RECEIVER_WALLET = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
const REQUIRED_AMOUNT = 0.99;

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res
            .status(405)
            .json({ success: false, error: "Method Not Allowed" });
    }

    const { payerPublicKey } = req.body;
    if (!payerPublicKey) {
        return res
            .status(400)
            .json({ success: false, error: "Missing payerPublicKey" });
    }

    console.log("🔔 verify-payment called. payerPublicKey:", payerPublicKey);

    try {
        const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

        const body = {
            jsonrpc: "2.0",
            id: "fetch-transactions",
            method: "getTransactions",
            params: {
                account: RECEIVER_WALLET,
                limit: 25,
            },
        };

        const response = await fetch(heliusUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const json = await response.json();
        const transactions = json.result || [];

        console.log("📦 Found transactions:", transactions.length);

        for (const tx of transactions) {
            const transfers = tx.tokenTransfers || [];
            for (const t of transfers) {
                const isMatch =
                    t.toUserAccount === RECEIVER_WALLET &&
                    t.fromUserAccount === payerPublicKey &&
                    t.mint === USDC_MINT &&
                    parseFloat(t.tokenAmount) >= REQUIRED_AMOUNT;

                if (isMatch) {
                    console.log("✅ Payment confirmed. Tx:", t.signature);
                    return res
                        .status(200)
                        .json({ success: true, signature: t.signature });
                }
            }
        }

        console.log("🚫 No matching USDC payment found.");
        return res.status(200).json({ success: false });
    } catch (err) {
        console.error("❌ Error verifying payment:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal Server Error" });
    }
}
