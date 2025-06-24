export default function handler(req, res) {
    const wallet = process.env.RECEIVER_WALLET;

    if (!wallet) {
        return res.status(500).json({ error: "Wallet not configured" });
    }

    res.status(200).json({ wallet });
}
