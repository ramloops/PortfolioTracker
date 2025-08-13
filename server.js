import express from "express";
import cors from "cors";
import yahoo from "yahoo-finance2";

const app = express();
app.use(cors());
app.use(express.static("public"));

app.get("/quote", async (req, res) => {
  try {
    const symbols = (req.query.symbols || "")
      .split(",").map(s => s.trim()).filter(Boolean);
    if (!symbols.length) return res.status(400).json({ error: "No symbols" });

    const data = await yahoo.quote(symbols);
    const list = Array.isArray(data) ? data : [data];
    const out = {};
    for (const q of list) {
      if (!q) continue;
      out[String(q.symbol).toUpperCase()] = {
        symbol: q.symbol,
        name: q.shortName || q.longName || q.symbol,
        price: q.regularMarketPrice ?? null,
        change: q.regularMarketChange ?? null,
        changePercent: q.regularMarketChangePercent ?? null,
        currency: q.currency || "USD"
      };
    }
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Quote fetch failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
