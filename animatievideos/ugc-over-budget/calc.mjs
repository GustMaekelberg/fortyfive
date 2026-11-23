// Verifies every number shown in the video against the real sheet states (values.json of each render).
import { readFileSync } from "node:fs";
const DIR = "/tmp/claude-0/-home-user-fortyfive/c1ce0776-5b2a-535d-b13d-5b0dfd345fc1/scratchpad/planner/states";
const base = JSON.parse(readFileSync(`${DIR}/base/values.json`, "utf8"));
const over = JSON.parse(readFileSync(`${DIR}/flowers_over/values.json`, "utf8"));
const money = (v) => (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-US");
const ok = (cond, msg) => { if (!cond) { console.error("FAIL:", msg); process.exit(1); } console.log("ok  ", msg); };

// Budget rows: [category, item, vendor, flat, perGuest, estimate, actual, planned, paid, stillDue]
const fb = base.budget_rows.find((r) => r[1] === "Flowers");
const fo = over.budget_rows.find((r) => r[1] === "Flowers");
ok(fb[3] === 1400 && fb[5] === 1400 && fb[6] === null && fb[7] === 1400, `base Flowers: flat ${money(fb[3])}, estimate ${money(fb[5])}, Actual empty, Planned ${money(fb[7])}`);
ok(fo[6] === 1800 && fo[7] === 1800, `flowers_over Flowers: Actual ${money(fo[6])}, Planned ${money(fo[7])}`);
const typed = "1800";
ok(Number(typed) === fo[6], `typed text "${typed}" equals the Actual in flowers_over`);

// Dashboard: categories [name, target, planned, paid, due, targetLeft, status]
const cb = base.categories.find((c) => c[0] === "Flowers & decor");
const co = over.categories.find((c) => c[0] === "Flowers & decor");
ok(cb[1] === 1400 && cb[6] === "OK", `base Flowers & decor: target ${money(cb[1])}, status ${cb[6]}`);
ok(co[1] === 1400 && co[2] === 1800 && co[5] === -400 && co[6] === "Over", `flowers_over Flowers & decor: target ${money(co[1])}, planned ${money(co[2])}, target left ${money(co[5])}, status ${co[6]}`);
const overBy = fo[6] - fb[7];
ok(overBy === 400, `caption: quote $1,800 - planned $1,400 = ${money(overBy)}`);
ok(co[5] === -overBy, `target left equals -${money(overBy)}`);
ok(base.tiles.budget === 25000 && base.tiles.planned === 25000 && base.left_label === "LEFT TO PLAN", `base tiles: budget ${money(base.tiles.budget)}, planned ${money(base.tiles.planned)}, ${base.left_label}`);
ok(over.tiles.planned === base.tiles.planned + overBy && over.tiles.planned === 25400, `flowers_over planned: ${money(base.tiles.planned)} + ${money(overBy)} = ${money(over.tiles.planned)}`);
ok(over.tiles.left === -400 && over.left_label === "OVER BUDGET", `flowers_over last tile: ${over.left_label} ${money(over.tiles.left)}`);
ok(over.tiles.budget - over.tiles.planned === over.tiles.left, `budget ${money(over.tiles.budget)} - planned ${money(over.tiles.planned)} = ${money(over.tiles.left)}`);
console.log("\nCaption numbers: $1,800 (quote), $1,400 (planned), $400 (over). All verified.");
