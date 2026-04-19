# KRAKEN JR. — Invasione dei Cervelli Cosmici

A point-and-click adventure game inspired by Zak McKracken and the Alien Mindbenders (LucasArts, 1988).

Built with **Phaser 3** + **Vite** as a learning project — every design decision is documented in the code.

---

## How to run

```bash
npm install
npm run dev
```

Then open **http://localhost:5501** in your browser.

---

## Story

Marco Rossi, giornalista cosmico, suspects the local pizzeria is being used by aliens to mind-control the citizens of Porto Cosmo. He's right.

Navigate 6 locations, collect items, talk to NPCs, and destroy the alien transmitter on the rooftop before the whole town becomes a pizza-obsessed zombie hive.

---

## Project structure

```
index.html              entry point — canvas host + inline styles
vite.config.js          dev server config (port 5501)
package.json            dependencies: phaser, vite

src/
  main.js               Phaser.Game config, scene registration
  constants.js          all layout dimensions (canvas size, panel heights)

  data/
    data.js             pure game content: scenes, objects, items, dialogues

  game/
    state.js            game state: inventory, flags, verb, save/load

  scenes/
    BootScene.js        asset preloader → starts TitleScene
    TitleScene.js       title screen with animated UFO and start/continue buttons
    GameScene.js        main game: backgrounds, objects, character, interactions
    UIScene.js          persistent HUD overlay: verb bar, inventory, message bar, dialogue
    EndScene.js         victory screen with restart button
```

### Separation of concerns

| File | Responsibility | Can it change independently? |
|---|---|---|
| `data/data.js` | What the game says and contains | Yes — edit story without touching the engine |
| `game/state.js` | What has happened so far | Yes — swap to server storage, etc. |
| `scenes/GameScene.js` | How the world renders and responds | Yes — change mechanics without touching story |
| `scenes/UIScene.js` | The persistent HUD | Yes — redesign UI without touching game logic |

This separation is called **separation of concerns** and is one of the most important ideas in software design.

---

## Key concepts illustrated in the code

| Concept | Where to find it |
|---|---|
| ES Modules (`import`/`export`) | top of every `src/` file |
| Pure data vs logic | `data/data.js` (zero functions) vs `GameScene.js` |
| State encapsulation | `game/state.js` — getters/setters pattern |
| Multiple simultaneous scenes | `main.js` + `GameScene.create()` — `scene.launch('UIScene')` |
| Cross-scene communication | `GameScene` emits events → `UIScene` listens via `this.gameScene.events.on()` |
| Programmatic graphics | `GameScene._bgAppartamento()` etc. — Phaser Graphics API |
| Tweens | `GameScene._walkTo()` — smooth character movement |
| Camera effects | `GameScene._destroyTransmitter()` — flash + shake |
| Data-driven actions | `data/data.js` — `requireItem`, `setFlag`, `action` descriptors |
