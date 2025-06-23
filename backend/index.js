import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post("/verify-payment", async (req, res) => {
    const { senderAddress } = req.body;

    if (!senderAddress) {
        return res
            .status(400)
            .json({ success: false, message: "Missing senderAddress" });
    }

    try {
        const response = await axios.get(
            `https://api.helius.xyz/v0/addresses/${process.env.RECEIVER_ADDRESS}/transactions?api-key=${process.env.API_KEY}`
        );

        const transactions = response.data;

        // Procura transação com USDC >= valor definido, da carteira enviada para a sua
        const payment = transactions.find((tx) => {
            const usdcTransfer = tx.tokenTransfers?.find(
                (t) =>
                    t.mint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" && // USDC mint address na Solana
                    t.source === senderAddress &&
                    t.destination === process.env.RECEIVER_ADDRESS &&
                    parseFloat(t.amount) >= parseFloat(process.env.AMOUNT_USDC)
            );
            return usdcTransfer;
        });

        if (payment) {
            return res.json({ success: true });
        } else {
            return res.json({ success: false });
        }
    } catch (error) {
        console.error("Erro ao verificar pagamento:", error.message);
        return res
            .status(500)
            .json({ success: false, message: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
