# Wave Master

Educational 3D wave management simulator for League of Legends using Three.js.

## Features

- **Tutorial Mode**: Learn wave management concepts (Freeze, Slow Push, Fast Push, Bounce)
- **Freeplay Mode**: Free practice with auto-spawning waves every 15 seconds
- **3D Environment**: Lane with towers, river, bushes using Three.js
- **Real-time Wave State Detection**: EVEN, FREEZE, SLOW PUSH, FAST PUSH, CRASH

## Controls

| Key | Action |
|-----|--------|
| ZQSD / Arrows | Move champion |
| Click | Attack minion |
| Space | Attack lowest health enemy |
| ESC | Pause |

## Run Locally

```bash
npx -y serve . -p 3000
# Open http://localhost:3000
```

## Tech Stack

- Three.js (3D rendering)
- Vanilla JavaScript (ES6 modules)
- CSS3 (glassmorphism effects)
- HTML5
