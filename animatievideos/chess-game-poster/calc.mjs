// Build-time only: replays "The Immortal Game" (Anderssen vs Kieseritzky, London 1851) with chess.js,
// which rejects any illegal move, and prints the data the video embeds.
// Run from this folder: node calc.mjs   (chess.js is installed in the workspace root)
import { Chess } from "chess.js";

const PGN = `[Event "Casual game"]
[Site "London"]
[Date "1851.06.21"]
[White "Adolf Anderssen"]
[Black "Lionel Kieseritzky"]
[Result "1-0"]

1.e4 e5 2.f4 exf4 3.Bc4 Qh4+ 4.Kf1 b5 5.Bxb5 Nf6 6.Nf3 Qh6 7.d3 Nh5 8.Nh4 Qg5
9.Nf5 c6 10.g4 Nf6 11.Rg1 cxb5 12.h4 Qg6 13.h5 Qg5 14.Qf3 Ng8 15.Bxf4 Qf6
16.Nc3 Bc5 17.Nd5 Qxb2 18.Bd6 Bxg1 19.e5 Qxa1+ 20.Ke2 Na6 21.Nxg7+ Kd8
22.Qf6+ Nxf6 23.Be7# 1-0`;

const g = new Chess();
g.loadPgn(PGN); // throws on any illegal move
const hist = g.history({ verbose: true });

// compact rows: [from, to, piece, color, san, captured-or-empty]
const moves = hist.map((m) => [m.from, m.to, m.piece, m.color, m.san, m.captured || ""]);
console.log("// half-moves:", hist.length, " full moves:", Math.ceil(hist.length / 2));
console.log("// checkmate:", g.isCheckmate(), " result:", g.header().Result);
console.log("// captures:", hist.filter((m) => m.captured).length,
  " white captures:", hist.filter((m) => m.captured && m.color === "w").length,
  " black captures:", hist.filter((m) => m.captured && m.color === "b").length);
console.log("// pieces left: white", g.board().flat().filter((p) => p && p.color === "w").length,
  " black", g.board().flat().filter((p) => p && p.color === "b").length);
console.log("const MOVES = " + JSON.stringify(moves) + ";");

// final position: [square, piece, color]
const fin = [];
g.board().forEach((row) => row.forEach((p) => { if (p) fin.push([p.square, p.type, p.color]); }));
console.log("const FINAL = " + JSON.stringify(fin) + ";");
console.log("// FEN: " + g.fen());
const last = hist[hist.length - 1];
console.log("// mating move:", last.san, "from", last.from, "to", last.to);
