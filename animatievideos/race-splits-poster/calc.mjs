// calc.mjs — every time shown in the video comes from here.
// Input: example 5-km split times of a full marathon (42.195 km), plus the final 2.195 km.
// Run: node calc.mjs
const DIST = 42.195;
const splits5k = ["26:30", "26:25", "26:20", "26:35", "26:45", "27:00", "27:35", "28:05"]; // 0-5, 5-10, ... 35-40 km
const lastLeg = { km: DIST - 40, time: "11:50" }; // 40 km -> finish

const toS = (s) => s.split(":").reduce((a, b) => a * 60 + Number(b), 0);
const hms = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`; };
const ms = (s) => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

let cum = 0;
console.log("split   time   cumulative  pace/km");
splits5k.forEach((t, i) => {
  const s = toS(t); cum += s;
  console.log(`${String((i + 1) * 5).padStart(2)} km  ${t}  ${hms(cum)}    ${ms(s / 5)}`);
});
const ls = toS(lastLeg.time); cum += ls;
console.log(`${DIST} km ${lastLeg.time}  ${hms(cum)}    ${ms(ls / lastLeg.km)}  (last ${lastLeg.km.toFixed(3)} km)`);
console.log("FINISH TIME:", hms(cum), "(" + cum + " s)");
console.log("AVERAGE PACE:", ms(cum / DIST), "/km");
console.log("km-marker fractions of the route (5 km steps):", splits5k.map((_, i) => +(((i + 1) * 5) / DIST).toFixed(4)).join(", "));
const secs = splits5k.map(toS), mn = Math.min(...secs), mx = Math.max(...secs);
console.log("fastest 5 km:", ms(mn), " slowest 5 km:", ms(mx));
console.log("JSON:", JSON.stringify({ splits: splits5k, finishS: cum, finish: hms(cum), pace: ms(cum / DIST), frac: splits5k.map((_, i) => ((i + 1) * 5) / DIST) }));
