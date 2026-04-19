# KRAKEN JR. — Invasione dei Cervelli Cosmici

A point-and-click adventure game inspired by Zak McKracken and the Alien Mindbenders (LucasArts, 1988).

Built in plain HTML/CSS/JavaScript as a learning project — every design decision is documented in the code.

---

## How to play

ES modules require a local web server (browsers block them on `file://`).

```bash
# from the project folder:
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

---

## Story

Marco Rossi, giornalista cosmico, suspects the local pizzeria is being used by aliens to mind-control the citizens of Porto Cosmo. He's right.

Navigate 6 locations, collect items, talk to NPCs, and destroy the alien transmitter on the rooftop before the whole town becomes a pizza-obsessed zombie hive.

---

## Project structure

```
index.html          entry point — HTML skeleton
styles.css          all visual styles (pixel font, scene layout, animations)

js/
  data.js           pure game content: scenes, objects, items, dialogues
  state.js          game state: inventory, flags, save/load
  engine.js         game logic: rendering, verbs, interactions, dialogue
  main.js           entry point: wires buttons and boots the game

data.js             (v1 reference — original monolithic data file)
engine.js           (v1 reference — original monolithic engine)
```

### Why four files?

| File | Responsibility | Can it change without affecting the others? |
|---|---|---|
| `data.js` | What the game says and contains | Yes — edit story without touching the engine |
| `state.js` | What has happened so far | Yes — swap to a database, server, etc. |
| `engine.js` | How the game runs | Yes — change mechanics without touching story |
| `main.js` | How the game starts | Yes — swap to keyboard controls, different UI |

This separation is called **separation of concerns** and is one of the most important ideas in software design.

---

## Key concepts illustrated in the code

| Concept | Where to find it |
|---|---|
| ES Modules (`import`/`export`) | top of every `js/` file |
| Pure data vs logic | `js/data.js` (zero functions) vs `js/engine.js` |
| State encapsulation | `js/state.js` — getters/setters pattern |
| Event listeners | `js/main.js` — `DOMContentLoaded`, `addEventListener` |
| CSS Grid layout | `styles.css` — `#gameScreen` |
| Closures | `js/engine.js` — `openDialogue()`, the `lineIndex` variable |
| Data-driven actions | `js/data.js` — `requireItem`, `setFlag`, `action` descriptors |

---

## Running the v1 reference files

The root `data.js` and `engine.js` are the original single-file version of the game kept for comparison. They are no longer loaded by `index.html`.
