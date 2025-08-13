const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const STORAGE_KEY = "pt_holdings_v1";
let holdings = load();

const fmt = n => (isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "—");
const pct = n => (isFinite(n) ? `${(n * 100).toFixed(2)}%` : "—");

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings)); }

async function fetchQuotes(symbols) {
  const qs = encodeURIComponent(symbols.join(","));
  const res = await fetch(`/quote?symbols=${qs}`);
  if (!res.ok) throw new Error("quote fetch failed");
  return res.json();
}

function compute(quotes) {
  const rows = holdings.map(h => {
    const q = quotes[h.symbol] || {};
    const price = Number(q.price) || 0;
    const value = price * h.qty;
    const invested = h.cost * h.qty;
    const pl = value - invested;
    const day = (Number(q.change) || 0) * h.qty;
    return { ...h, name: q.name || h.symbol, price, value, invested, pl, plPct: invested ? pl / invested : 0, day };
  });
  const market = rows.reduce((s, r) => s + r.value, 0);
  rows.forEach(r => r.weight = market ? r.value / market : 0);
  const invested = rows.reduce((s, r) => s + r.invested, 0);
  const dayChange = rows.reduce((s, r) => s + r.day, 0);
  const pl = market - invested;
  return { rows, market, invested, pl, dayChange };
}

function render({ rows, market, invested, pl, dayChange }) {
  $("#invested").textContent = fmt(invested);
  $("#market").textContent = fmt(market);
  $("#pl").textContent = fmt(pl);
  $("#pl").className = pl >= 0 ? "gain" : "loss";
  $("#dayChange").textContent = fmt(dayChange);
  $("#dayChange").className = dayChange >= 0 ? "gain" : "loss";

  const tbody = $("#table tbody");
  tbody.innerHTML = "";
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.symbol}</td>
      <td>${r.name || ""}</td>
      <td>${r.qty}</td>
      <td>${fmt(r.cost)}</td>
      <td>${fmt(r.price)}</td>
      <td>${fmt(r.value)}</td>
      <td class="${r.pl >= 0 ? "gain" : "loss"}">${fmt(r.pl)}</td>
      <td class="${r.pl >= 0 ? "gain" : "loss"}">${pct(r.plPct)}</td>
      <td class="${r.day >= 0 ? "gain" : "loss"}">${fmt(r.day)}</td>
      <td>${pct(r.weight)}</td>
      <td><button class="del" data-sym="${r.symbol}">✕</button></td>`;
    tbody.appendChild(tr);
  }
  $$("#table .del").forEach(btn => btn.addEventListener("click", () => {
    holdings = holdings.filter(h => h.symbol !== btn.dataset.sym);
    persist(); refresh();
  }));

  drawChart(rows);
}

let chart;
function drawChart(rows) {
  const ctx = $("#allocChart").getContext("2d");
  const labels = rows.map(r => r.symbol);
  const data = rows.map(r => +(r.value.toFixed(2)));
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "pie",
    data: { labels, datasets: [{ data }] },
    options: { plugins: { legend: { position: "bottom" } } }
  });
}

async function refresh() {
  if (!holdings.length) { render(compute({})); return; }
  const quotes = await fetchQuotes(holdings.map(h => h.symbol));
  render(compute(quotes));
}

$("#addForm").addEventListener("submit", e => {
  e.preventDefault();
  const sym = $("#sym").value.trim().toUpperCase();
  const qty = Number($("#qty").value);
  const cost = Number($("#cost").value);
  if (!sym || !qty || !cost) return;

  const existing = holdings.find(h => h.symbol === sym);
  if (existing) { existing.qty = qty; existing.cost = cost; }
  else holdings.push({ symbol: sym, qty, cost });

  persist();
  e.target.reset();
  refresh();
});

$("#refreshBtn").addEventListener("click", refresh);

$("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(holdings, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "holdings.json";
  a.click();
});

$("#importBtn").addEventListener("click", () => $("#importInput").click());
$("#importInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  holdings = JSON.parse(text);
  persist();
  refresh();
});

$("#clearBtn").addEventListener("click", () => {
  if (confirm("Clear all holdings?")) {
    holdings = [];
    persist();
    refresh();
  }
});

if (!holdings.length) {
  holdings = [
    { symbol: "META", qty: 1, cost: 700 },
    { symbol: "CVS", qty: 10, cost: 70 }
  ];
  persist();
}

refresh();