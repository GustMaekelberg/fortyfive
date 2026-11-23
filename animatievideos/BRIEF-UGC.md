# Brief: "screen-recording" style video of the REAL Wedding Budget & Planner spreadsheet

You build ONE vertical video (1080x1920, 12-16 s, silent, 30 fps) with HyperFrames + GSAP that looks like
someone recorded their phone screen while using a spreadsheet, with casual caption text on top - the
faceless "UGC" format common on Reels/TikTok. No people, no generative AI imagery. Everything is HTML/CSS/SVG
plus REAL renders of the actual product file.

Read `BRIEF.md` in the same folder first for the framework rules, the workflow (check -> snapshot -> look ->
fix -> render) and the honesty rules; read the reference `videos/debt-free-date/index.html` and its
`assets/kit.js` for the GSAP/HyperFrames conventions (root composition, one paused timeline, clips, K helpers).
This brief OVERRIDES the look: this video is not the cartoon style of the reference.

## The real product and its renders (use these, do not redraw the sheet)
The product is a real Excel/Google-Sheets file. It has been rendered tab by tab in several states:
`(map met renders van het spreadsheet per toestand)/<state>/page-N.png`
(2200x1700 px each) with `values.json` next to them holding the exact numbers of that state.
Pages: 1 = "Start here", 2 = "Dashboard", 3 = "Budget", 4 = "Payments", 5 = "Guests", 6 = "Vendors", 7-8 = "Checklist".
States: `base` (100 guests, on budget), `guests120` (120 guests: $1,700 over budget), `venue_paid`
(the Mar 1 venue payment marked paid), `flowers_over` (florist's final price $1,800 instead of $1,400: $400 over).
Open the PNGs you need with the Read tool and study them before you design anything. Copy the PNGs you use into
your project's `assets/sheet/` folder and show them with <img> inside an overflow-hidden viewport; pan and zoom
with GSAP (x, y, scale on a wrapper) like a finger scrolling or pinching. A change in the sheet is shown by
switching from one state's image to the other state's image at the moment "Enter" is pressed (spreadsheets
recalculate instantly), followed by a short highlight pulse on each cell that changed. Never paint invented
numbers over the renders: every figure the viewer sees must come from the real render of that state. The only
thing you may draw over a cell is the text being typed in the selected cell (and it must equal the value that
the next state really contains).

## The look
- Full frame = a phone screen: a slim status bar at the very top (time, signal, battery as small SVG shapes),
  then a plain app toolbar (back chevron, the file name "Wedding Budget and Planner", a few neutral icons),
  a formula bar ("fx" + the content of the selected cell), the sheet viewport, and at the bottom a row of
  sheet tabs (Start here, Dashboard, Budget, Payments, Guests, Vendors, Checklist) with the active one highlighted.
  Generic spreadsheet chrome only: NO Google, Microsoft, Apple or other brand names, logos or look-alikes.
- A touch indicator: a soft translucent dot that appears where the "finger" taps, with a quick ripple; when the
  sheet scrolls, the dot drags. Tab switches happen by tapping a tab.
- Caption text: the native social look - short lines of bold text on white rounded boxes with dark text (or the
  reverse), stacked, slightly casual. All caption text must sit inside the text-safe box described in BRIEF.md
  (x 120-888, y 296-1248; below y = 840 keep it left of x = 780). Put the sheet layers under `data-layout-ignore`
  (they are footage), but frame the pan/zoom so the cells that matter at each moment are inside the safe box and
  large enough to read on a phone (the numbers that matter at least ~44 px tall on the 1080-wide canvas).
- It should feel like a real recording: natural pacing, small pauses before a tap, no slick wipes or confetti.
  Cuts between moments are fine. The first frame (t = 0) must already show the hook caption and the sheet.

## Structure (12-16 s)
1. Hook (0-2.5 s): caption + the relevant part of the sheet already on screen.
2. The action: tap, type or choose a value, press enter.
3. The payoff: the sheet's own numbers change; highlight them; one or two short captions say what happened.
4. End card (last ~2.5 s): a clean card over a dimmed sheet with the product name "The Wedding Budget Sheet",
   "Excel + Google Sheets" (allowed here as plain compatibility text), "Link in bio", and a small "Example numbers" line.

## Honesty rules for captions
- Second person or neutral ("POV: 20 guests can't make it", "watch the catering line"). No first-person claims of
  having used it, no "it saved me/us", no testimonials, no reviews, no "best", no guarantees, no urgency.
- Any number in a caption must equal what the sheet shows or be simple arithmetic on it that you verify in `calc.mjs`.
- Show "Example numbers" at least once besides the end card if numbers are central to the hook.

## Deliver
`out/<slug>.mp4` rendered with `npx hyperframes render -q standard -w 2 -o out/<slug>.mp4`, check passed with
0 errors (same acceptable warnings as in BRIEF.md), at least two look-and-fix rounds on the snapshot contact
sheets, and a report: path, duration, what happens second by second, every number shown and the state it comes
from, and anything imperfect you could not fix.
