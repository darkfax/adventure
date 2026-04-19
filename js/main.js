/**
 * main.js — Entry Point
 *
 * This is the first file the browser executes. Its only jobs are:
 *  1. Wait for the HTML to be ready (DOMContentLoaded)
 *  2. Attach event listeners to the buttons defined in index.html
 *  3. Start or load the game when the player clicks
 *
 * WHY a separate main.js?
 * ─────────────────────────
 * engine.js knows how to run a game, but it shouldn't know which HTML
 * buttons exist or when to start. Keeping that wiring here means you
 * could swap the UI (different buttons, keyboard shortcuts) without
 * touching the engine at all.
 *
 * ES MODULE IMPORTS:
 * ─────────────────────────────────────────────────────────────────────
 * `import { … } from './engine.js'` pulls in named exports from engine.js.
 * Because this file is loaded as <script type="module"> in index.html,
 * the browser automatically handles the full dependency chain:
 *   main.js → engine.js → state.js + data.js
 *
 * Static imports (the kind used here) are resolved before any code runs.
 * All four modules are downloaded and parsed, then this file executes.
 *
 * NOTE: ES modules require a web server — they use HTTP, not file://.
 * To run locally:
 *   python3 -m http.server 8000
 * Then open: http://localhost:8000
 */

import { goScene, buildVerbBar, renderInventory, setMsg, onSceneClick } from './engine.js';
import { resetGame, loadSave, getScene } from './state.js';


// ── BOOT ──────────────────────────────────────────────────────────────────────
//
// DOMContentLoaded fires when all HTML elements are in the DOM and ready.
// We must wait for it before calling getElementById() — if we ran this
// code immediately, the elements might not exist yet.

document.addEventListener('DOMContentLoaded', () => {

  // Title screen buttons
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('loadBtn').addEventListener('click',  loadGame);

  // End screen button
  document.getElementById('restartBtn').addEventListener('click', restartGame);

  // Scene area: clicking empty space moves the character (WALK verb).
  // Clicks on sprites/exits call e.stopPropagation() so they never reach here.
  document.getElementById('sceneArea').addEventListener('click', onSceneClick);

});


// ── GAME LIFECYCLE ────────────────────────────────────────────────────────────

/** Start a brand-new game from the beginning. */
function startGame() {
  resetGame();
  showGameScreen();
  buildVerbBar();
  renderInventory();
  goScene('appartamento');
}

/**
 * Resume from the last save stored in localStorage.
 * loadSave() returns false if there is no save, so we show a message instead.
 */
function loadGame() {
  const loaded = loadSave();
  if (!loaded) {
    // setMsg won't be visible on the title screen, so we use alert as fallback
    alert('Nessun salvataggio trovato.');
    return;
  }
  showGameScreen();
  buildVerbBar();
  renderInventory();
  // getScene() now returns the scene that was saved — restore it
  goScene(getScene());
}

/** Restart from scratch after the player has won. */
function restartGame() {
  resetGame();
  document.getElementById('endScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
  buildVerbBar();
  renderInventory();
  goScene('appartamento');
}


// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Switch the visible screen from title to game. */
function showGameScreen() {
  document.getElementById('titleScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
}
