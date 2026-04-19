/**
 * BootScene — Asset Preloader
 *
 * The first scene Phaser runs. Its only job is to load external assets
 * (images, audio, tilemaps) before any other scene starts.
 *
 * WHY a separate boot scene?
 * ──────────────────────────
 * Loading assets takes time. If we tried to use a sprite in TitleScene
 * before it was downloaded, we'd get a blank square. BootScene gives us
 * a single place to load everything, then hand off to TitleScene once
 * the browser has all files it needs.
 *
 * For now the game uses no external files (backgrounds are drawn with
 * Phaser Graphics, characters are emoji Text objects). This scene is a
 * placeholder ready for when you add real pixel-art assets:
 *
 *   this.load.image('marco', 'assets/marco_idle.png');
 *   this.load.spritesheet('marco_walk', 'assets/marco_walk.png', { frameWidth: 32, frameHeight: 48 });
 *   this.load.audio('theme', 'assets/music/theme.ogg');
 */

import { buildCharacterTextures } from '../game/characters.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // No external files — backgrounds and characters are drawn procedurally
  }

  create() {
    buildCharacterTextures(this);
    this.scene.start('TitleScene');
  }
}
