import { PublicKey } from "@solana/web3.js";

const RECEIVER_WALLET = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const REQUIRED_AMOUNT = 0.99;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const MAX_PAYMENT_AGE_MS = 5 * 60 * 1000; // 5 minutos

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res
            .status(405)
            .json({ success: false, error: "Method Not Allowed" });
    }

    const { payerPublicKey } = req.body;

    if (!payerPublicKey || typeof payerPublicKey !== "string") {
        return res.status(400).json({
            success: false,
            error: "Missing or invalid payerPublicKey.",
        });
    }

    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Regex.test(payerPublicKey)) {
        return res.status(400).json({
            success: false,
            error: "Invalid wallet address format.",
        });
    }

    try {
        new PublicKey(payerPublicKey);
    } catch {
        return res.status(400).json({
            success: false,
            error: "Invalid Solana public key.",
        });
    }

    console.log("🔔 verify-payment called. payerPublicKey:", payerPublicKey);

    try {
        const heliusUrl = `https://api.helius.xyz/v0/addresses/${payerPublicKey}/transactions?api-key=${HELIUS_API_KEY}`;
        const response = await fetch(heliusUrl);

        if (!response.ok) {
            console.error(
                "❌ Helius API responded with status:",
                response.status
            );
            return res.status(502).json({
                success: false,
                error: "Failed to fetch transactions from Helius.",
            });
        }

        const transactions = await response.json();
        console.log(`📦 Found ${transactions.length} transactions for payer`);

        const now = Date.now();

        for (const tx of transactions) {
            const transfers = tx.tokenTransfers || [];

            for (const t of transfers) {
                if (
                    t.fromUserAccount === payerPublicKey &&
                    t.toUserAccount === RECEIVER_WALLET &&
                    t.mint === USDC_MINT &&
                    parseFloat(t.tokenAmount) >= REQUIRED_AMOUNT
                ) {
                    // Obter timestamp robusto
                    let txTime = 0;
                    if (tx.timestamp) {
                        txTime = new Date(tx.timestamp).getTime();
                    } else if (tx.blockTime) {
                        txTime = tx.blockTime * 1000; // blockTime vem em segundos
                    } else {
                        console.warn(
                            "⚠️ Transaction has no timestamp or blockTime, skipping"
                        );
                        continue;
                    }

                    const age = now - txTime;
                    console.log(
                        "⏱️ txTime:",
                        txTime,
                        "| now:",
                        now,
                        "| age (ms):",
                        age
                    );

                    if (age <= MAX_PAYMENT_AGE_MS) {
                        console.log(
                            "✅ Valid USDC payment found:",
                            tx.signature
                        );
                        return res.status(200).json({
                            success: true,
                            signature: tx.signature,
                        });
                    } else {
                        console.warn(
                            "⚠️ Payment found, but too old:",
                            tx.signature
                        );
                    }
                }
            }
        }

        console.log("🚫 No valid USDC payment found");
        return res.status(200).json({ success: false });
    } catch (err) {
        console.error("❌ Error verifying payment:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
}
