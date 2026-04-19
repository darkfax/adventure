/**
 * state.test.js — automated checks for game state logic
 *
 * A "test" runs your code and compares the result to what you expect.
 * If something breaks later, tests fail and you catch bugs early.
 *
 * We test pure rules here (inventory, flags, verbs). Phaser scenes stay
 * manual playtesting for now — that's normal for small games.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetGame,
  getScene,
  setScene,
  getInventory,
  hasItem,
  addItem,
  removeItem,
  getVerb,
  setVerb,
  getArmed,
  setArmed,
  getFlag,
  setFlag,
  saveGame,
  loadSave,
} from './state.js';

// Fresh state before every test so one test cannot leak into the next.
beforeEach(() => {
  resetGame();
});

describe('inventory', () => {
  it('adds an item once (no duplicates)', () => {
    addItem('chiave');
    addItem('chiave');
    expect(getInventory()).toEqual(['chiave']);
    expect(hasItem('chiave')).toBe(true);
  });

  it('removeItem removes only that id', () => {
    addItem('a');
    addItem('b');
    removeItem('a');
    expect(getInventory()).toEqual(['b']);
  });
});

describe('verb and armed item', () => {
  it('setVerb clears armed (new action cancels use-on gesture)', () => {
    setArmed('martello');
    expect(getArmed()).toBe('martello');

    setVerb('look');
    expect(getVerb()).toBe('look');
    expect(getArmed()).toBeNull();
  });
});

describe('flags', () => {
  it('getFlag is false until set, then true', () => {
    expect(getFlag('retro_open')).toBe(false);
    setFlag('retro_open');
    expect(getFlag('retro_open')).toBe(true);
  });
});

describe('saveGame / loadSave', () => {
  // Browsers have localStorage; Node does not — we stub a tiny fake store.
  let storage;

  beforeEach(() => {
    storage = {};
    globalThis.localStorage = {
      getItem: (key) => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null),
      setItem: (key, value) => {
        storage[key] = String(value);
      },
      removeItem: (key) => {
        delete storage[key];
      },
    };
    resetGame();
  });

  it('loadSave returns false when nothing is saved', () => {
    expect(loadSave()).toBe(false);
    expect(getScene()).toBe('appartamento');
  });

  it('save then load restores scene, inventory, and flags', () => {
    setScene('pizzeria');
    addItem('stagnola');
    setFlag('talked_franco');
    saveGame();

    // Simulate a "fresh page": reset memory, then load from fake storage.
    resetGame();
    expect(getScene()).toBe('appartamento');
    expect(hasItem('stagnola')).toBe(false);

    expect(loadSave()).toBe(true);
    expect(getScene()).toBe('pizzeria');
    expect(getInventory()).toEqual(['stagnola']);
    expect(getFlag('talked_franco')).toBe(true);
    // loadSave always resets verb/armed for safety
    expect(getVerb()).toBe('walk');
    expect(getArmed()).toBeNull();
  });
});
