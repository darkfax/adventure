/**
 * constants.js — Layout Dimensions
 *
 * All pixel measurements for the game canvas live here.
 * Changing these values resizes the entire game consistently.
 *
 * Canvas layout (800 × 600):
 * ┌──────────────────────────────┐  ← y = 0
 * │                              │
 * │         SCENE AREA           │  410 px  (playable viewport)
 * │                              │
 * ├──────────────────────────────┤  ← y = 410
 * │         MESSAGE BAR          │   50 px
 * ├─────────────────┬────────────┤  ← y = 460
 * │   VERB PANEL    │ INVENTORY  │  140 px
 * └─────────────────┴────────────┘  ← y = 600
 *  0               400            800
 */

export const GAME_W    = 800;
export const GAME_H    = 600;

export const SCENE_W   = 800;
export const SCENE_H   = 410;

export const MSG_Y     = SCENE_H;           // 410
export const MSG_H     = 50;

export const PANEL_Y   = MSG_Y + MSG_H;     // 460
export const PANEL_H   = GAME_H - PANEL_Y;  // 140
export const VERB_W    = 390;               // verb panel width
export const INV_X     = VERB_W + 20;       // inventory panel start x

// Font used throughout the game (loaded via Google Fonts in index.html)
export const FONT      = '"Press Start 2P"';
