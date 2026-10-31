# Cube Helper 🧊

A tiny, phone-friendly web app that helps a kid learn to solve a 3×3 Rubik's Cube with the **beginner layer-by-layer method**. Scan the cube with the phone camera (or tap the colors in), then follow along one move at a time.

**Live:** https://scottcorgan.github.io/cube-helper/

## What it does
- **Scan:** a guided photo of each of the 6 sides, with a picture showing exactly how to hold the cube. Every sticker can be fixed by tapping it.
- **Check:** makes sure the colors describe a real cube (9 of each color, real pieces, no impossible twist, flip or swap), and explains what probably got misread.
- **Solve:** a beginner-method solver (daisy → white cross → white corners → middle layer → yellow cross → yellow edges → yellow corners). Each move is shown on a picture of the cube with a big arrow, plain kid words and the move letter, plus a "why" for every step and a "tell me more" for grown-ups.
- **Learn the moves**, and a **practice** mode.

## Privacy
This is a plain static site. There's no server, no accounts, no ads, no analytics and no tracking. Photos are read on the phone and never uploaded. It works offline after the first visit.

## Tips for good scans
- Use even light, like daylight near a window. Avoid a strong shadow across the cube and shiny glare.
- Fill the grid with one side of the cube, keep it square, and get the stickers inside the boxes.
- Red and orange are the hardest pair to tell apart. Double-check anything outlined in pink.
- The hold pictures assume the standard color scheme: white opposite yellow, green opposite blue, red opposite orange.

## Develop
```
npm test                          # node --test: cube model, 1000-scramble solver, validation, color reading
python3 -m http.server 8000       # then open http://localhost:8000
```
