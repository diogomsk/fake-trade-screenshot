import { Connection, PublicKey } from "@solana/web3.js";

const RPC_ENDPOINT =
    "https://mainnet.helius-rpc.com/?api-key=de8a1ffd-8910-4f4b-a6e1-b8d1778296ea";
const connection = new Connection(RPC_ENDPOINT);

const RECEIVER_ADDRESS = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
const USDC_MINT_ADDRESS = "Es9vMFrzaCERJJk5f6ehdE8S7s8Z2RyAwqu7gTgnf2K";
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
    console.log("🔔 verify-payment called. senderAddress:", senderAddress);

    if (!senderAddress) {
        return res
            .status(400)
            .json({ success: false, error: "Missing senderAddress" });
    }

    try {
        const senderPubkey = new PublicKey(senderAddress);
        const receiverPubkey = new PublicKey(RECEIVER_ADDRESS);
        const usdcMintPubkey = new PublicKey(USDC_MINT_ADDRESS);

        const signatures = await connection.getSignaturesForAddress(
            senderPubkey,
            {
                limit: 5,
            }
        );

        console.log(
            "📝 Found signatures:",
            signatures.map((s) => s.signature)
        );

        for (const sigInfo of signatures) {
            await delay(300);

            const tx = await connection.getTransaction(sigInfo.signature, {
                commitment: "confirmed",
            });

            if (!tx || !tx.transaction || !tx.transaction.message) {
                console.log(
                    "⚠️ Empty or invalid transaction:",
                    sigInfo.signature
                );
                continue;
            }

            const instructions = tx.transaction.message.instructions;
            console.log("🔍 Checking transaction:", sigInfo.signature);

            for (const ix of instructions) {
                if (
                    ix.programId?.toString() ===
                    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                ) {
                    const destAccountIndex = ix.accounts?.[1];
                    if (typeof destAccountIndex !== "number") {
                        console.log(
                            "⚠️ destAccountIndex inválido:",
                            ix.accounts
                        );
                        continue;
                    }

                    const destAccountPubkey =
                        tx.transaction.message.accountKeys[destAccountIndex];

                    console.log("➡️ Destino:", destAccountPubkey?.toString());

                    if (
                        destAccountPubkey?.toString() ===
                        receiverPubkey.toString()
                    ) {
                        const tokenBalances = tx.meta?.postTokenBalances || [];

                        for (const tokenBalance of tokenBalances) {
                            console.log("💰 tokenBalance:", tokenBalance);

                            if (
                                tokenBalance.owner ===
                                    receiverPubkey.toString() &&
                                tokenBalance.mint === usdcMintPubkey.toString()
                            ) {
                                const uiAmount =
                                    parseInt(
                                        tokenBalance.uiTokenAmount.amount
                                    ) / Math.pow(10, USDC_DECIMALS);

                                console.log("🔢 uiAmount:", uiAmount);

                                if (uiAmount >= REQUIRED_AMOUNT) {
                                    console.log(
                                        "✅ Pagamento encontrado:",
                                        sigInfo.signature
                                    );
                                    return res
                                        .status(200)
                                        .json({ success: true });
                                } else {
                                    console.log(
                                        "❌ Valor insuficiente:",
                                        uiAmount
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }

        console.log("🚫 Pagamento não encontrado.");
        return res.status(200).json({ success: false });
    } catch (error) {
        console.error("❌ Error verifying payment:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal Server Error" });
    }
}
