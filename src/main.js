/**
 * main.js — Phaser Game Entry Point
 *
 * Creates the Phaser.Game instance with the global configuration.
 * Phaser handles the canvas, WebGL renderer, input, and the scene stack.
 *
 * WHY Phaser instead of plain HTML/CSS?
 * ──────────────────────────────────────
 * Phaser gives us:
 *  • WebGL rendering — hardware-accelerated graphics, not CSS boxes
 *  • Scene management — each screen is a class with lifecycle methods
 *  • Tweens — smooth animations without manual requestAnimationFrame
 *  • Input — unified pointer/mouse/touch with built-in hover detection
 *  • Depth sorting — z-order for overlapping sprites
 *  • Camera system — panning, zoom, fade effects for free
 */

import Phaser from 'phaser';
import { BootScene }  from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene }  from './scenes/GameScene.js';
import { UIScene }    from './scenes/UIScene.js';
import { EndScene }   from './scenes/EndScene.js';
import { GAME_W, GAME_H } from './constants.js';

const config = {
  type: Phaser.AUTO,       // Use WebGL if available, Canvas as fallback
  width:  GAME_W,
  height: GAME_H,
  backgroundColor: '#050510',
  parent: 'game',          // Mount inside <div id="game">
  pixelArt: true,          // Disable anti-aliasing for crisp pixel rendering
  roundPixels: true,       // Snap sprites to whole pixels

  // Scenes are registered in order; the first one (BootScene) starts automatically.
  // Others are started explicitly via this.scene.start() or this.scene.launch().
  scene: [BootScene, TitleScene, GameScene, UIScene, EndScene],
};

window.__game = new Phaser.Game(config);
