import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

const RECEIVER_ADDRESS = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
const USDC_MINT_ADDRESS = "Es9vMFrzaCERJJk5f6ehdE8S7s8Z2RyAwqu7gTgnf2K";
const USDC_DECIMALS = 6;
const REQUIRED_AMOUNT = 0.99;

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
        const connection = new Connection(clusterApiUrl("mainnet-beta"));
        const senderPubkey = new PublicKey(senderAddress);
        const receiverPubkey = new PublicKey(RECEIVER_ADDRESS);
        const usdcMintPubkey = new PublicKey(USDC_MINT_ADDRESS);

        const signatures = await connection.getSignaturesForAddress(
            senderPubkey,
            {
                limit: 20,
            }
        );

        for (const sigInfo of signatures) {
            const tx = await connection.getTransaction(sigInfo.signature, {
                commitment: "confirmed",
            });

            if (!tx || !tx.meta) continue;

            const tokenBalances = tx.meta.postTokenBalances || [];

            for (const tokenBalance of tokenBalances) {
                const { owner, mint, uiTokenAmount } = tokenBalance;

                if (
                    owner === receiverPubkey.toString() &&
                    mint === usdcMintPubkey.toString()
                ) {
                    const uiAmount =
                        parseInt(uiTokenAmount.amount) /
                        Math.pow(10, USDC_DECIMALS);

                    console.log(
                        `💸 Recebido ${uiAmount} USDC de ${senderAddress}`
                    );

                    if (uiAmount >= REQUIRED_AMOUNT) {
                        return res.status(200).json({ success: true });
                    }
                }
            }
        }

        return res.status(200).json({ success: false }); // Nenhum pagamento válido encontrado
    } catch (error) {
        console.error("Error verifying payment:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal Server Error" });
    }
}
