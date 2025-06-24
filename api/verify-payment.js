import { PublicKey } from "@solana/web3.js";

const RECEIVER_WALLET = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const REQUIRED_AMOUNT = 0.99;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const MAX_PAYMENT_AGE_MS = 10 * 60 * 1000; // aumentar p/ 10 minutos só para debug

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
                    const signature = tx.signature;
                    const timestampRaw = tx.timestamp;
                    const blockTimeRaw = tx.blockTime;

                    const txTime =
                        typeof timestampRaw === "number"
                            ? timestampRaw * 1000
                            : blockTimeRaw
                            ? blockTimeRaw * 1000
                            : 0;

                    const ageMs = now - txTime;

                    console.log(
                        `🧠 [${signature}] tx.timestamp = ${timestampRaw}, tx.blockTime = ${blockTimeRaw}`
                    );
                    console.log(
                        `⏱️ txTime = ${txTime}, now = ${now}, ageMs = ${ageMs}`
                    );

                    if (txTime === 0) {
                        console.warn(
                            `⚠️ Skipping tx with no timestamp or blockTime`
                        );
                        continue;
                    }

                    if (ageMs <= MAX_PAYMENT_AGE_MS) {
                        console.log(
                            "✅ Payment is recent enough, success:",
                            signature
                        );
                        return res.status(200).json({
                            success: true,
                            signature,
                        });
                    } else {
                        console.warn(
                            "⚠️ Payment found, but too old:",
                            signature
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
