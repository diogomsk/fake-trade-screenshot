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
        const url = `https://api.helius.xyz/v0/addresses/${payerPublicKey}/transactions/?api-key=${HELIUS_API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) {
            console.error("Error fetching transactions:", response.statusText);
            return res
                .status(500)
                .json({ success: false, error: "Error fetching transactions" });
        }

        const transactions = await response.json();
        console.log(`📦 Found ${transactions.length} transactions for payer`);

        for (const tx of transactions) {
            const instructions =
                tx.transaction.message.instructions ||
                tx.transaction.message.compiledInstructions ||
                [];

            // Alternatively, Helius returns parsedInstructions:
            const parsedInstructions = tx.parsedInstructions || [];

            for (const ix of parsedInstructions) {
                if (
                    ix.program === "spl-token" &&
                    (ix.parsed?.type === "transfer" ||
                        ix.parsed?.type === "transferChecked")
                ) {
                    const info = ix.parsed.info;
                    if (
                        info.mint === USDC_MINT &&
                        info.destination === RECEIVER &&
                        parseFloat(info.amount) / 1e6 >= REQUIRED_AMOUNT
                    ) {
                        console.log(
                            "✅ Payment found in transaction:",
                            tx.transaction.signatures[0]
                        );
                        return res
                            .status(200)
                            .json({
                                success: true,
                                signature: tx.transaction.signatures[0],
                            });
                    }
                }
            }
        }

        console.log("🚫 No valid USDC payment found");
        return res.status(200).json({ success: false });
    } catch (error) {
        console.error("❌ Error verifying payment:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal Server Error" });
    }
}
