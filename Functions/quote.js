// GET /quote?symbols=AAPL,MSFT
export async function onRequestGet({ request }) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols");
  if (!symbols) {
    return new Response(JSON.stringify({ error: "No symbols" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  const url = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
              encodeURIComponent(symbols);
  const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: "Upstream failed" }), {
      status: 502, headers: { "content-type": "application/json" }
    });
  }

  const data = await resp.json();
  const out = {};
  for (const q of (data.quoteResponse?.result || [])) {
    out[(q.symbol || "").toUpperCase()] = {
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice ?? null,
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      currency: q.currency || "USD"
    };
  }
  return new Response(JSON.stringify(out), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  });
}
