import { Connection, PublicKey } from "@solana/web3.js";

const RPC_ENDPOINT =
    "https://mainnet.helius-rpc.com/?api-key=de8a1ffd-8910-4f4b-a6e1-b8d1778296ea"; // privado
const connection = new Connection(RPC_ENDPOINT);

const RECEIVER_ADDRESS = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
const USDC_MINT_ADDRESS = "Es9vMFrzaCERJJk5f6ehdE8S7s8Z2RyAwqu7gTgnf2K"; // USDC SPL
const USDC_DECIMALS = 6;
const REQUIRED_AMOUNT = 0.99;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res
            .status(405)
            .json({ success: false, error: "Method Not Allowed" });
    }

    const { senderAddress } = req.body;

    if (!senderAddress) {
        return res
            .status(400)
            .json({ success: false, error: "Missing senderAddress" });
    }

    try {
        const senderPubkey = new PublicKey(senderAddress);
        const receiverPubkey = new PublicKey(RECEIVER_ADDRESS);
        const usdcMintPubkey = new PublicKey(USDC_MINT_ADDRESS);

        // Buscar últimas transações do remetente (reduzido para evitar erro 429)
        const signatures = await connection.getSignaturesForAddress(
            senderPubkey,
            {
                limit: 5,
            }
        );

        for (const sigInfo of signatures) {
            // Espera 300ms entre cada chamada
            await delay(300);

            const tx = await connection.getTransaction(sigInfo.signature, {
                commitment: "confirmed",
            });

            if (!tx || !tx.transaction || !tx.transaction.message) continue;

            const instructions = tx.transaction.message.instructions;

            for (const ix of instructions) {
                if (
                    ix.programId?.toString() ===
                    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                ) {
                    const destAccountIndex = ix.accounts?.[1];

                    if (typeof destAccountIndex !== "number") continue;

                    const destAccountPubkey =
                        tx.transaction.message.accountKeys[destAccountIndex];

                    if (
                        destAccountPubkey?.toString() ===
                        receiverPubkey.toString()
                    ) {
                        const tokenBalances = tx.meta?.postTokenBalances || [];

                        for (const tokenBalance of tokenBalances) {
                            if (
                                tokenBalance.owner ===
                                    receiverPubkey.toString() &&
                                tokenBalance.mint === usdcMintPubkey.toString()
                            ) {
                                const uiAmount =
                                    parseInt(
                                        tokenBalance.uiTokenAmount.amount
                                    ) / Math.pow(10, USDC_DECIMALS);

                                if (uiAmount >= REQUIRED_AMOUNT) {
                                    console.log(
                                        "✅ Pagamento encontrado:",
                                        sigInfo.signature
                                    );
                                    return res
                                        .status(200)
                                        .json({ success: true });
                                }
                            }
                        }
                    }
                }
            }
        }

        return res.status(200).json({ success: false }); // não encontrou pagamento
    } catch (error) {
        console.error("❌ Error verifying payment:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal Server Error" });
    }
}
