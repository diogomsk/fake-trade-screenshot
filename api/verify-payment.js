import { Connection, PublicKey } from "@solana/web3.js";

const HELIUS_API_KEY = "de8a1ffd-8910-4f4b-a6e1-b8d1778296ea";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const RECEIVER_WALLET = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
const REQUIRED_AMOUNT = 0.99;

/** verify-payment.js **/

export default async function handler(req, res) {
    if (req.method !== "POST")
        return res
            .status(405)
            .json({ success: false, error: "Only POST allowed" });

    const { payerPublicKey } = req.body;
    if (!payerPublicKey)
        return res
            .status(400)
            .json({ success: false, error: "Missing payerPublicKey" });
    console.log("🔔 verify-payment called. payerPublicKey:", payerPublicKey);

    const HELIUS_API_KEY = "de8a1ffd-8910-4f4b-a6e1-b8d1778296ea";
    const RECEIVER = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
    const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const REQUIRED_AMOUNT = 0.99;

    try {
        const resp = await fetch(
            `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: "mintTransfers",
                    method: "getTokenTransfersByMint",
                    params: {
                        mint: USDC_MINT,
                        toWallet: RECEIVER,
                        limit: 20,
                    },
                }),
            }
        );

        const { result: transfers = [] } = await resp.json();
        console.log("📦 Total mint‑specific transfers:", transfers.length);

        for (const t of transfers) {
            console.log("🔍 Transfer:", t);
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
    } catch (e) {
        console.error("❌ Error verifying payment:", e);
        return res
            .status(500)
            .json({ success: false, error: "Internal Server Error" });
    }
}
