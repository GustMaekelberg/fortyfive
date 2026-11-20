// Honest example numbers for the debt video
const debts0 = [
  { name: "Car loan", bal: 9400, apr: 6.9, min: 220 },
  { name: "Credit card", bal: 4200, apr: 24.9, min: 126 },
  { name: "Store card", bal: 1150, apr: 29.9, min: 45 },
];
function sim({ extra = 0, rollover = false, order = null }) {
  const d = debts0.map(x => ({ ...x }));
  let month = 0, interest = 0;
  const totalMin = d.reduce((s, x) => s + x.min, 0);
  while (d.some(x => x.bal > 0.005) && month < 600) {
    month++;
    for (const x of d) if (x.bal > 0) { const i = x.bal * x.apr / 1200; x.bal += i; interest += i; }
    let pool = 0;
    for (const x of d) {
      if (x.bal <= 0) { if (rollover) pool += x.min; continue; }
      const p = Math.min(x.min, x.bal); x.bal -= p; if (rollover) pool += x.min - p;
    }
    pool += extra;
    if (pool > 0) {
      const ord = (order || d.map((_, i) => i));
      for (const i of ord) { const x = d[i]; if (x.bal > 0 && pool > 0) { const p = Math.min(pool, x.bal); x.bal -= p; pool -= p; } }
    }
  }
  return { month, interest: Math.round(interest) };
}
const start = new Date(Date.UTC(2026, 11, 1));
const fmt = m => { const dt = new Date(Date.UTC(2026, 11 + m, 1)); return dt.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }); };
const base = sim({ extra: 0, rollover: false });
const aval = sim({ extra: 150, rollover: true, order: [2, 1, 0] });
const aval0 = sim({ extra: 0, rollover: true, order: [2, 1, 0] });
const wrong = sim({ extra: 150, rollover: true, order: [0, 1, 2] });
console.log("minimums only, no rollover:", base, fmt(base.month));
console.log("avalanche rollover, +0:", aval0, fmt(aval0.month));
console.log("avalanche rollover, +150:", aval, fmt(aval.month));
console.log("lowest-APR-first rollover +150:", wrong, fmt(wrong.month));
console.log("saved months vs base:", base.month - aval.month, "interest saved:", base.interest - aval.interest);
console.log("same $150 extra, order only: months", wrong.month - aval.month, "interest", wrong.interest - aval.interest);
