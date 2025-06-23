import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

const RECEIVER_ADDRESS = "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em";
const USDC_MINT_ADDRESS = "Es9vMFrzaCERJJk5f6ehdE8S7s8Z2RyAwqu7gTgnf2K"; // USDC SPL Token mainnet mint

// Helper para converter lamports USDC (SPL token tem 6 casas decimais)
const USDC_DECIMALS = 6;
const REQUIRED_AMOUNT = 0.99;

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method Not Allowed" });
        return;
    }

    const { senderAddress } = req.body;

    if (!senderAddress) {
        res.status(400).json({
            success: false,
            error: "Missing senderAddress",
        });
        return;
    }

    try {
        // Conectar na mainnet-beta
        const connection = new Connection(clusterApiUrl("mainnet-beta"));

        const senderPubkey = new PublicKey(senderAddress);
        const receiverPubkey = new PublicKey(RECEIVER_ADDRESS);
        const usdcMintPubkey = new PublicKey(USDC_MINT_ADDRESS);

        // Busca todas as assinaturas de transações do remetente (limit 20 para performance)
        const signatures = await connection.getSignaturesForAddress(
            senderPubkey,
            { limit: 20 }
        );

        for (const sigInfo of signatures) {
            // Pega transação detalhada
            const tx = await connection.getTransaction(sigInfo.signature);

            if (!tx) continue;

            // Itera sobre instruções procurando transferência SPL token USDC para sua wallet
            const instructions = tx.transaction.message.instructions;

            for (const ix of instructions) {
                // Só nos program instructions SPL Token (programId é SPL Token Program)
                if (
                    ix.programId.toString() ===
                    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                ) {
                    // A data da instrução é base64 codificado, porém o jeito mais simples para detectar é:
                    // 1. Checar se instrução é do tipo TransferChecked (instrução SPL token padrão)
                    // 2. Verificar se o token mint é USDC
                    // 3. Verificar se o destino é sua wallet

                    // Pra simplificar esse exemplo, vamos apenas filtrar as contas envolvidas e os dados brutos.

                    // Se quiser algo mais completo, tem libs que interpretam melhor o instruction.data.

                    const destAccountIndex = ix.accounts[1]; // posição 1 geralmente é o destino na transferência
                    const destAccountPubkey =
                        tx.transaction.message.accountKeys[destAccountIndex];

                    if (
                        destAccountPubkey.toString() ===
                        receiverPubkey.toString()
                    ) {
                        // Encontrou transação que enviou algum token pra você, vamos verificar valor e mint

                        // Para obter detalhes SPL Token (quantia e mint), precisamos parsear metadados
                        // Solução simples: pegar os postTokenBalances da transação
                        if (!tx.meta || !tx.meta.postTokenBalances) continue;

                        // Procurar no postTokenBalances o USDC para destinatário
                        for (const tokenBalance of tx.meta.postTokenBalances) {
                            if (
                                tokenBalance.owner ===
                                    receiverPubkey.toString() &&
                                tokenBalance.mint === usdcMintPubkey.toString()
                            ) {
                                // Quantidade no formato string (inteiro)
                                const uiAmount =
                                    parseInt(
                                        tokenBalance.uiTokenAmount.amount
                                    ) / Math.pow(10, USDC_DECIMALS);

                                if (uiAmount >= REQUIRED_AMOUNT) {
                                    // Encontrou pagamento válido
                                    res.status(200).json({ success: true });
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Se não achou pagamento válido
        res.status(200).json({ success: false });
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({
            success: false,
            error: "Internal Server Error",
        });
    }
}
