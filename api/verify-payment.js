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

    const HELIUS_API_KEY = "de8a1ffd-8910-4f4b-a6e1-b8d1778296ea";
    const RECEIVER = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
    const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const REQUIRED_AMOUNT = 0.99;

    try {
        const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
        const body = {
            jsonrpc: "2.0",
            id: "tokenTransfers",
            method: "getTokenTransfersByWallet",
            params: {
                wallet: RECEIVER,
                mint: USDC_MINT,
                limit: 20,
            },
        };

        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const json = await resp.json();
        const transfers = json.result || [];

        console.log("📦 Total TRANSFERS found:", transfers.length);

        for (const t of transfers) {
            console.log("🔍 Checking transfer:", t);
            if (
                t.fromUserAccount === payerPublicKey &&
                t.toUserAccount === RECEIVER &&
                parseFloat(t.tokenAmount) >= REQUIRED_AMOUNT
            ) {
                console.log("✅ Payment confirmed:", t.signature);
                return res
                    .status(200)
                    .json({ success: true, signature: t.signature });
            }
        }

        console.log("🚫 No valid USDC payment found");
        return res.status(200).json({ success: false });
    } catch (err) {
        console.error("❌ Error verifying payment:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal Server Error" });
    }
}
