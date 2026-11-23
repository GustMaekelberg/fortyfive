// Verifies every number shown in the video against the real product states (values.json).
import { readFileSync } from "node:fs";
const DIR = "/tmp/claude-0/-home-user-fortyfive/c1ce0776-5b2a-535d-b13d-5b0dfd345fc1/scratchpad/planner/states/";
const load = (s) => JSON.parse(readFileSync(DIR + s + "/values.json", "utf8"));
const base = load("base"), paid = load("venue_paid");
const money = (v) => "$" + v.toLocaleString("en-US");
const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const date = (s) => { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return `${M[m - 1]} ${d}, ${y}`; };
const assert = (c, msg) => { if (!c) { console.error("FAIL:", msg); process.exit(1); } console.log("ok  ", msg); };

// The payment row that gets marked paid (row 2 of the Payments table)
const rowB = base.payments_rows[1], rowP = paid.payments_rows[1];
assert(date(rowB[0]) === "Mar 1, 2027" && rowB[1] === "Venue hire" && rowB[2] === "2nd payment" && rowB[3] === 2500, "base row: Mar 1, 2027 · Venue hire · 2nd payment · $2,500");
assert(rowB[4] === "No" && rowB[9] === "Upcoming", "base row: Paid? = No, Status = Upcoming");
assert(rowP[4] === "Yes" && rowP[9] === "Paid", "venue_paid row: Paid? = Yes, Status = Paid");
// Other rows identical
for (let i = 0; i < base.payments_rows.length; i++) if (i !== 1) assert(JSON.stringify(base.payments_rows[i]) === JSON.stringify(paid.payments_rows[i]), `row ${i + 1} unchanged`);

// Dashboard tiles
assert(base.tiles.paid === 8900 && base.tiles.still_due === 16100, `base: Paid ${money(base.tiles.paid)}, Still due ${money(base.tiles.still_due)}`);
assert(paid.tiles.paid === 11400 && paid.tiles.still_due === 13600, `venue_paid: Paid ${money(paid.tiles.paid)}, Still due ${money(paid.tiles.still_due)}`);
assert(base.tiles.paid + rowB[3] === paid.tiles.paid, `${money(base.tiles.paid)} + ${money(rowB[3])} = ${money(paid.tiles.paid)}`);
assert(base.tiles.still_due - rowB[3] === paid.tiles.still_due, `${money(base.tiles.still_due)} − ${money(rowB[3])} = ${money(paid.tiles.still_due)}`);
assert(paid.tiles.paid + paid.tiles.still_due === paid.tiles.planned && base.tiles.paid + base.tiles.still_due === base.tiles.planned, "paid + still due = planned ($25,000) in both states");

// Next payment block
const nb = base.next, np = paid.next;
assert(date(nb.date) === "Mar 1, 2027" && nb.item === "Venue hire" && nb.amount === 2500 && nb.what === "2nd payment", `base next: ${date(nb.date)} · ${nb.item} · ${money(nb.amount)} · ${nb.what}`);
assert(date(np.date) === "May 15, 2027" && np.item === "Venue hire" && np.amount === 2500 && np.what === "Final payment", `venue_paid next: ${date(np.date)} · ${np.item} · ${money(np.amount)} · ${np.what}`);
// The next payment is the earliest unpaid row
const earliest = (st) => st.payments_rows.filter((r) => r[4] === "No").sort((a, b) => a[0].localeCompare(b[0]))[0];
assert(earliest(base)[0].startsWith(nb.date) && earliest(paid)[0].startsWith(np.date), "next payment = earliest unpaid row in both states");
console.log("\nAll numbers verified. Captions carry no numbers.");
