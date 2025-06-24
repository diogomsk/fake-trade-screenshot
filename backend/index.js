import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const connection = new Connection(
    "https://mainnet.helius-rpc.com/?api-key=de8a1ffd-8910-4f4b-a6e1-b8d1778296ea"
);
const USDC_MINT_ADDRESS = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
const RECEIVER_WALLET = new PublicKey(
    "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em"
);

export default async function handler(req, res) {
    console.log(
        "🔔 verify-payment called. payerPublicKey:",
        req.body.payerPublicKey
    );

    const { payerPublicKey } = req.body;
    if (!payerPublicKey)
        return res.status(400).json({ error: "Missing payerPublicKey" });

    try {
        const payerPubKey = new PublicKey(payerPublicKey);

        const tokenAccounts = await connection.getTokenAccountsByOwner(
            payerPubKey,
            {
                mint: USDC_MINT_ADDRESS,
            }
        );
        console.log(
            "🔹 Payer USDC token accounts:",
            tokenAccounts.value.map((a) => a.pubkey.toBase58())
        );

        const signatures = await connection.getSignaturesForAddress(
            payerPubKey,
            { limit: 50 }
        );
        console.log(`📦 Found ${signatures.length} transactions for payer`);

        for (const sigInfo of signatures) {
            const sig = sigInfo.signature;
            const tx = await connection.getParsedTransaction(sig, "confirmed");
            if (!tx) {
                console.log("⚠️ Transaction empty or not parsed:", sig);
                continue;
            }

            console.log(`\n📌 Checking tx ${sig}:`);
            console.log(
                "➖ Instructions count:",
                tx.transaction.message.instructions.length
            );

            for (const ix of tx.transaction.message.instructions) {
                console.log(
                    "Instruction type:",
                    ix.parsed?.type,
                    "programId:",
                    ix.programId.toBase58()
                );
                if (!ix.parsed) continue;

                const info = ix.parsed.info;
                if (
                    ix.programId.equals(TOKEN_PROGRAM_ID) &&
                    (ix.parsed.type === "transfer" ||
                        ix.parsed.type === "transferChecked")
                ) {
                    console.log(
                        `-- transfer detected: mint=${info.mint}, source=${info.source}, dest=${info.destination}, amount=${info.amount}`
                    );
                    const amountInUSDC = parseInt(info.amount, 10) / 1e6;
                    console.log(`   → amountInUSDC: ${amountInUSDC}`);

                    if (
                        info.destination === RECEIVER_WALLET.toBase58() &&
                        amountInUSDC >= 0.99
                    ) {
                        console.log("✅ Pagamento encontrado em", sig);
                        return res.json({ paid: true, signature: sig });
                    }
                }
            }
        }

        console.log(
            "🚫 Pagamento não encontrado após checar todas as instruções"
        );
        return res.json({ paid: false });
    } catch (e) {
        console.error("❌ Erro na verificação:", e);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
