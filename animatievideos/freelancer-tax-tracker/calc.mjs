// Every number shown in the video comes from here. Run: node calc.mjs
// Example only: the set-aside rate is the USER'S OWN input in the template, not a recommendation.
const RATE = 0.25; // "Your set-aside rate" example value typed in by the user
const payments = [
  { client: "Client A", paid: 4000 },
  { client: "Client B", paid: 1200 },
  { client: "Client C", paid: 2800 },
];
const money = (v) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

let running = 0, totalPaid = 0;
console.log(`Set-aside rate (user input, example): ${RATE * 100}%`);
for (const p of payments) {
  const aside = Math.round(p.paid * RATE * 100) / 100;
  const yours = Math.round((p.paid - aside) * 100) / 100;
  running += aside; totalPaid += p.paid;
  console.log(`${p.client}: paid ${money(p.paid)} -> set aside ${money(aside)}, yours to spend ${money(yours)}; quarter total so far ${money(running)}`);
}
console.log(`Total paid this quarter (example): ${money(totalPaid)}`);
console.log(`Set aside this quarter: ${money(running)}`);
console.log(`Yours to spend: ${money(totalPaid - running)}`);
console.log(`Hook: $4,000 payment at ${RATE * 100}% -> ${money(4000 * RATE)} is the set-aside slice (${RATE * 100}% of the bar).`);
console.log(`Jar fill fractions after each payment (of quarter total ${money(running)}):`,
  payments.reduce((a, p) => { const s = (a.length ? a[a.length - 1].s : 0) + p.paid * RATE; a.push({ s }); return a; }, []).map((x) => (x.s / running).toFixed(3)).join(", "));
console.log("Next quarterly due date: shown only as an example label (e.g. Apr 15), not a legal deadline.");
console.log("Price hint: $12 (report recommends EUR 11 ~ $12).");
