# Aim Up (Reaction Race)

A lightweight aim + reaction training web app.

Click the moving target as quickly and accurately as you can. The app tracks your accuracy, misses, reaction time, and precision (how close your click was to the target center). You can run it in a normal 2D grid view or switch to a 3D arena.

## Features

- Moving target practice (2D)
- 3D arena view (3D)
- Modes
  - Practice
  - 10 / 20 / 30 clicks
  - Timed: 30s / 60s
- Live stats
  - Accurate clicks, misses, accuracy %
  - Fastest and average reaction time
  - Precision: last / best / average
- Adjustable difficulty + appearance
  - Dot speed
  - Dot size
  - Dot color
  - Dot shape

## How to Run

### Option A: Open the file

Open `index.html` in your browser.

### Option B: Run a local server (recommended)

Some browsers restrict certain features when opening files directly. A simple local server avoids that.

Python:

```bash
python -m http.server 5173
```

Then visit:

- http://localhost:5173

## How to Play

- Click **Start** to begin.
- Click the dot/target as it appears.
- Clicking anywhere else counts as a miss.
- Choose a **Race Mode** to play for a click count or a time limit.
- Use the sliders to adjust **Dot Speed** and **Dot Size**.
- Change **Dot Color** and **Dot Shape** to vary visibility.
- Use **Arena View** to toggle the 3D arena.

## Project Structure

- `index.html` — UI markup
- `styles.css` — styling (responsive layout included)
- `script.js` — game logic + stats + 2D/3D/WebGL target handling

## License

MIT — see `LICENSE`.
