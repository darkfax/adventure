/**
 * state.js — Game State Management
 *
 * This module is the single source of truth for everything that can
 * change during a playthrough: the current scene, items the player
 * carries, events that have happened, and what the player is doing.
 *
 * WHY a separate state module?
 * ─────────────────────────────
 * In many beginner games, state lives in a global variable touched by
 * every file. That works, but it becomes hard to answer "who changed
 * this value?" as the code grows.
 *
 * Here, all reads and writes go through explicit functions (called
 * "getters" and "setters"). Other modules import only what they need,
 * and nothing can accidentally overwrite state in unexpected ways.
 *
 * HOW MODULES IMPORT THIS:
 *   import { getScene, setScene, hasItem, addItem } from './state.js';
 */

// ── THE STATE OBJECT ──────────────────────────────────────────────────────────
//
// This object is private to this module — the `const` keyword prevents
// reassigning the variable, but more importantly, no other file imports
// `state` directly. They must use the functions below.
//
// Fields:
//   scene     — id of the room the player is currently in (matches SCENES keys)
//   inventory — array of item ids the player is carrying
//   flags     — key/value pairs recording things that happened
//                 e.g. flags['retro_open'] = true when the back door is unlocked
//   verb      — the action the player has selected ('walk', 'look', 'pick', …)
//   armed     — item id ready to use on something, or null
//                 e.g. if the player clicks USE then clicks the hammer,
//                 armed = 'martello', and the next click on a scene object
//                 will try "use martello on <that object>"

const state = {
  scene:     'appartamento',
  inventory: [],
  flags:     {},
  verb:      'walk',
  armed:     null,
};


// ── SCENE ─────────────────────────────────────────────────────────────────────

export function getScene()   { return state.scene; }
export function setScene(id) { state.scene = id; }


// ── VERB ──────────────────────────────────────────────────────────────────────
//
// Selecting a verb also clears the armed item, because starting a new action
// cancels the previous "use X on …" gesture.

export function getVerb()   { return state.verb; }
export function setVerb(id) { state.verb = id; state.armed = null; }


// ── ARMED ITEM ────────────────────────────────────────────────────────────────
//
// "Armed" means: the player clicked USE, then clicked an inventory item.
// The item is now "loaded" and the next click on a scene object will
// attempt a USE <item> ON <object> combination.

export function getArmed()    { return state.armed; }
export function setArmed(id)  { state.armed = id; }
export function clearArmed()  { state.armed = null; }


// ── INVENTORY ─────────────────────────────────────────────────────────────────
//
// getInventory() returns a copy of the array (via spread [...])
// so callers cannot accidentally mutate the real inventory.

export function getInventory() { return [...state.inventory]; }
export function hasItem(id)    { return state.inventory.includes(id); }

export function addItem(id) {
  // Guard against duplicates — each item can only be carried once
  if (!state.inventory.includes(id)) state.inventory.push(id);
}

export function removeItem(id) {
  state.inventory = state.inventory.filter(i => i !== id);
}


// ── FLAGS ─────────────────────────────────────────────────────────────────────
//
// Flags are boolean markers for things that happened in the game world.
// Examples:
//   'retro_open'              — the back door of the pizzeria is unlocked
//   'trasmettitore_distrutto' — the transmitter has been smashed
//   'talked_franco'           — Marco has spoken to Franco at least once
//   'gone_stagnola'           — the stagnola was picked up (no longer in scene)
//
// Flags are only ever set to true, never unset during a playthrough.
// (On game reset, the entire flags object is replaced with {}.)

export function getFlag(key) { return !!state.flags[key]; }
export function setFlag(key) { state.flags[key] = true; }


// ── SAVE / LOAD / RESET ───────────────────────────────────────────────────────
//
// localStorage is a simple key/value store built into every browser.
// JSON.stringify() converts the state object into a text string for storage.
// JSON.parse() converts it back into a JavaScript object on load.

const SAVE_KEY = 'kraken_save';

export function saveGame() {
  const data = {
    scene:     state.scene,
    inventory: state.inventory,
    flags:     state.flags,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadSave() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;  // nothing saved yet

  const saved = JSON.parse(raw);
  state.scene     = saved.scene;
  state.inventory = saved.inventory;
  state.flags     = saved.flags;
  state.verb      = 'walk';
  state.armed     = null;
  return true;
}

export function resetGame() {
  state.scene     = 'appartamento';
  state.inventory = [];
  state.flags     = {};
  state.verb      = 'walk';
  state.armed     = null;
}
