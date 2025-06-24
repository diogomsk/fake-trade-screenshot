import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection(
    "https://mainnet.helius-rpc.com/?api-key=de8a1ffd-8910-4f4b-a6e1-b8d1778296ea"
);
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const RECEIVER_WALLET = new PublicKey(
    "4duxyG9rou5NRZgziN8WKaMLXYP1Yms4C2QBMkuoD8em"
);
const HELIUS_API_KEY = "de8a1ffd-8910-4f4b-a6e1-b8d1778296ea";
const REQUIRED_AMOUNT = 0.99;

async function getUsdcTokenAccount(walletAddress) {
    const accounts = await connection.getTokenAccountsByOwner(
        new PublicKey(walletAddress),
        { mint: USDC_MINT }
    );
    if (accounts.value.length > 0) {
        return accounts.value[0].pubkey.toBase58();
    }
    return null;
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res
            .status(405)
            .json({ success: false, error: "Method Not Allowed" });
    }

    const { payerPublicKey } = req.body;
    console.log("🔔 verify-payment called. payerPublicKey:", payerPublicKey);

    if (!payerPublicKey) {
        return res
            .status(400)
            .json({ success: false, error: "Missing payerPublicKey" });
    }

    try {
        const senderTokenAccount = await getUsdcTokenAccount(payerPublicKey);
        const receiverTokenAccount = await getUsdcTokenAccount(
            RECEIVER_WALLET.toBase58()
        );

        if (!senderTokenAccount || !receiverTokenAccount) {
            return res
                .status(400)
                .json({ success: false, error: "Token accounts not found" });
        }

        const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
        const body = {
            jsonrpc: "2.0",
            id: "search-transactions",
            method: "searchTransactions",
            params: {
                account: receiverTokenAccount,
                query: {
                    rawTransaction: {
                        tokenTransfers: {
                            toUserAccount: receiverTokenAccount,
                            fromUserAccount: senderTokenAccount,
                            mint: USDC_MINT.toBase58(),
                        },
                    },
                },
                limit: 20,
            },
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const json = await response.json();
        const transactions = json.result || [];

        console.log(
            "📦 Total matching transactions found:",
            transactions.length
        );

        for (const tx of transactions) {
            const transfers = tx.tokenTransfers || [];
            for (const transfer of transfers) {
                console.log("🔍 Checking transfer:", transfer);
                if (
                    transfer.toUserAccount === receiverTokenAccount &&
                    transfer.fromUserAccount === senderTokenAccount &&
                    transfer.mint === USDC_MINT.toBase58() &&
                    parseFloat(transfer.tokenAmount) >= REQUIRED_AMOUNT
                ) {
                    console.log("✅ Pagamento confirmado:", transfer.signature);
                    return res
                        .status(200)
                        .json({ success: true, signature: transfer.signature });
                }
            }
        }

        console.log("🚫 Nenhum pagamento válido encontrado.");
        return res.status(200).json({ success: false });
    } catch (error) {
        console.error("❌ Erro ao verificar pagamento:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal Server Error" });
    }
}
