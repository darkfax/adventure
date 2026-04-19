/**
 * EndScene — Victory screen (matches Title / HUD cinematic chrome)
 */

import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT } from '../constants.js';
import { resetGame } from '../game/state.js';
import { FONT_CINEMA } from '../game/visualTheme.js';
import { ensureSharedTextures } from '../game/sharedTextures.js';

export class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' });
  }

  create() {
    ensureSharedTextures(this);
    this._buildTrophyTexture();

    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x001808, 0x002818, 0x040510, 0x050510, 1, 1, 1, 1);
    sky.fillRect(0, 0, GAME_W, GAME_H);
    sky.fillGradientStyle(0x00ff88, 0x00c8ff, 0x000000, 0x000000, 0.08, 0.06, 0, 0);
    sky.fillRect(0, 0, GAME_W, GAME_H * 0.55);

    const glow = this.add.graphics().setDepth(1);
    glow.fillStyle(0x57ff87, 0.12);
    glow.fillEllipse(GAME_W / 2, GAME_H * 0.32, 520, 280);
    glow.fillStyle(0x4eefff, 0.06);
    glow.fillEllipse(GAME_W / 2 + 40, GAME_H * 0.28, 380, 200);

    this.add.particles(GAME_W / 2, GAME_H * 0.28, 'fx_flare', {
      speed: { min: 20, max: 90 },
      angle: { min: 260, max: 280 },
      scale: { start: 0.25, end: 0 },
      lifespan: { min: 900, max: 2200 },
      frequency: 70,
      blendMode: 'ADD',
      tint: [0x57ff87, 0xffdd57, 0x4eefff],
    }).setDepth(2);

    const trophy = this.add.image(GAME_W / 2, GAME_H * 0.28, 'end_trophy').setDepth(3);
    this.tweens.add({
      targets: trophy,
      y: trophy.y - 12,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const cx = GAME_W / 2;
    const y0 = GAME_H * 0.46;

    [
      { off: 5, color: '#00ff88', a: 0.2 },
      { off: 3, color: '#4eefff', a: 0.28 },
      { off: 1, color: '#ffdd57', a: 0.35 },
    ].forEach((layer) => {
      this.add
        .text(cx + layer.off * 0.25, y0 + layer.off * 0.15, 'VITTORIA COSMICA!', {
          fontFamily: FONT,
          fontSize: '22px',
          color: layer.color,
        })
        .setOrigin(0.5)
        .setDepth(4)
        .setAlpha(layer.a)
        .setBlendMode(Phaser.BlendModes.ADD);
    });

    this.add
      .text(cx, y0, 'VITTORIA COSMICA!', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#e8fff0',
        stroke: '#005520',
        strokeThickness: 4,
        shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 2, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(5);

    const body = [
      'Marco Rossi ha salvato Porto Cosmo.',
      'Il trasmettitore è distrutto.',
      'Plok se n\'è andato (con l\'accordo sulla pizza).',
      '',
      'Il Gazzettino Cosmico ha finalmente uno scoop vero.',
    ].join('\n');

    this.add
      .text(cx, y0 + 52, body, {
        fontFamily: FONT_CINEMA,
        fontSize: '11px',
        color: '#a8c0d8',
        align: 'center',
        lineSpacing: 12,
        letterSpacing: '0.04em',
      })
      .setOrigin(0.5)
      .setDepth(5);

    this._addGlassButton(cx, GAME_H * 0.82, '↺  RICOMINCIA', () => {
      resetGame();
      this.scene.stop('UIScene');
      this.scene.start('TitleScene');
    });

    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  _buildTrophyTexture() {
    if (this.textures.exists('end_trophy')) return;
    const g = this.add.graphics();
    const w = 72;
    const h = 80;
    const cx = w / 2;
    // Cup bowl
    g.fillStyle(0xffdd57, 1);
    g.fillTriangle(cx - 28, 28, cx + 28, 28, cx, 52);
    g.fillStyle(0xc8a020, 1);
    g.fillTriangle(cx - 26, 30, cx + 26, 30, cx, 50);
    // Handles
    g.lineStyle(4, 0xffdd57, 1);
    g.strokeEllipse(cx - 32, 38, 14, 18);
    g.strokeEllipse(cx + 32, 38, 14, 18);
    // Stem
    g.fillStyle(0xffdd57, 1);
    g.fillRect(cx - 4, 52, 8, 18);
    g.fillStyle(0xa08018, 1);
    g.fillRect(cx - 3, 54, 6, 14);
    // Base
    g.fillStyle(0xffdd57, 1);
    g.fillEllipse(cx, h - 8, 44, 14);
    g.lineStyle(2, 0xfff8a8, 0.5);
    g.strokeEllipse(cx, h - 8, 44, 14);
    // Shine
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(cx - 8, 36, 12, 8);
    g.generateTexture('end_trophy', w, h);
    g.destroy();
  }

  _addGlassButton(x, y, label, onClick) {
    const depth = 6;
    const btn = this.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: '9px',
        color: '#d8f8ff',
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setInteractive({ useHandCursor: true });

    const bg = this.add.graphics().setDepth(depth);

    const paint = (hover) => {
      const b = btn.getBounds();
      const padX = 14;
      const padY = 10;
      const bx = b.x - padX;
      const by = b.y - padY;
      const bw = b.width + padX * 2;
      const bh = b.height + padY * 2;
      const r = 10;
      bg.clear();
      bg.fillStyle(hover ? 0x1a3a52 : 0x0c1828, hover ? 0.55 : 0.42);
      bg.fillRoundedRect(bx, by, bw, bh, r);
      bg.lineStyle(2, hover ? 0xffffff : 0x4eefff, hover ? 0.95 : 0.55);
      bg.strokeRoundedRect(bx, by, bw, bh, r);
      bg.lineStyle(1, 0xa8f6ff, hover ? 0.35 : 0.15);
      bg.strokeRoundedRect(bx + 2, by + 2, bw - 4, bh - 4, r - 2);
    };

    paint(false);
    btn.on('pointerover', () => {
      btn.setColor('#ffffff');
      paint(true);
    });
    btn.on('pointerout', () => {
      btn.setColor('#d8f8ff');
      paint(false);
    });
    btn.on('pointerdown', onClick);
  }
}
