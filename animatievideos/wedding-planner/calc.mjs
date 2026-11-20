// Example numbers for the Wedding Budget Sheet test video. Every figure on screen comes from here.
const budget = 25000;
const perGuest = 85;           // catering price per guest (example)
const guestsBefore = 120, guestsAfter = 100;
const fixed = { Venue: 8000, Photos: 3200, Music: 1500, "Dress & suit": 2400 };
const flowersQuote = 1800, flowersCap = 1400; // flowers category budget is $1,400
const cateringBefore = guestsBefore * perGuest;
const cateringAfter = guestsAfter * perGuest;
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const plannedStart = sum(fixed) + cateringBefore + flowersQuote;
const plannedAfterFlowers = sum(fixed) + cateringBefore + flowersCap;
const plannedEnd = sum(fixed) + cateringAfter + flowersCap;
const paid = { Venue: 3000, Catering: 2000, Photos: 1000, Music: 500, "Dress & suit": 2400, Flowers: 0 };
const paidTotal = sum(paid);
const due = plannedEnd - paidTotal;
// Venue is paid in installments: $3,000 deposit (paid), then $2,500 due Mar 1, then $2,500 later.
const venueInstallments = [3000, 2500, 2500];
if (venueInstallments.reduce((a, b) => a + b) !== fixed.Venue) throw new Error("venue installments");
const nextDue = { what: "Venue", amount: venueInstallments[1], date: "Mar 1" };
const out = {
  budget, perGuest, guestsBefore, guestsAfter, cateringBefore, cateringAfter,
  guestSaving: cateringBefore - cateringAfter,
  flowersQuote, flowersCap, flowersOver: flowersQuote - flowersCap,
  plannedStart, overStart: plannedStart - budget,
  plannedAfterFlowers, overAfterFlowers: plannedAfterFlowers - budget,
  plannedEnd, overEnd: plannedEnd - budget,
  pctStart: Math.round(plannedStart / budget * 100), pctEnd: Math.round(plannedEnd / budget * 100),
  paidTotal, due, check: paidTotal + due === budget, paidShare: +(paidTotal / budget).toFixed(4),
  nextDue,
};
console.log(JSON.stringify(out, null, 2));
