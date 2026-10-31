# Cube Helper 🧊

A tiny, phone-friendly web app that helps a kid learn to solve a 3×3 Rubik's Cube with the **beginner layer-by-layer method**. Scan the cube with the phone camera (or tap the colors in), then follow along one move at a time.

**Live:** https://scottcorgan.github.io/cube-helper/

## What it does
- **Scan:** a live camera view with a 3×3 square. Hold up the side it asks for; when the cube fills the square, the middle sticker is the right color, and you hold still for a moment, it takes the picture by itself (flash + beep), reads the colors, and tells you which side to show next. Shows the wrong side? It says so. There's still a manual snap button, a photo-upload fallback, and "Tap in the colors". Every sticker can be fixed by tapping it.
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
npm test                          # node --test: cube model, 1000-scramble solver, validation, color reading, live face detection
python3 -m http.server 8000       # then open http://localhost:8000
cd scripts && npm install          # puppeteer-core, for headless checks
node make_video.mjs && node live.mjs http://127.0.0.1:8000/   # fake-camera auto-capture run
node make_video.mjs /tmp/fake/w.y4m 1280 720 && node flow.mjs /tmp/fake/w.y4m http://127.0.0.1:8000/ extra
                                  # full phone flow: live scan -> review -> every walkthrough card; checks the moves solve the cube
                                  # (width/height = camera shape; add `turn` to make_video to hold the yellow side the wrong way up)
node paint_check.mjs              # tap-in mode end to end (needs /tmp/fake/cube.json from make_video)
node sw_check.mjs http://127.0.0.1:8000/   # service worker caches the current version and works offline
```
Screenshots from the scripts go to `screenshots/` and are not committed.
