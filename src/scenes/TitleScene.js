/**
 * TitleScene — Title Screen
 *
 * Displays the game title with an animated star field and UFO,
 * plus Start and Continue buttons.
 *
 * Phaser concepts used here:
 *  • Graphics  — drawing shapes (stars, nebula glow)
 *  • Text      — pixel-font labels and buttons
 *  • Tweens    — continuous float animation on the UFO
 *  • setInteractive / on('pointerdown') — clickable text buttons
 */

import { GAME_W, GAME_H, FONT } from '../constants.js';
import { resetGame, loadSave }   from '../game/state.js';
import { playTrack }             from '../audio/music.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    this.drawBackground();
    this.drawStars();
    this.addUFO();
    this.addTitle();
    this.addButtons();
  }

  // ── Background ─────────────────────────────────────────────────────────────

  drawBackground() {
    const g = this.add.graphics();

    // Deep space gradient: near-black top → dark blue-purple bottom
    g.fillGradientStyle(0x000008, 0x000008, 0x08053a, 0x08053a, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // Faint nebula cloud in the center
    g.fillStyle(0x180050, 0.25);
    g.fillEllipse(GAME_W / 2, GAME_H / 2, 700, 340);
    g.fillStyle(0x050030, 0.18);
    g.fillEllipse(GAME_W / 2 + 60, GAME_H / 2 - 40, 400, 200);
  }

  drawStars() {
    const g = this.add.graphics();

    // Fixed star positions — deterministic so it looks the same every time.
    // Each entry: [x%, y%, radius, alpha]
    const stars = [
      [5,4,1.5,0.9],[12,15,1,0.7],[18,8,2,1],[25,22,1,0.6],[33,5,1.5,0.85],
      [40,18,1,0.75],[48,3,2,0.9],[55,12,1,0.65],[62,25,1.5,0.8],[70,7,1,0.7],
      [77,19,2,0.95],[84,10,1,0.6],[90,28,1.5,0.85],[95,5,1,0.75],
      [8,35,1,0.5],[22,42,1.5,0.7],[38,38,1,0.6],[52,45,2,0.8],
      [65,40,1,0.55],[80,36,1.5,0.75],[92,44,1,0.65],
      [15,55,1,0.4],[30,60,1.5,0.6],[60,58,1,0.5],[75,62,2,0.7],[88,56,1,0.45],
    ];

    stars.forEach(([xPct, yPct, r, alpha]) => {
      const x = xPct / 100 * GAME_W;
      const y = yPct / 100 * GAME_H;

      // Outer glow
      g.fillStyle(0x8888ff, alpha * 0.3);
      g.fillCircle(x, y, r * 2.5);
      // Core
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(x, y, r);
    });

    // Animate a random subset to twinkle
    this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        g.setAlpha(0.88 + Math.random() * 0.12);
      },
    });
  }

  // ── UFO ────────────────────────────────────────────────────────────────────

  addUFO() {
    const ufo = this.add.text(GAME_W / 2, GAME_H / 2 - 130, '🛸', {
      fontSize: '72px',
    }).setOrigin(0.5);

    // Gentle floating loop
    this.tweens.add({
      targets:  ufo,
      y:        ufo.y - 16,
      duration: 1800,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    // Subtle rotation
    this.tweens.add({
      targets:  ufo,
      angle:    6,
      duration: 2400,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  // ── Title text ─────────────────────────────────────────────────────────────

  addTitle() {
    // Main title
    this.add.text(GAME_W / 2, GAME_H / 2 - 28, 'KRAKEN JR.', {
      fontFamily: FONT,
      fontSize:   '28px',
      color:      '#ffdd57',
      stroke:     '#7a5a00',
      strokeThickness: 4,
      shadow: { x: 4, y: 4, color: '#000', fill: true },
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(GAME_W / 2, GAME_H / 2 + 14, 'Invasione dei Cervelli Cosmici', {
      fontFamily: FONT,
      fontSize:   '8px',
      color:      '#7ec8e3',
      align:      'center',
    }).setOrigin(0.5);

    // Credits
    this.add.text(GAME_W / 2, GAME_H / 2 + 38, "Un'avventura di Marco Rossi, giornalista cosmico", {
      fontFamily: FONT,
      fontSize:   '6px',
      color:      '#5a5a7a',
      align:      'center',
    }).setOrigin(0.5);
  }

  // ── Buttons ────────────────────────────────────────────────────────────────

  addButtons() {
    this.addButton(GAME_W / 2, GAME_H / 2 + 90, '▶  INIZIA L\'AVVENTURA', () => {
      playTrack('title');
      resetGame();
      this.scene.start('GameScene');
      this.scene.launch('UIScene');
    });

    const continueBtn = this.addButton(GAME_W / 2, GAME_H / 2 + 128, '↺  CONTINUA', () => {
      if (loadSave()) {
        playTrack('title');
        this.scene.start('GameScene');
        this.scene.launch('UIScene');
      } else {
        continueBtn.setText('  Nessun salvataggio  ');
        this.time.delayedCall(1800, () => continueBtn.setText('↺  CONTINUA'));
      }
    }, true);
  }

  /**
   * Create a clickable pixel-font button.
   * @param {number}   x       — center x
   * @param {number}   y       — center y
   * @param {string}   label
   * @param {Function} onClick
   * @param {boolean}  small   — smaller font for secondary buttons
   * @returns {Phaser.GameObjects.Text}
   */
  addButton(x, y, label, onClick, small = false) {
    const btn = this.add.text(x, y, label, {
      fontFamily: FONT,
      fontSize:   small ? '7px' : '9px',
      color:      small ? '#5a5a7a' : '#7ec8e3',
      padding:    { x: 18, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Draw border around button
    const border = this.add.graphics();
    const drawBorder = (color) => {
      border.clear();
      border.lineStyle(2, color, 1);
      const b = btn.getBounds();
      border.strokeRect(b.left, b.top, b.width, b.height);
    };
    drawBorder(small ? 0x5a5a7a : 0x7ec8e3);

    btn.on('pointerover', () => {
      btn.setColor('#ffffff');
      drawBorder(0xffffff);
    });
    btn.on('pointerout', () => {
      btn.setColor(small ? '#5a5a7a' : '#7ec8e3');
      drawBorder(small ? 0x5a5a7a : 0x7ec8e3);
    });
    btn.on('pointerdown', onClick);

    return btn;
  }
}
