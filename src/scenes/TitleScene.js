/**
 * TitleScene — Cinematic title screen
 *
 * Layered space backdrop (gradient, nebulae, horizon, star field), subtle
 * particles, procedural pixel UFO, glowing typography, and glass-style CTAs.
 */

import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT } from '../constants.js';
import { resetGame, loadSave } from '../game/state.js';
import { playTrack } from '../audio/music.js';

/** Display font for subtitle lines (loaded in index.html). */
const FONT_CINEMA = '"Orbitron", system-ui, sans-serif';

/** Deterministic PRNG so stars look the same every boot (stable art direction). */
function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    this._buildTextures();
    this._depth = { sky: 0, nebula: 2, planet: 4, stars: 6, haze: 8, vignette: 14, particles: 16, ufo: 18, title: 20, ui: 22 };

    this._drawSky();
    this._drawNebulae();
    this._drawPlanetSilhouette();
    this._drawStarField();
    this._drawHorizonHaze();
    this._drawVignette();
    this._addAmbientParticles();
    this._addUFO();
    this._addTitleBlock();
    this._addButtons();

    this.cameras.main.fadeIn(900, 0, 0, 0);
  }

  // ── Textures (one-shot, used by sprites / particles) ───────────────────────

  _buildTextures() {
    // Soft dot for dust / engine glow
    let g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 5);
    g.generateTexture('_ttl_flare', 12, 12);
    g.destroy();

    // Tiny star stamp
    g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture('_ttl_spark', 5, 5);
    g.destroy();

    // Pixel-art UFO (replaces emoji for crisp pixelArt rendering)
    g = this.add.graphics();
    const uw = 112;
    const uh = 64;
    const cx = uw / 2;
    // Engine wash
    g.fillStyle(0x4eefff, 0.22);
    g.fillTriangle(cx - 18, uh - 6, cx + 18, uh - 6, cx, uh + 28);
    // Shadow under disc
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(cx, uh - 10, 96, 18);
    // Main hull
    g.fillStyle(0x6a7a94, 1);
    g.fillEllipse(cx, uh / 2 - 6, 102, 34);
    g.fillStyle(0x8ea0b8, 1);
    g.fillEllipse(cx, uh / 2 - 10, 96, 26);
    // Rim lights
    g.lineStyle(2, 0x4eefff, 0.85);
    g.strokeEllipse(cx, uh / 2 - 8, 98, 30);
    // Dome
    g.fillStyle(0xa8f6ff, 0.55);
    g.fillEllipse(cx, uh / 2 - 18, 44, 22);
    g.fillStyle(0xd8ffff, 0.35);
    g.fillEllipse(cx - 8, uh / 2 - 22, 18, 10);
    // Port holes
    for (let i = -2; i <= 2; i++) {
      g.fillStyle(0xffe066, 0.95);
      g.fillCircle(cx + i * 16, uh / 2 - 4, 3);
      g.fillStyle(0xfff6c8, 0.5);
      g.fillCircle(cx + i * 16 - 1, uh / 2 - 5, 1.2);
    }
    // Antenna
    g.lineStyle(2, 0x9aa4b8, 1);
    g.lineBetween(cx, uh / 2 - 28, cx, 6);
    g.fillStyle(0xff3355, 1);
    g.fillCircle(cx, 6, 4);
    g.generateTexture('title_ufo', uw, uh);
    g.destroy();
  }

  // ── Sky stack ───────────────────────────────────────────────────────────────

  _drawSky() {
    const sky = this.add.graphics().setDepth(this._depth.sky);
    sky.fillGradientStyle(0x020014, 0x050028, 0x0a0538, 0x12043a, 1, 1, 1, 1);
    sky.fillRect(0, 0, GAME_W, GAME_H);
    // Soft top aurora sheen
    sky.fillGradientStyle(0x00ffd0, 0x6a00ff, 0x000000, 0x000000, 0.12, 0.08, 0, 0);
    sky.fillRect(0, 0, GAME_W, GAME_H * 0.45);
  }

  _drawNebulae() {
    const blob = (gx, x, y, rx, ry, color, alpha) => {
      gx.fillStyle(color, alpha);
      gx.fillEllipse(x, y, rx, ry);
    };

    const n1 = this.add.graphics().setDepth(this._depth.nebula);
    blob(n1, GAME_W * 0.5, GAME_H * 0.42, 720, 360, 0x6a1fa8, 0.2);
    blob(n1, GAME_W * 0.55, GAME_H * 0.38, 420, 220, 0x00c8ff, 0.08);

    const n2 = this.add.graphics().setDepth(this._depth.nebula + 0.1);
    blob(n2, GAME_W * 0.35, GAME_H * 0.48, 380, 200, 0xff3d9a, 0.09);
    blob(n2, GAME_W * 0.72, GAME_H * 0.35, 300, 160, 0x3a7cff, 0.1);

    // Slow drift + breathe — reads “alive” without external assets
    this.tweens.add({
      targets: n1,
      x: 10,
      y: -6,
      duration: 11000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: n2,
      x: -12,
      y: 8,
      duration: 14000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: n1,
      alpha: 0.88,
      duration: 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Decorative distant “lens” rings (subtle)
    const rings = this.add.graphics().setDepth(this._depth.nebula + 0.05);
    rings.lineStyle(1, 0x4eefff, 0.12);
    rings.strokeEllipse(GAME_W * 0.5, GAME_H * 0.36, 420, 180);
    rings.lineStyle(1, 0xff4ec8, 0.08);
    rings.strokeEllipse(GAME_W * 0.5 + 40, GAME_H * 0.34, 520, 220);
    rings.setAlpha(0.9);
    this.tweens.add({
      targets: rings,
      alpha: 0.55,
      duration: 6000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _drawPlanetSilhouette() {
    const p = this.add.graphics().setDepth(this._depth.planet);
    // Huge circle below — only the rim reads as a planetary curve
    p.fillStyle(0x070212, 1);
    p.fillCircle(GAME_W * 0.5, GAME_H + 220, 520);
    p.fillStyle(0x12082a, 1);
    p.fillCircle(GAME_W * 0.48, GAME_H + 218, 500);
    // Thin lit rim
    p.lineStyle(3, 0x5a3cff, 0.35);
    p.strokeCircle(GAME_W * 0.5, GAME_H + 220, 518);
  }

  _drawStarField() {
    const rng = mulberry32(0xcafe);
    const far = this.add.graphics().setDepth(this._depth.stars);
    const near = this.add.graphics().setDepth(this._depth.stars + 0.1).setBlendMode(Phaser.BlendModes.ADD);

    for (let i = 0; i < 160; i++) {
      const x = rng() * GAME_W;
      const y = rng() * GAME_H * 0.72;
      const a = 0.25 + rng() * 0.55;
      const r = rng() < 0.92 ? 1 : 1.6 + rng() * 1.4;
      far.fillStyle(0xc8d8ff, a);
      far.fillCircle(x, y, r);
    }
    for (let i = 0; i < 42; i++) {
      const x = rng() * GAME_W;
      const y = rng() * GAME_H * 0.78;
      const a = 0.35 + rng() * 0.55;
      near.fillStyle(0xffffff, a);
      near.fillCircle(x, y, 1.2 + rng() * 1.8);
      near.fillStyle(0x7adfff, a * 0.35);
      near.fillCircle(x - 1, y - 1, 3 + rng() * 2);
    }

    this.tweens.add({
      targets: far,
      alpha: 0.92,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: near,
      alpha: 0.85,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _drawHorizonHaze() {
    const h = this.add.graphics().setDepth(this._depth.haze);
    h.fillGradientStyle(0x000000, 0x000000, 0x1a0a32, 0x2a0860, 0, 0, 0.55, 0.65);
    h.fillRect(0, GAME_H - 160, GAME_W, 160);
    h.fillGradientStyle(0x4eefff, 0xff4ec8, 0x000000, 0x000000, 0.07, 0.05, 0, 0);
    h.fillRect(0, GAME_H - 32, GAME_W, 32);
  }

  _drawVignette() {
    const v = this.add.graphics().setDepth(this._depth.vignette);
    const edge = (x, y, w, h, a) => {
      v.fillStyle(0x000000, a);
      v.fillRect(x, y, w, h);
    };
    // Edge darkening (approximates a lens vignette without shaders)
    edge(0, 0, GAME_W, 56, 0.45);
    edge(0, GAME_H - 72, GAME_W, 72, 0.55);
    edge(0, 0, 52, GAME_H, 0.5);
    edge(GAME_W - 52, 0, 52, GAME_H, 0.5);
    v.fillStyle(0x000208, 0.35);
    v.fillTriangle(0, 0, 140, 0, 0, 140);
    v.fillTriangle(GAME_W, 0, GAME_W - 140, 0, GAME_W, 140);
  }

  _addAmbientParticles() {
    const emitter = this.add.particles(0, 0, '_ttl_flare', {
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H),
      },
      lifespan: { min: 3200, max: 7200 },
      speedX: { min: -8, max: 8 },
      speedY: { min: -18, max: -3 },
      scale: { start: 0.12, end: 0 },
      alpha: { start: 0.35, end: 0 },
      frequency: 90,
      blendMode: 'ADD',
      tint: [0x7adfff, 0xff7ad0, 0xfff0a8],
    });
    emitter.setDepth(this._depth.particles);
  }

  _addUFO() {
    const ufo = this.add.image(GAME_W / 2, GAME_H * 0.36, 'title_ufo').setDepth(this._depth.ufo);
    ufo.setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: ufo,
      y: ufo.y - 14,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: ufo,
      angle: 4,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Engine sparkles
    const sparks = this.add.particles(0, 0, '_ttl_spark', {
      speedY: { min: 40, max: 90 },
      speedX: { min: -16, max: 16 },
      lifespan: { min: 320, max: 520 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.75, end: 0 },
      frequency: 45,
      blendMode: 'ADD',
      tint: [0x4eefff, 0xa8f6ff],
    });
    sparks.setDepth(this._depth.particles + 1);
    sparks.startFollow(ufo, 0, 28, true);
  }

  _addTitleBlock() {
    const cx = GAME_W / 2;
    const yMain = GAME_H * 0.56;

    // Glow stack (drawn first = behind)
    const glowLayers = [
      { off: 6, color: '#ff2ec8', alpha: 0.22 },
      { off: 4, color: '#4eefff', alpha: 0.28 },
      { off: 2, color: '#ffdd57', alpha: 0.35 },
    ];
    glowLayers.forEach((layer) => {
      this.add
        .text(cx + layer.off * 0.3, yMain + layer.off * 0.2, 'KRAKEN JR.', {
          fontFamily: FONT,
          fontSize: '30px',
          color: layer.color,
        })
        .setOrigin(0.5)
        .setDepth(this._depth.title - 1)
        .setAlpha(layer.alpha)
        .setBlendMode(Phaser.BlendModes.ADD);
    });

    const main = this.add
      .text(cx, yMain, 'KRAKEN JR.', {
        fontFamily: FONT,
        fontSize: '30px',
        color: '#fff6c8',
        stroke: '#4a2a08',
        strokeThickness: 5,
        shadow: { offsetX: 3, offsetY: 4, color: '#000000', blur: 2, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(this._depth.title);

    this.tweens.add({
      targets: main,
      scale: 1.03,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(cx, yMain + 44, 'INVASIONE DEI CERVELLI COSMICI', {
        fontFamily: FONT_CINEMA,
        fontSize: '14px',
        color: '#b8f7ff',
        letterSpacing: '0.18em',
      })
      .setOrigin(0.5)
      .setDepth(this._depth.title)
      .setAlpha(0.92);

    this.add
      .text(cx, yMain + 72, "Un'avventura di Marco Rossi — giornalista cosmico", {
        fontFamily: FONT_CINEMA,
        fontSize: '11px',
        color: '#7a8aa8',
        letterSpacing: '0.06em',
      })
      .setOrigin(0.5)
      .setDepth(this._depth.title)
      .setAlpha(0.85);
  }

  _addButtons() {
    const y0 = GAME_H * 0.78;

    this._addGlassButton(GAME_W / 2, y0, '▶  INIZIA L\'AVVENTURA', false, () => {
      playTrack('title');
      resetGame();
      this.scene.start('GameScene');
      this.scene.launch('UIScene');
    });

    const continueBtn = this._addGlassButton(
      GAME_W / 2,
      y0 + 46,
      '↺  CONTINUA',
      true,
      () => {
        if (loadSave()) {
          playTrack('title');
          this.scene.start('GameScene');
          this.scene.launch('UIScene');
        } else {
          continueBtn.label.setText('  Nessun salvataggio  ');
          this.time.delayedCall(1800, () => continueBtn.label.setText('↺  CONTINUA'));
        }
      },
    );
  }

  /**
   * @returns {{ label: Phaser.GameObjects.Text, bg: Phaser.GameObjects.Graphics }}
   */
  _addGlassButton(x, y, text, secondary, onClick) {
    const depth = this._depth.ui;
    const label = this.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: secondary ? '7px' : '9px',
        color: secondary ? '#8a9ab8' : '#d8f8ff',
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setInteractive({ useHandCursor: true });

    const bg = this.add.graphics().setDepth(depth);

    const paint = (hover) => {
      const b = label.getBounds();
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

    label.on('pointerover', () => {
      label.setColor('#ffffff');
      paint(true);
    });
    label.on('pointerout', () => {
      label.setColor(secondary ? '#8a9ab8' : '#d8f8ff');
      paint(false);
    });
    label.on('pointerdown', onClick);

    return { label, bg };
  }
}
