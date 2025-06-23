import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const USDC_MINT_ADDRESS = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
); // USDC mainnet

const RECEIVER_WALLET = new PublicKey(
    "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em"
); // sua wallet

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { payerPublicKey } = req.body;
    if (!payerPublicKey) {
        return res.status(400).json({ error: "Missing payerPublicKey" });
    }

    try {
        const payerPubKey = new PublicKey(payerPublicKey);

        // 1. Buscar todas contas token USDC do pagador
        const tokenAccounts = await connection.getTokenAccountsByOwner(
            payerPubKey,
            {
                mint: USDC_MINT_ADDRESS,
            }
        );

        if (tokenAccounts.value.length === 0) {
            return res.json({
                paid: false,
                message: "No USDC token accounts found for payer",
            });
        }

        // 2. Buscar transações recentes da carteira pagadora
        // Pega últimas 20 assinaturas (você pode ajustar)
        const signatures = await connection.getSignaturesForAddress(
            payerPubKey,
            { limit: 20 }
        );

        // 3. Para cada assinatura, buscar a transação e analisar instruções SPL Token transfer
        let paid = false;

        for (const sigInfo of signatures) {
            const tx = await connection.getParsedTransaction(sigInfo.signature);

            if (!tx) continue;

            const instructions = tx.transaction.message.instructions;

            for (const ix of instructions) {
                if (
                    ix.programId.equals(TOKEN_PROGRAM_ID) &&
                    ix.parsed?.type === "transfer" &&
                    ix.parsed.info.mint === USDC_MINT_ADDRESS.toBase58() &&
                    ix.parsed.info.destination === RECEIVER_WALLET.toBase58() &&
                    ix.parsed.info.source === payerPubKey.toBase58()
                ) {
                    // Valor transferido é em "amount", em formato inteiro (tokens tem 6 decimais)
                    const amount = parseInt(ix.parsed.info.amount, 10);

                    // USDC tem 6 decimais
                    const amountInUSDC = amount / 1_000_000;

                    if (amountInUSDC >= 0.99) {
                        paid = true;
                        break;
                    }
                }
            }

            if (paid) break;
        }

        return res.json({ paid });
    } catch (error) {
        console.error("Error verifying payment:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
