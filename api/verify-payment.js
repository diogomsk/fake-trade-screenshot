const RECEIVER_WALLET = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const REQUIRED_AMOUNT = 0.99;
const HELIUS_API_KEY = "de8a1ffd-8910-4f4b-a6e1-b8d1778296ea";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res
            .status(405)
            .json({ success: false, error: "Method Not Allowed" });
    }

    const { payerPublicKey } = req.body;
    console.log("🔔 verify-payment called. payerPublicKey:", payerPublicKey);

    try {
        const heliusUrl = `https://api.helius.xyz/v0/addresses/${payerPublicKey}/transactions?api-key=${HELIUS_API_KEY}`;
        const response = await fetch(heliusUrl);
        const transactions = await response.json();

        console.log(`📦 Found ${transactions.length} transactions for payer`);

        for (const tx of transactions) {
            const transfers = tx.tokenTransfers || [];
            for (const t of transfers) {
                if (
                    t.fromUserAccount === payerPublicKey &&
                    t.toUserAccount === RECEIVER_WALLET &&
                    t.mint === USDC_MINT &&
                    parseFloat(t.tokenAmount) >= REQUIRED_AMOUNT
                ) {
                    console.log("✅ Valid USDC payment found:", tx.signature);
                    return res.status(200).json({
                        success: true,
                        signature: tx.signature,
                    });
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
