// Verifies every number shown in the video against the real sheet states (values.json next to each render).
// Run: node calc.mjs
import { readFileSync } from "node:fs";
const dir = new URL("../../../planner/states/", import.meta.url);
const load = (s) => JSON.parse(readFileSync(new URL(`${s}/values.json`, dir), "utf8"));
const over = load("guests120"), base = load("base");
const assert = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("ok  " + m); };
const money = (v) => (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US");
const cat = (st, n) => st.categories.find((r) => r[0] === n); // [name, target, planned, paid, still due, target left, status]
const row = (st, n) => st.budget_rows.find((r) => r[0] === n); // [cat, item, vendor, flat, per guest, ...]

// Hook (state guests120)
assert(over.guests === 120, "start state budgets for 120 guests (Start here cell reads 120)");
assert(over.left_label === "OVER BUDGET" && over.tiles.left === -1700, "Dashboard tile OVER BUDGET " + money(over.tiles.left));
assert(over.tiles.planned === 26700 && over.tiles.budget === 25000, "Planned $26,700 vs Budget $25,000");
assert(cat(over, "Catering & drinks")[2] === 10200 && cat(over, "Catering & drinks")[6] === "Over", "Catering & drinks Planned $10,200, Over");

// The edit: typed value must equal the next state's guest number
assert(base.guests === 100, "typed value 100 = base.guests");
const lost = over.guests - base.guests;
assert(lost === 20, "guests who can't make it: " + lost);

// Payoff (state base)
assert(base.left_label === "LEFT TO PLAN" && base.tiles.left === 0, "last tile now LEFT TO PLAN, value 0 (rendered as -)");
assert(base.tiles.planned === 25000, "Planned back to " + money(base.tiles.planned));
assert(over.tiles.still_due === 17800 && base.tiles.still_due === 16100, "Still due $17,800 -> $16,100");
const cb = cat(base, "Catering & drinks");
assert(cb[2] === 8500 && cb[4] === 6500 && cb[5] === 0 && cb[6] === "OK", "Catering & drinks: Planned $8,500, Still due $6,500, Target left -, OK");
const perGuest = row(base, "Catering & drinks")[4];
assert(perGuest === 85 && row(over, "Catering & drinks")[4] === 85, "catering cost per guest $" + perGuest + " (Budget tab)");
const back = lost * perGuest;
assert(back === 1700, `caption: ${lost} x $${perGuest} per guest = ${money(back)} back`);
assert(cat(over, "Catering & drinks")[2] - cb[2] === back, "catering Planned drops by " + money(back));
assert(over.tiles.planned - base.tiles.planned === back, "total Planned drops by " + money(back));
assert(base.tiles.left - over.tiles.left === back, "over budget -$1,700 -> 0");
console.log("all checks passed");
