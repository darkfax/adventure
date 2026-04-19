/**
 * GameScene — Main Game
 *
 * Manages the playable world: drawing scene backgrounds, placing
 * interactive objects and NPCs, moving the character, and executing
 * verb actions. The persistent HUD (verbs, inventory, messages) lives
 * in UIScene which runs in parallel on top of this scene.
 *
 * SCENE RENDERING PIPELINE (each time the player enters a location):
 *   1. drawBackground(scene)  — sky, buildings, ground, atmosphere
 *   2. drawObjects(scene)     — interactive sprites (emoji Text)
 *   3. drawNPCs(scene)        — characters
 *   4. drawExits(scene)       — clickable arrow zones
 *   5. resetCharacter()       — place Marco at entry position
 *
 * COORDINATE SYSTEM:
 *   The playable area is SCENE_W × SCENE_H (800 × 410 px).
 *   Object positions in data.js use percentage values (x%, y%).
 *   Helper functions pxX() and pxY() convert them to pixels.
 *
 * DEPTH LAYERS (Phaser depth / z-order):
 *   0   background graphics
 *   1   floor / ground
 *   2   scene objects and NPCs
 *   5   character (always in front of objects)
 *   8   exit zones (drawn last so arrows appear on top)
 *  10   UI elements managed by UIScene
 */

import { SCENES, ITEMS, VERBS }   from '../data/data.js';
import {
  getScene, setScene,
  getVerb,  setVerb,
  getArmed, setArmed, clearArmed,
  hasItem, addItem, removeItem,
  getFlag, setFlag,
  getInventory, saveGame,
} from '../game/state.js';
import { SCENE_W, SCENE_H, FONT } from '../constants.js';
import { FONT_CINEMA }            from '../game/visualTheme.js';
import { playTrack }              from '../audio/music.js';

// ── Coordinate helpers ────────────────────────────────────────────────────────
// Object positions in data.js: x = left%, y = top%
// The sprite rendering in the old CSS used: left:x%, bottom:(100-y-4)%
// Translated to Phaser pixels:

const pxX = pct => (pct / 100) * SCENE_W;
const pxY = pct => SCENE_H * (pct + 4) / 100;   // y% → pixel from top


export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Graphics layer for background art (reused each scene transition)
    this._bgGraphics   = this.add.graphics().setDepth(0);
    this._atmGraphics  = this.add.graphics().setDepth(1); // atmosphere / overlay fx

    // Container for interactive scene objects (cleared on each transition)
    this._objectGroup  = this.add.group();

    // Character sprite — built by BootScene via characters.js
    this._char = this.add.image(0, 0, 'marco')
      .setOrigin(0.5, 1)
      .setDepth(5);

    // Invisible hit area for walking. Use a Zone (not a zero-alpha Rectangle) so Phaser always
    // keeps a reliable hit test; transparent rects can drop input on some setups.
    this._walkPlate = this.add.zone(SCENE_W / 2, SCENE_H / 2, SCENE_W, SCENE_H)
      .setDepth(1)
      .setInteractive()
      .on('pointerdown', pointer => this.handleSceneClick(pointer));

    // HUD overlay — only one launch (TitleScene must not also call launch, or UIScene restarts
    // and duplicates / tears down listeners tied to GameScene).
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    // Wait one frame so UIScene has time to create and register its event listeners
    this.time.delayedCall(50, () => {
      this.goScene(getScene());
    });
  }

  /** Refresh only objects/NPCs/exits without redrawing the background. */
  _refreshScene() {
    this._objectGroup.clear(true, true);
    const scene = SCENES[getScene()];
    this.drawObjects(scene);
    this.drawNPCs(scene);
    this.drawExits(scene);
    if (getScene() === 'tetto' && getFlag('trasmettitore_distrutto')) this.spawnPlok();
    saveGame();
  }

  // ── Scene transition ───────────────────────────────────────────────────────

  /**
   * Load a location: draw background, place objects, reset character.
   * @param {string} id — key from SCENES
   */
  goScene(id) {
    setScene(id);
    setVerb('walk');

    const scene = SCENES[id];
    if (!scene) { console.error('Unknown scene:', id); return; }

    // Switch music track based on location
    const SCENE_TRACKS = {
      appartamento: 'ambient',
      strada:       'ambient',
      piazza:       'town',
      pizzeria:     'pizzeria',
      retrobottega: 'danger',
      tetto:        'danger',
    };
    playTrack(SCENE_TRACKS[id] || 'ambient');

    // Clear previous objects
    this._objectGroup.clear(true, true);

    // Draw the background art for this location
    this._bgGraphics.clear();
    this._atmGraphics.clear();
    this.drawBackground(id, scene);

    // Place interactive elements
    this.drawObjects(scene);
    this.drawNPCs(scene);
    this.drawExits(scene);

    // If on the rooftop after destroying the transmitter, show Plok
    if (id === 'tetto' && getFlag('trasmettitore_distrutto')) {
      this.spawnPlok();
    }

    if (id === 'tetto') {
      this.time.delayedCall(120, () => {
        this.cameras.main.shake(200, 0.0045, false);
      });
    }

    this.resetCharacter();
    this.events.emit('verbChanged', 'walk');
    this.events.emit('msg', '');
    saveGame();
  }

  // ── Background drawing ─────────────────────────────────────────────────────

  /**
   * Draw the scene background using Phaser Graphics.
   * Each location has its own visual style.
   */
  drawBackground(id, scene) {
    const g = this._bgGraphics;

    switch (id) {
      case 'appartamento': this._bgAppartamento(g); break;
      case 'strada':       this._bgStrada(g);       break;
      case 'piazza':       this._bgPiazza(g);        break;
      case 'pizzeria':     this._bgPizzeria(g);      break;
      case 'retrobottega': this._bgRetrobottega(g);  break;
      case 'tetto':        this._bgTetto(g);         break;
    }

    this._applyLocationAtmosphere(id);

    // Location badge (Orbitron + rounded chrome — matches title / HUD)
    if (this._sceneLabelWrap) this._sceneLabelWrap.destroy(true);
    const badgeText = this.add.text(14, 10, scene.name, {
      fontFamily: FONT_CINEMA,
      fontSize:   '10px',
      color:      '#d8f8ff',
      letterSpacing: '0.05em',
    });
    const b = badgeText.getBounds();
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0x060a12, 0.85);
    badgeBg.fillRoundedRect(b.x - 10, b.y - 6, b.width + 20, b.height + 12, 10);
    badgeBg.lineStyle(1, 0x4eefff, 0.5);
    badgeBg.strokeRoundedRect(b.x - 10, b.y - 6, b.width + 20, b.height + 12, 10);
    badgeBg.lineStyle(1, 0xa8f6ff, 0.12);
    badgeBg.strokeRoundedRect(b.x - 8, b.y - 4, b.width + 16, b.height + 8, 8);
    this._sceneLabelWrap = this.add.container(6, 4, [badgeBg, badgeText]).setDepth(8);
  }

  /**
   * Unified film grade + vignette on the playable area (sits on _atmGraphics, depth 1).
   */
  _applyLocationAtmosphere(id) {
    const a = this._atmGraphics;
    const W = SCENE_W;
    const H = SCENE_H;
    a.clear();

    a.fillGradientStyle(0x00a8d0, 0xff3088, 0x080410, 0x040208, 0.055, 0.04, 0.02, 0.028);
    a.fillRect(0, 0, W, H);

    if (id === 'appartamento' || id === 'pizzeria') {
      a.fillStyle(0xffaa66, 0.038);
      a.fillRect(0, 0, W, H);
    }

    if (id === 'retrobottega') {
      a.fillStyle(0xff2040, 0.052);
      a.fillRect(0, 0, W, H);
      a.fillStyle(0x000000, 0.09);
      a.fillRect(0, 0, W, H * 0.1);
    }

    if (id === 'tetto') {
      const post = getFlag('trasmettitore_distrutto');
      a.fillStyle(0xff2040, post ? 0.1 : 0.082);
      a.fillRect(0, 0, W, H);
      // Alien rim light from skyline / horizon
      a.fillGradientStyle(0x000000, 0x000000, 0x00c8a0, 0x6a20c0, 0, 0, post ? 0.14 : 0.08, post ? 0.1 : 0.055);
      a.fillRect(0, H * 0.52, W, H * 0.48);
      a.fillStyle(0x000000, 0.13);
      a.fillRect(0, 0, W, H * 0.14);
      if (post) {
        a.fillStyle(0x4a0088, 0.055);
        a.fillRect(0, 0, W, H);
        a.fillStyle(0x000000, 0.1);
        a.fillRect(0, 0, W, 20);
        a.fillRect(0, H - 34, W, 34);
        a.fillStyle(0xff3060, 0.035);
        a.fillRect(0, 0, W, H);
      }
    }

    if (id === 'strada' || id === 'piazza') {
      a.fillStyle(0x4466ff, 0.025);
      a.fillRect(0, 0, W, H);
    }

    a.fillStyle(0x000000, 0.2);
    a.fillRect(0, 0, W, 22);
    a.fillRect(0, H - 32, W, 32);
    a.fillStyle(0x000000, 0.18);
    a.fillRect(0, 0, 26, H);
    a.fillRect(W - 26, 0, 26, H);

    a.fillGradientStyle(0x000000, 0x000000, 0x0a1a28, 0x180a20, 0, 0, 0.28, 0.2);
    a.fillRect(0, H - 52, W, 52);
  }

  // ────────────────────────────────── APPARTAMENTO ───────────────────────────

  _bgAppartamento(g) {
    const W = SCENE_W, H = SCENE_H;

    // ── Base room ──────────────────────────────────────────────────────────────

    // Back wall — warm ochre plaster, lighter in the center under the lamp
    g.fillGradientStyle(0x1e0e02, 0x1e0e02, 0x3a1e08, 0x3a1e08, 1);
    g.fillRect(0, 0, W, H * 0.82);

    // Ceiling — slightly cooler, dark
    g.fillStyle(0x120800, 1);
    g.fillRect(0, 0, W, H * 0.07);

    // Left side wall panel (perspective edge, darker)
    g.fillGradientStyle(0x0e0600, 0x1e0e02, 0x120800, 0x3a1e08, 1);
    g.fillRect(0, 0, W * 0.11, H * 0.82);

    // Right side wall panel
    g.fillGradientStyle(0x1e0e02, 0x0e0600, 0x3a1e08, 0x120800, 1);
    g.fillRect(W * 0.89, 0, W * 0.11, H * 0.82);

    // Subtle wallpaper texture — faint vertical stripes
    g.lineStyle(1, 0x2e1608, 0.25);
    for (let x = W * 0.11; x < W * 0.89; x += 22) g.lineBetween(x, 0, x, H * 0.82);

    // Crown molding at ceiling
    g.fillStyle(0x2a1408, 1);
    g.fillRect(0, H * 0.07, W, 8);
    g.lineStyle(1, 0x4a2810, 1);
    g.lineBetween(0, H * 0.07 + 8, W, H * 0.07 + 8);

    // ── Floor ──────────────────────────────────────────────────────────────────

    g.fillGradientStyle(0x3a1e06, 0x3a1e06, 0x2a1404, 0x2a1404, 1);
    g.fillRect(0, H * 0.78, W, H * 0.22);

    // Floor planks — vertical grain lines
    g.lineStyle(1, 0x2a1204, 0.7);
    for (let x = 0; x < W; x += 52) g.lineBetween(x, H * 0.78, x, H);

    // Floor planks — horizontal joints
    g.lineStyle(1, 0x301604, 0.35);
    for (let y = H * 0.80; y < H; y += 18) g.lineBetween(0, y, W, y);

    // Baseboard
    g.fillStyle(0x200e02, 1);
    g.fillRect(0, H * 0.78, W, 7);
    g.lineStyle(1, 0x3a1e08, 0.8);
    g.lineBetween(0, H * 0.785, W, H * 0.785);

    // ── Window (left-center) ────────────────────────────────────────────────────

    const wX = W * 0.14, wY = H * 0.09, wW = 148, wH = 126;

    // Deep window reveal
    g.fillStyle(0x080400, 1);
    g.fillRect(wX - 8, wY - 6, wW + 16, wH + 12);

    // Night sky — deep blue gradient
    g.fillGradientStyle(0x01030f, 0x01030f, 0x03061e, 0x03061e, 1);
    g.fillRect(wX, wY, wW, wH);

    // Stars
    [[0.16,0.10],[0.20,0.04],[0.25,0.15],[0.29,0.07],[0.34,0.13],[0.38,0.05],[0.22,0.20],
     [0.32,0.20],[0.36,0.20],[0.18,0.17],[0.28,0.17]].forEach(([xp, yp]) => {
      g.fillStyle(0xffffff, 0.5 + (xp * 7 % 5) * 0.1);
      g.fillCircle(W * xp, H * yp, 1);
    });

    // Moon — top-right of window, soft glow
    const mX = wX + wW * 0.78, mY = wY + wH * 0.28;
    g.fillStyle(0xfff8d0, 0.12); g.fillCircle(mX, mY, 28);
    g.fillStyle(0xfff8d0, 0.20); g.fillCircle(mX, mY, 20);
    g.fillStyle(0xfff8d0, 0.90); g.fillCircle(mX, mY, 13);
    // Moon crater shadows
    g.fillStyle(0xdde8c0, 0.30); g.fillCircle(mX + 4, mY - 3, 4);
    g.fillStyle(0xdde8c0, 0.25); g.fillCircle(mX - 4, mY + 5, 3);

    // Window frame — thick wooden
    g.lineStyle(5, 0x2e1608, 1);
    g.strokeRect(wX, wY, wW, wH);
    // Mullions
    g.lineStyle(3, 0x2e1608, 1);
    g.lineBetween(wX + wW / 2, wY, wX + wW / 2, wY + wH);
    g.lineBetween(wX, wY + wH * 0.48, wX + wW, wY + wH * 0.48);

    // Curtain rod
    g.lineStyle(3, 0x4a2010, 1);
    g.lineBetween(wX - 20, wY - 8, wX + wW + 20, wY - 8);
    // Rod finials
    g.fillStyle(0x6a3018, 1);
    g.fillCircle(wX - 20, wY - 8, 4);
    g.fillCircle(wX + wW + 20, wY - 8, 4);

    // Curtains — drawn to sides, thick velvet look
    g.fillStyle(0x5a1a08, 0.95);
    g.fillTriangle(wX - 8, wY - 10, wX + 38, wY - 10, wX - 8, wY + wH + 10);
    g.fillStyle(0x3e1006, 0.6);
    g.fillTriangle(wX - 8, wY - 10, wX + 22, wY - 10, wX - 8, wY + wH + 10);

    g.fillStyle(0x5a1a08, 0.95);
    g.fillTriangle(wX + wW + 8, wY - 10, wX + wW - 34, wY - 10, wX + wW + 8, wY + wH + 10);
    g.fillStyle(0x3e1006, 0.6);
    g.fillTriangle(wX + wW + 8, wY - 10, wX + wW - 18, wY - 10, wX + wW + 8, wY + wH + 10);

    // Moonlight beam through window onto floor
    g.fillStyle(0xc8d8ff, 0.03);
    g.fillTriangle(wX + 20, wY + wH, wX + wW - 20, wY + wH, W * 0.5, H * 0.82);

    // ── Bulletin board (right wall) ─────────────────────────────────────────────

    const bX = W * 0.70, bY = H * 0.10, bW = 160, bH = 120;

    // Board frame — dark cork
    g.fillStyle(0x1e0e02, 1);
    g.fillRect(bX - 5, bY - 5, bW + 10, bH + 10);
    g.fillStyle(0x6a3e18, 1);
    g.fillRect(bX, bY, bW, bH);
    // Cork texture dots
    g.fillStyle(0x5a3210, 0.4);
    for (let i = 0; i < 30; i++) {
      const tx = bX + (i * 37 % bW);
      const ty = bY + (i * 29 % bH);
      g.fillCircle(tx, ty, 2);
    }

    // Notes pinned to board
    const notes = [
      [bX + 8,  bY + 8,  55, 32, 0xfffde0],
      [bX + 68, bY + 6,  50, 28, 0xe8ffe8],
      [bX + 118,bY + 10, 36, 30, 0xffe8e8],
      [bX + 6,  bY + 46, 44, 34, 0xe8f4ff],
      [bX + 55, bY + 42, 58, 36, 0xfffff0],
      [bX + 116,bY + 48, 38, 28, 0xffe8f8],
      [bX + 10, bY + 84, 50, 28, 0xfffde0],
      [bX + 70, bY + 82, 42, 30, 0xe8ffe8],
      [bX + 118,bY + 82, 36, 30, 0xffe8e8],
    ];
    notes.forEach(([nx, ny, nw, nh, nc]) => {
      // Note shadow
      g.fillStyle(0x000000, 0.15);
      g.fillRect(nx + 2, ny + 2, nw, nh);
      // Note
      g.fillStyle(nc, 0.92);
      g.fillRect(nx, ny, nw, nh);
      // Pin
      g.fillStyle(0xff3030, 1);
      g.fillCircle(nx + nw / 2, ny + 3, 2.5);
    });

    // Red conspiracy strings connecting notes
    g.lineStyle(1, 0xee2020, 0.65);
    g.lineBetween(bX + 35, bY + 24, bX + 84, bY + 60);
    g.lineBetween(bX + 84, bY + 60, bX + 136, bY + 26);
    g.lineBetween(bX + 136, bY + 26, bX + 130, bY + 62);
    g.lineBetween(bX + 84, bY + 60, bX + 50, bY + 98);
    g.lineBetween(bX + 50, bY + 98, bX + 91, bY + 97);

    // Board label — "PORTO COSMO — CASO ALIENI"
    g.lineStyle(1, 0x2a1200, 1);
    g.lineBetween(bX, bY + bH + 5, bX + bW, bY + bH + 5);

    // ── Bookshelf (left wall area) ──────────────────────────────────────────────

    const shX = W * 0.0, shY = H * 0.18, shW = W * 0.11, shH = H * 0.52;

    // Back panel
    g.fillStyle(0x180c02, 1);
    g.fillRect(shX, shY, shW, shH);
    // Shelf boards (3 shelves)
    const shelfRows = 3;
    const rowH = shH / shelfRows;
    for (let s = 0; s <= shelfRows; s++) {
      g.fillStyle(0x2a1408, 1);
      g.fillRect(shX, shY + rowH * s - 3, shW, 5);
    }
    // Books — packed together with varied colors and widths
    const bkColors = [0x8b1a1a, 0x1a3d8b, 0x1a7a2a, 0x8b7a1a, 0x5a1a7a, 0x8b4010, 0x106a8b, 0x7a1a3a, 0x2a6a2a];
    for (let row = 0; row < shelfRows; row++) {
      let bkX = shX + 2;
      const bkY = shY + rowH * row + 5;
      const bkH = rowH - 10;
      let seed = row * 17;
      while (bkX < shX + shW - 4) {
        seed = (seed * 1664525 + 1013904223) & 0xffff;
        const bkW = 6 + (seed % 6);
        const color = bkColors[seed % bkColors.length];
        g.fillStyle(color, 0.9);
        g.fillRect(bkX, bkY + (seed % 4), bkW - 1, bkH - (seed % 4));
        // Spine highlight
        g.fillStyle(0xffffff, 0.07);
        g.fillRect(bkX, bkY + (seed % 4), 1, bkH - (seed % 4));
        bkX += bkW;
      }
    }

    // ── Bed frame (behind letto, left of center) ────────────────────────────────

    const bdX = W * 0.135, bdY = H * 0.41, bdW = 138;
    // Bed frame — dark wood
    g.fillStyle(0x221006, 1);
    g.fillRect(bdX, bdY, bdW, H * 0.78 - bdY);
    // Headboard panel (raised)
    g.fillStyle(0x321808, 1);
    g.fillRect(bdX + 5, bdY + 4, bdW - 10, 54);
    // Headboard inner panel detail
    g.fillStyle(0x3e2010, 0.7);
    g.fillRect(bdX + 12, bdY + 10, bdW - 24, 40);
    // Headboard top rail
    g.fillStyle(0x2a1408, 1);
    g.fillRect(bdX, bdY, bdW, 6);
    // Side rails
    g.fillStyle(0x221006, 1);
    g.fillRect(bdX, bdY + 58, 10, H * 0.78 - bdY - 58);
    g.fillRect(bdX + bdW - 10, bdY + 58, 10, H * 0.78 - bdY - 58);
    // Mattress surface
    g.fillStyle(0xd8cdb8, 0.22);
    g.fillRect(bdX + 10, bdY + 58, bdW - 20, H * 0.78 - bdY - 62);
    // Pillow
    g.fillStyle(0xf5f0e8, 0.35);
    g.fillRect(bdX + 14, bdY + 60, 50, 28);
    g.lineStyle(1, 0xe8e0d0, 0.2);
    g.strokeRect(bdX + 16, bdY + 62, 46, 24);

    // ── Writing desk (behind scrivania + giornale) ──────────────────────────────

    // scrivania is at x=57% → pxX(57)=456, giornale at x=70% → pxX(70)=560
    const dkX = W * 0.41, dkTopY = H * 0.64, dkW = W * 0.35;

    // Desktop surface — dark wood plank
    g.fillStyle(0x3c1e08, 1);
    g.fillRect(dkX, dkTopY - 12, dkW, 12);
    // Top edge highlight
    g.fillStyle(0x5e3212, 1);
    g.fillRect(dkX, dkTopY - 12, dkW, 2);
    // Wood grain on surface
    g.lineStyle(1, 0x301408, 0.4);
    for (let gx = dkX + 8; gx < dkX + dkW - 8; gx += 18) {
      g.lineBetween(gx, dkTopY - 12, gx + 8, dkTopY);
    }
    // Front apron
    g.fillStyle(0x2e1606, 1);
    g.fillRect(dkX + 10, dkTopY, dkW - 20, 14);
    // Drawer hint
    g.lineStyle(1, 0x4a2a0e, 0.7);
    g.strokeRect(dkX + dkW * 0.3, dkTopY + 2, dkW * 0.38, 10);
    g.fillStyle(0x6a3a18, 0.6);
    g.fillCircle(dkX + dkW * 0.49, dkTopY + 7, 2);  // drawer knob
    // Desk legs
    const legH = H * 0.78 - (dkTopY + 14);
    g.fillStyle(0x2a1406, 1);
    g.fillRect(dkX + 12, dkTopY + 14, 14, legH);
    g.fillRect(dkX + dkW - 26, dkTopY + 14, 14, legH);
    // Leg highlights
    g.fillStyle(0x4a2810, 0.35);
    g.fillRect(dkX + 12, dkTopY + 14, 4, legH);
    g.fillRect(dkX + dkW - 26, dkTopY + 14, 4, legH);
    // Papers / clutter on desk surface
    g.fillStyle(0xfff8e8, 0.80);
    g.fillRect(dkX + 22, dkTopY - 22, 52, 12);
    g.fillRect(dkX + 20, dkTopY - 19, 52, 9);
    g.fillStyle(0x8b1a1a, 1);
    g.fillRect(dkX + 85, dkTopY - 26, 22, 16);
    g.fillStyle(0x1a3d8b, 1);
    g.fillRect(dkX + 90, dkTopY - 32, 20, 12);

    // ── Floor / wall junction — shadow strip ────────────────────────────────────

    g.fillStyle(0x000000, 0.18);
    g.fillRect(0, H * 0.755, W, H * 0.78 - H * 0.755);

    // ── Ceiling lamp ────────────────────────────────────────────────────────────

    const lX = W * 0.50, lY = H * 0.07;

    // Cord
    g.lineStyle(2, 0x1a0a00, 1);
    g.lineBetween(lX, 0, lX, lY + 4);

    // Shade — truncated cone shape
    g.fillStyle(0x5a2e0a, 1);
    g.fillTriangle(lX - 28, lY + 26, lX + 28, lY + 26, lX, lY + 4);
    g.fillStyle(0x3a1e06, 1);
    g.fillRect(lX - 22, lY + 22, 44, 6);
    // Shade rim highlight
    g.lineStyle(1, 0x7a4a18, 0.8);
    g.lineBetween(lX - 22, lY + 22, lX + 22, lY + 22);
    // Bulb glow
    g.fillStyle(0xffee88, 0.9);
    g.fillCircle(lX, lY + 20, 4);

    // Wide cone of warm lamplight
    g.fillStyle(0xffaa22, 0.035);
    g.fillTriangle(lX - 20, lY + 28, lX - W * 0.55, H * 0.82, lX + W * 0.55, H * 0.82);
    // Brighter inner cone
    g.fillStyle(0xffcc44, 0.04);
    g.fillTriangle(lX - 10, lY + 28, lX - W * 0.28, H * 0.82, lX + W * 0.28, H * 0.82);
    // Soft halo on ceiling around lamp
    g.fillStyle(0xffaa22, 0.07);
    g.fillEllipse(lX, lY + 10, 120, 30);

    // ── Atmospheric lighting passes ─────────────────────────────────────────────

    // Central warm glow (lamp pool on back wall)
    g.fillStyle(0xff8800, 0.04);
    g.fillEllipse(lX, H * 0.45, 500, 360);

    // Computer screen blue glow (at scrivania position x=57%)
    g.fillStyle(0x2244cc, 0.06);
    g.fillEllipse(W * 0.57, H * 0.55, 200, 140);

    // Corner vignettes — darken edges for depth
    g.fillGradientStyle(0x000000, 0x00000000, 0x000000, 0x00000000, 0.45);
    g.fillRect(0, 0, W * 0.12, H);
    g.fillGradientStyle(0x00000000, 0x000000, 0x00000000, 0x000000, 0.45);
    g.fillRect(W * 0.88, 0, W * 0.12, H);
    g.fillGradientStyle(0x000000, 0x000000, 0x00000000, 0x00000000, 0.3);
    g.fillRect(0, 0, W, H * 0.08);
  }

  // ─────────────────────────────────────────── STRADA ────────────────────────

  _bgStrada(g) {
    const W = SCENE_W, H = SCENE_H;

    // Sky — deep indigo night, slight blue at horizon
    g.fillGradientStyle(0x00000a, 0x00000a, 0x08081e, 0x08081e, 1);
    g.fillRect(0, 0, W, H * 0.72);

    // Stars — varied sizes and brightness
    [
      [4,8,1],[10,3,1.5],[16,12,1],[22,5,1],[28,18,1],[35,8,1.5],[42,3,1],
      [50,14,1],[57,6,1.5],[63,20,1],[68,4,1],[74,10,1],[79,2,1.5],[85,16,1],
      [92,7,1],[96,11,1],[7,25,1],[19,28,1],[31,22,1.5],[44,30,1],[56,24,1],
      [67,27,1],[78,21,1],[90,29,1],[13,16,1],[47,10,2],[61,15,1.5],
    ].forEach(([xp,yp,r]) => {
      g.fillStyle(0xffffff, 0.3 + (xp%7)*0.09);
      g.fillCircle(xp/100*W, yp/100*H, r);
    });

    // Moon — top right, full and bright
    const mX = W * 0.84, mY = H * 0.14;
    g.fillStyle(0xfff8d0, 0.07); g.fillCircle(mX, mY, 50);
    g.fillStyle(0xfff8d0, 0.12); g.fillCircle(mX, mY, 36);
    g.fillStyle(0xfff8d0, 0.85); g.fillCircle(mX, mY, 24);
    g.fillStyle(0xeee8b8, 0.25); g.fillCircle(mX+7, mY-4, 6);
    g.fillStyle(0xeee8b8, 0.20); g.fillCircle(mX-5, mY+7, 4);
    // Moonlight scatter on buildings
    g.fillStyle(0xc8d8ff, 0.04); g.fillEllipse(W*0.9, H*0.4, 200, 400);

    // ── Background buildings (distant, darker) ─────────────────────────────────
    g.fillStyle(0x04040e, 1);
    g.fillRect(W*0.23, H*0.22, W*0.12, H*0.50);
    g.fillRect(W*0.60, H*0.26, W*0.10, H*0.46);
    // Distant windows (very faint)
    [[0.25,0.28],[0.29,0.28],[0.25,0.38],[0.29,0.38],[0.62,0.30],[0.65,0.30]].forEach(([wx,wy]) => {
      g.fillStyle(0xffdd57, 0.25); g.fillRect(W*wx, H*wy, 8, 6);
    });

    // ── Left building — 5-story residential ────────────────────────────────────
    g.fillGradientStyle(0x05051a, 0x08082a, 0x06061e, 0x09092e, 1);
    g.fillRect(0, H*0.10, W*0.20, H*0.62);
    // Cornice / roof detail
    g.fillStyle(0x0c0c30, 1); g.fillRect(0, H*0.10, W*0.20, 6);
    // Left building windows — 3 cols × 5 rows
    [[0.02,0.15],[0.08,0.15],[0.14,0.15],
     [0.02,0.26],[0.08,0.26],[0.14,0.26],
     [0.02,0.37],[0.08,0.37],[0.14,0.37],
     [0.02,0.48],[0.08,0.48],[0.14,0.48],
    ].forEach(([wx,wy], i) => {
      const lit = (i*7+3)%5 > 1;
      g.fillStyle(lit ? 0xffee88 : 0x0e0e28, lit ? 0.75 : 0.9);
      g.fillRect(W*wx, H*wy, 16, 11);
      if (lit) { // warm window glow
        g.fillStyle(0xffee44, 0.06);
        g.fillRect(W*wx-4, H*wy-3, 24, 17);
      }
    });
    // Doorway arch
    g.fillStyle(0x02020a, 1);
    g.fillRect(W*0.07, H*0.62, 22, 10);
    g.fillEllipse(W*0.07+11, H*0.62, 22, 16);

    // ── Right building — 4-story with shop front ───────────────────────────────
    g.fillGradientStyle(0x04041a, 0x06061e, 0x05051c, 0x07071f, 1);
    g.fillRect(W*0.76, H*0.16, W*0.24, H*0.56);
    g.fillStyle(0x0a0a28, 1); g.fillRect(W*0.76, H*0.16, W*0.24, 6);
    // Right windows
    [[0.78,0.21],[0.86,0.21],[0.94,0.21],
     [0.78,0.33],[0.86,0.33],[0.94,0.33],
     [0.78,0.45],[0.86,0.45],
    ].forEach(([wx,wy], i) => {
      const lit = (i*11+5)%4 > 0;
      g.fillStyle(lit ? 0xffee88 : 0x0e0e28, lit ? 0.70 : 0.9);
      g.fillRect(W*wx, H*wy, 16, 11);
    });
    // Shop window — ground floor, dark interior
    g.fillStyle(0x040410, 1);
    g.fillRect(W*0.78, H*0.58, W*0.18, H*0.14);
    g.lineStyle(2, 0x1a1a3a, 1);
    g.strokeRect(W*0.78, H*0.58, W*0.18, H*0.14);

    // ── Road + sidewalk ─────────────────────────────────────────────────────────
    // Sidewalk near side
    g.fillStyle(0x141430, 1); g.fillRect(0, H*0.72, W, H*0.06);
    // Curb edge
    g.fillStyle(0x1e1e42, 1); g.fillRect(0, H*0.72, W, 3);
    // Road
    g.fillGradientStyle(0x0a0a20, 0x0a0a20, 0x0c0c24, 0x0c0c24, 1);
    g.fillRect(0, H*0.78, W, H*0.22);
    // Road lane markings
    g.fillStyle(0x2a2a50, 0.6);
    for (let x = 40; x < W; x += 80) g.fillRect(x, H*0.87, 44, 3);
    // Sidewalk far side — barely visible
    g.fillStyle(0x10102a, 1); g.fillRect(0, H*0.76, W, H*0.02);

    // ── Lamp posts — two of them ────────────────────────────────────────────────
    [[0.35, true], [0.68, false]].forEach(([px, bright]) => {
      const pX = W * px, pY = H * 0.72;
      // Glow halos
      g.fillStyle(0xffee22, bright ? 0.07 : 0.04);
      g.fillCircle(pX, pY - 10, 90);
      g.fillStyle(0xffcc00, bright ? 0.15 : 0.08);
      g.fillCircle(pX, pY - 10, 35);
      // Pole
      g.fillStyle(0x282844, 1);
      g.fillRect(pX - 2, H*0.34, 4, H*0.38);
      // Arm
      g.fillRect(pX - 2, H*0.34, 22, 3);
      // Lamp housing
      g.fillStyle(0x3a3a5a, 1);
      g.fillRect(pX + 16, H*0.32, 18, 8);
      g.fillStyle(0xffffaa, bright ? 0.9 : 0.6);
      g.fillRect(pX + 18, H*0.33, 14, 5);
      // Light cone downward
      g.fillStyle(0xffee44, bright ? 0.05 : 0.025);
      g.fillTriangle(pX + 18, H*0.36, pX + 32, H*0.36, pX + 55, H*0.72, pX - 20, H*0.72);
    });

    // ── Puddle reflections on road ──────────────────────────────────────────────
    g.fillStyle(0x202060, 0.25);
    g.fillEllipse(W*0.32, H*0.90, 80, 12);
    g.fillStyle(0xffee44, 0.06);
    g.fillEllipse(W*0.34, H*0.90, 40, 6);

    // ── Vignette edges ──────────────────────────────────────────────────────────
    g.fillGradientStyle(0x000000, 0x00000000, 0x000000, 0x00000000, 0.5);
    g.fillRect(0, 0, W*0.06, H);
    g.fillGradientStyle(0x00000000, 0x000000, 0x00000000, 0x000000, 0.5);
    g.fillRect(W*0.94, 0, W*0.06, H);
  }

  // ──────────────────────────────────────────── PIAZZA ───────────────────────

  _bgPiazza(g) {
    const W = SCENE_W, H = SCENE_H;

    // Sky — deep night with subtle purple tint
    g.fillGradientStyle(0x020008, 0x020008, 0x06041a, 0x06041a, 1);
    g.fillRect(0, 0, W, H * 0.78);

    // Stars
    [[5,5,1],[12,14,1],[20,8,1.5],[30,16,1],[40,4,1],[52,12,1],[60,7,1.5],
     [70,18,1],[80,10,1],[88,5,1],[94,15,1],[15,25,1],[35,22,1.5],
     [55,28,1],[75,24,1],[92,20,1],[46,18,2],[23,10,1]].forEach(([xp,yp,r]) => {
      g.fillStyle(0xffffff, 0.35 + (xp%7)*0.08);
      g.fillCircle(xp/100*W, yp/100*H, r);
    });

    // ── Side buildings ─────────────────────────────────────────────────────────
    // Left building
    g.fillGradientStyle(0x03031a, 0x05052a, 0x04041e, 0x06062a, 1);
    g.fillRect(0, H*0.20, W*0.22, H*0.58);
    g.fillStyle(0x08082e, 1); g.fillRect(0, H*0.20, W*0.22, 5);
    [[0.02,0.26],[0.10,0.26],[0.02,0.40],[0.10,0.40],[0.02,0.54],[0.10,0.54]].forEach(([wx,wy],i) => {
      const lit = i%3!==2;
      g.fillStyle(lit ? 0xffee77 : 0x10103a, lit ? 0.65 : 0.9);
      g.fillRect(W*wx, H*wy, 14, 10);
    });

    // Right building
    g.fillGradientStyle(0x05052a, 0x03031a, 0x06062a, 0x04041e, 1);
    g.fillRect(W*0.78, H*0.24, W*0.22, H*0.54);
    g.fillStyle(0x08082e, 1); g.fillRect(W*0.78, H*0.24, W*0.22, 5);
    [[0.80,0.30],[0.88,0.30],[0.80,0.44],[0.88,0.44],[0.80,0.58]].forEach(([wx,wy],i) => {
      const lit = i%4!==1;
      g.fillStyle(lit ? 0xffee77 : 0x10103a, lit ? 0.65 : 0.9);
      g.fillRect(W*wx, H*wy, 14, 10);
    });

    // ── Municipio — neoclassical town hall ─────────────────────────────────────
    // Main body
    g.fillGradientStyle(0x05052e, 0x05052e, 0x07073a, 0x07073a, 1);
    g.fillRect(W*0.22, H*0.04, W*0.56, H*0.74);

    // Triangular pediment
    g.fillStyle(0x04043a, 1);
    g.fillTriangle(W*0.30, H*0.04, W*0.70, H*0.04, W*0.50, H*-0.04);
    // Pediment detail line
    g.lineStyle(1, 0x1010aa, 0.5);
    g.lineBetween(W*0.32, H*0.04, W*0.68, H*0.04);

    // Cornice (decorative horizontal band)
    g.fillStyle(0x0c0c48, 1); g.fillRect(W*0.22, H*0.16, W*0.56, 8);
    g.fillStyle(0x0c0c48, 1); g.fillRect(W*0.22, H*0.62, W*0.56, 6);

    // Columns — 6 classical pillars
    [0.25, 0.32, 0.39, 0.53, 0.60, 0.67].forEach(cx => {
      // Column shaft
      g.fillStyle(0x0a0a40, 1);
      g.fillRect(W*cx, H*0.17, 10, H*0.45);
      // Capital (top) and base
      g.fillStyle(0x10104a, 1);
      g.fillRect(W*cx - 3, H*0.17, 16, 5);
      g.fillRect(W*cx - 3, H*0.60, 16, 5);
    });

    // Main entrance — double doors
    g.fillStyle(0x02021a, 1);
    g.fillRect(W*0.44, H*0.46, 22, H*0.16);
    g.fillRect(W*0.52, H*0.46, 22, H*0.16);
    g.fillEllipse(W*0.455+11, H*0.46, 22, 16);
    g.fillEllipse(W*0.525+11, H*0.46, 22, 16);
    g.lineStyle(1, 0x1818aa, 0.5);
    g.lineBetween(W*0.455+11, H*0.46+8, W*0.455+11, H*0.62);

    // Upper windows — arched
    [[0.28,0.20],[0.36,0.20],[0.56,0.20],[0.64,0.20],
     [0.28,0.36],[0.36,0.36],[0.56,0.36],[0.64,0.36]].forEach(([wx,wy],i) => {
      const lit = (i*5+2)%3!==0;
      g.fillStyle(lit ? 0x9999ff : 0x10103a, lit ? 0.55 : 0.9);
      g.fillRect(W*wx, H*wy+4, 16, 18);
      g.fillEllipse(W*wx+8, H*wy+4, 16, 10);
      if (lit) { g.fillStyle(0x6666ff, 0.08); g.fillEllipse(W*wx+8, H*wy+12, 30, 22); }
    });

    // Municipal clock — circular, center top
    g.fillStyle(0x0c0c48, 1); g.fillCircle(W*0.50, H*0.10, 14);
    g.fillStyle(0x1a1a88, 1); g.fillCircle(W*0.50, H*0.10, 11);
    g.lineStyle(1, 0x8888ff, 0.8);
    g.lineBetween(W*0.50, H*0.10, W*0.50, H*0.10 - 8); // 12
    g.lineBetween(W*0.50, H*0.10, W*0.50 + 6, H*0.10 + 4); // 4

    // ── Fountain — center of piazza ─────────────────────────────────────────────
    const fX = W*0.50, fY = H*0.72;
    // Water basin
    g.fillStyle(0x06063a, 1); g.fillEllipse(fX, fY, 130, 22);
    g.fillStyle(0x0808ff, 0.12); g.fillEllipse(fX, fY, 120, 18);
    // Basin rim
    g.lineStyle(2, 0x1010aa, 0.8); g.strokeEllipse(fX, fY, 130, 22);
    // Central column
    g.fillStyle(0x08085a, 1); g.fillRect(fX-4, H*0.60, 8, H*0.12);
    // Top bowl
    g.fillStyle(0x0a0a5a, 1); g.fillEllipse(fX, H*0.60, 50, 10);
    // Water glow — blue reflection in basin
    g.fillStyle(0x2244ff, 0.10); g.fillEllipse(fX, fY, 100, 14);
    g.fillStyle(0x4466ff, 0.06); g.fillEllipse(fX, H*0.78, 160, 20);

    // ── Cobblestone piazza floor ────────────────────────────────────────────────
    g.fillStyle(0x0a0a26, 1); g.fillRect(0, H*0.78, W, H*0.22);
    // Large fan-pattern cobblestone rings around fountain
    g.lineStyle(1, 0x14143a, 0.5);
    for (let r = 20; r < 200; r += 22) g.strokeEllipse(fX, H*0.92, r*2, r*0.6);
    // Radial lines
    for (let a = 0; a < 12; a++) {
      const angle = (a/12)*Math.PI*2;
      g.lineBetween(fX, H*0.92, fX+Math.cos(angle)*200, H*0.92+Math.sin(angle)*60);
    }

    // ── Street lamps flanking the piazza ───────────────────────────────────────
    [[0.15, true],[0.85, false]].forEach(([px]) => {
      const lX = W*px, lY = H*0.76;
      g.fillStyle(0xffee44, 0.06); g.fillCircle(lX, lY-5, 70);
      g.fillStyle(0xffcc00, 0.15); g.fillCircle(lX, lY-5, 22);
      g.fillStyle(0x1a1a3a, 1); g.fillRect(lX-2, H*0.38, 4, H*0.38);
      g.fillStyle(0x2a2a5a, 1); g.fillRect(lX-10, H*0.37, 20, 6);
      g.fillStyle(0xffffaa, 0.9); g.fillRect(lX-7, H*0.38, 14, 4);
    });

    // ── Atmospheric glow from building lights ──────────────────────────────────
    g.fillStyle(0x2222aa, 0.04); g.fillEllipse(W*0.50, H*0.40, 400, 300);

    // Vignettes
    g.fillGradientStyle(0x000000, 0x00000000, 0x000000, 0x00000000, 0.4);
    g.fillRect(0, 0, W*0.06, H);
    g.fillGradientStyle(0x00000000, 0x000000, 0x00000000, 0x000000, 0.4);
    g.fillRect(W*0.94, 0, W*0.06, H);
  }

  // ─────────────────────────────────────────── PIZZERIA ──────────────────────

  _bgPizzeria(g) {
    const W = SCENE_W, H = SCENE_H;

    // Base wall — warm amber-brick gradient
    g.fillGradientStyle(0x2a0900, 0x2a0900, 0x3d1200, 0x3d1200, 1);
    g.fillRect(0, 0, W, H);

    // Brick wall pattern — alternating rows with offset
    const bW = 46, bH = 18;
    for (let row = 0; row * bH < H * 0.78; row++) {
      const yb = row * bH;
      const off = (row % 2) * (bW / 2);
      g.fillStyle(row % 7 === 3 ? 0x3a1005 : 0x331005, 1);
      for (let x = -bW + off; x < W; x += bW) {
        g.fillRect(x + 1, yb + 1, bW - 2, bH - 2);
      }
    }
    // Mortar lines
    g.lineStyle(1, 0x1a0602, 0.9);
    for (let row = 0; row * bH < H * 0.78; row++) {
      const yb = row * bH;
      const off = (row % 2) * (bW / 2);
      g.lineBetween(0, yb, W, yb);
      for (let x = -bW + off; x < W; x += bW) g.lineBetween(x, yb, x, yb + bH);
    }

    // Left arch doorway opening
    const archX = W * 0.0, archW = W * 0.14, archH = H * 0.72;
    g.fillStyle(0x0d0300, 1);
    g.fillRect(archX, H * 0.08, archW, archH);
    // Arch curve top
    g.fillEllipse(archX + archW / 2, H * 0.08, archW, archW * 0.9);
    g.fillStyle(0x1a0500, 1);
    g.fillRect(archX, H * 0.08 + archW * 0.3, archW, 4); // shadow ledge

    // Neon sign board (top center)
    g.fillStyle(0x1c0702, 1);
    g.fillRect(W * 0.22, 10, W * 0.56, 60);
    g.lineStyle(2, 0x7a1c00, 1);
    g.strokeRect(W * 0.22, 10, W * 0.56, 60);
    // Neon glow effect — red-orange tubes
    g.lineStyle(3, 0xff5500, 0.9);
    g.lineBetween(W * 0.24, 20, W * 0.76, 20);
    g.lineBetween(W * 0.24, 62, W * 0.76, 62);
    g.fillStyle(0xff4400, 0.12);
    g.fillRect(W * 0.22, 10, W * 0.56, 60);
    // Neon outer glow
    g.fillStyle(0xff6600, 0.06);
    g.fillRect(W * 0.18, 6, W * 0.64, 68);

    // Ceiling — dark beams
    g.fillStyle(0x1a0803, 1);
    g.fillRect(0, 0, W, 12);
    const beamPositions = [0.15, 0.30, 0.50, 0.68, 0.85];
    beamPositions.forEach(bx => {
      g.fillStyle(0x150602, 1);
      g.fillRect(W * bx - 8, 0, 16, H * 0.15);
      g.lineStyle(1, 0x0d0401, 1);
      g.strokeRect(W * bx - 8, 0, 16, H * 0.15);
    });

    // Hanging garlic bundles
    [[0.22, 0.14], [0.42, 0.12], [0.58, 0.14]].forEach(([gx, gy]) => {
      g.lineStyle(1, 0x6b5a2a, 1);
      g.lineBetween(W * gx, H * 0.01, W * gx, H * gy);
      g.fillStyle(0xf5e8b0, 0.85);
      g.fillEllipse(W * gx, H * gy, 18, 12);
      g.fillStyle(0xe0d090, 0.7);
      g.fillEllipse(W * gx - 6, H * gy + 6, 12, 8);
      g.fillEllipse(W * gx + 6, H * gy + 6, 12, 8);
    });

    // Pizza oven (right side) — dome shape with alien blue glow inside
    const ovX = W * 0.61, ovY = H * 0.12, ovW = W * 0.30, ovH = H * 0.50;
    // Oven body — stone blocks
    g.fillStyle(0x4a3520, 1);
    g.fillRect(ovX, ovY, ovW, ovH);
    // Stone block pattern
    g.lineStyle(1, 0x3a2810, 0.8);
    for (let sy = 0; sy < ovH; sy += 20) g.lineBetween(ovX, ovY + sy, ovX + ovW, ovY + sy);
    for (let sx = 0; sx < ovW; sx += 28) g.lineBetween(ovX + sx, ovY, ovX + sx, ovY + ovH);
    // Oven opening — alien glow inside
    const opX = ovX + ovW * 0.15, opY = ovY + ovH * 0.30, opW = ovW * 0.70, opH = ovH * 0.45;
    g.fillStyle(0x001050, 1);
    g.fillRect(opX, opY, opW, opH);
    g.fillEllipse(opX + opW / 2, opY, opW, 20); // arch top
    // Alien blue plasma glow inside oven
    g.fillStyle(0x0044cc, 0.55);
    g.fillEllipse(opX + opW * 0.5, opY + opH * 0.6, opW * 0.7, opH * 0.5);
    g.fillStyle(0x2299ff, 0.35);
    g.fillEllipse(opX + opW * 0.5, opY + opH * 0.5, opW * 0.5, opH * 0.35);
    g.fillStyle(0xaaddff, 0.2);
    g.fillEllipse(opX + opW * 0.5, opY + opH * 0.4, opW * 0.3, opH * 0.2);
    // Oven glow spill onto floor
    g.fillStyle(0x0022aa, 0.08);
    g.fillRect(ovX, opY + opH, ovW, H * 0.78 - opY - opH);
    // Oven arch lintel
    g.fillStyle(0x3a2810, 1);
    g.fillRect(opX - 5, opY + opH, opW + 10, 8);

    // Pizza counter (center)
    const ctX = W * 0.14, ctY = H * 0.58, ctW = W * 0.44, ctH = H * 0.14;
    // Counter body
    g.fillStyle(0x2c1005, 1);
    g.fillRect(ctX, ctY, ctW, ctH);
    g.lineStyle(2, 0x5a2008, 1);
    g.strokeRect(ctX, ctY, ctW, ctH);
    // Counter top — marble-ish
    g.fillStyle(0xf0e8d8, 1);
    g.fillRect(ctX - 4, ctY - 8, ctW + 8, 10);
    g.lineStyle(1, 0xd0c8b0, 1);
    for (let mx = 0; mx < ctW; mx += 30) g.lineBetween(ctX + mx, ctY - 8, ctX + mx + 15, ctY + 2);
    // Glass display front
    g.fillStyle(0x88bbdd, 0.18);
    g.fillRect(ctX, ctY, ctW, ctH * 0.6);
    g.lineStyle(1, 0xaaccee, 0.5);
    g.strokeRect(ctX, ctY, ctW, ctH * 0.6);

    // Menu chalkboard on right wall
    const mbX = W * 0.62, mbY = H * 0.12, mbW = W * 0.22;
    // Already covered by oven — put it above oven
    g.fillStyle(0x0f1a0a, 1);
    g.fillRect(mbX + mbW * 0.05, ovY - H * 0.14, mbW * 0.9, H * 0.13);
    g.lineStyle(2, 0x3a2808, 1);
    g.strokeRect(mbX + mbW * 0.05, ovY - H * 0.14, mbW * 0.9, H * 0.13);
    // Chalk line decorations
    g.lineStyle(1, 0xffffff, 0.35);
    g.lineBetween(mbX + mbW * 0.1, ovY - H * 0.11, mbX + mbW * 0.9, ovY - H * 0.11);
    g.lineBetween(mbX + mbW * 0.1, ovY - H * 0.05, mbX + mbW * 0.9, ovY - H * 0.05);

    // Checkered floor — terracotta + dark
    const flY = H * 0.78, tileS = 32;
    for (let row = 0; row * tileS < H - flY; row++) {
      for (let col = 0; col * tileS < W; col++) {
        const isDark = (row + col) % 2 === 0;
        g.fillStyle(isDark ? 0x2a0e06 : 0x3d1a09, 1);
        g.fillRect(col * tileS, flY + row * tileS, tileS, tileS);
      }
    }
    g.lineStyle(1, 0x1a0804, 0.4);
    for (let fx = 0; fx < W; fx += tileS) g.lineBetween(fx, flY, fx, H);
    for (let fy = flY; fy < H; fy += tileS) g.lineBetween(0, fy, W, fy);

    // Ceiling lamp (center) — warm incandescent
    const lampX = W * 0.45;
    g.lineStyle(1, 0x3a1a08, 1);
    g.lineBetween(lampX, 0, lampX, H * 0.10);
    g.fillStyle(0x4a2a10, 1);
    g.fillTriangle(lampX - 22, H * 0.10, lampX + 22, H * 0.10, lampX, H * 0.18);
    g.fillStyle(0xffe0a0, 0.85);
    g.fillCircle(lampX, H * 0.14, 5);
    // Warm light cone
    g.fillStyle(0xff9900, 0.07);
    g.fillTriangle(lampX - 90, H * 0.78, lampX + 90, H * 0.78, lampX, H * 0.18);
    g.fillStyle(0xffcc44, 0.04);
    g.fillTriangle(lampX - 60, H * 0.78, lampX + 60, H * 0.78, lampX, H * 0.18);

    // Alien oven ambient blue glow spill left
    g.fillStyle(0x0033aa, 0.05);
    g.fillRect(W * 0.4, 0, W * 0.6, H);

    // Vignette corners
    g.fillStyle(0x000000, 0.45);
    g.fillTriangle(0, 0, W * 0.28, 0, 0, H * 0.55);
    g.fillTriangle(W, 0, W * 0.72, 0, W, H * 0.55);
    g.fillTriangle(0, H, W * 0.28, H, 0, H * 0.45);
    g.fillTriangle(W, H, W * 0.72, H, W, H * 0.45);
  }

  // ──────────────────────────────────────── RETROBOTTEGA ─────────────────────

  _bgRetrobottega(g) {
    const W = SCENE_W, H = SCENE_H;

    // Deep alien-tech interior — near black with green tint
    g.fillGradientStyle(0x000e04, 0x000e04, 0x001808, 0x001808, 1);
    g.fillRect(0, 0, W, H);

    // Wall panels — metal grid texture
    g.lineStyle(1, 0x003a12, 0.25);
    for (let x = 0; x < W; x += 36) g.lineBetween(x, 0, x, H * 0.78);
    for (let y = 0; y < H * 0.78; y += 36) g.lineBetween(0, y, W, y);
    // Heavier panel dividers
    g.lineStyle(2, 0x004a18, 0.5);
    [W * 0.27, W * 0.54, W * 0.73].forEach(px => g.lineBetween(px, 0, px, H * 0.78));
    [H * 0.28, H * 0.55].forEach(py => g.lineBetween(0, py, W, py));

    // Ceiling conduit pipes
    [[0.18, 0.03, 0.55, 0.03], [0.55, 0.03, 0.55, 0.20], [0.20, 0.07, 0.70, 0.07]].forEach(([x1,y1,x2,y2]) => {
      g.lineStyle(5, 0x002d0e, 1);
      g.lineBetween(W*x1, H*y1, W*x2, H*y2);
      g.lineStyle(1, 0x00aa44, 0.4);
      g.lineBetween(W*x1, H*y1, W*x2, H*y2);
    });

    // LEFT EQUIPMENT RACK ─────────────────────────────────────────
    const rX = W * 0.02, rY = H * 0.06, rW = W * 0.24, rH = H * 0.65;
    g.fillStyle(0x001206, 1);
    g.fillRect(rX, rY, rW, rH);
    g.lineStyle(2, 0x00551a, 1);
    g.strokeRect(rX, rY, rW, rH);
    // Rack rails (vertical channels)
    g.lineStyle(1, 0x003a10, 0.8);
    g.lineBetween(rX + 6, rY, rX + 6, rY + rH);
    g.lineBetween(rX + rW - 6, rY, rX + rW - 6, rY + rH);
    // Rack units (horizontal slabs)
    const rackColors = [0x001c08, 0x001808, 0x001a09, 0x001508, 0x001e0a, 0x001608];
    for (let u = 0; u < 8; u++) {
      const uy = rY + 8 + u * (rH - 16) / 8;
      const uh = (rH - 16) / 8 - 3;
      g.fillStyle(rackColors[u % rackColors.length], 1);
      g.fillRect(rX + 9, uy, rW - 18, uh);
      g.lineStyle(1, 0x004a16, 0.6);
      g.strokeRect(rX + 9, uy, rW - 18, uh);
    }
    // LEDs — deterministic colors by position
    const ledColors = [0x00ff55, 0x00ff55, 0xff4400, 0xffaa00, 0x00ff55, 0x00ff55, 0xffaa00, 0x00ff55,
                       0xff4400, 0x00ff55, 0x00ff55, 0xffaa00, 0x00ff55, 0xff4400, 0x00ff55, 0x00ff55];
    [[0.06,0.12],[0.10,0.12],[0.16,0.12],[0.21,0.12],
     [0.06,0.21],[0.10,0.21],[0.16,0.21],[0.21,0.21],
     [0.06,0.30],[0.10,0.30],[0.16,0.30],[0.21,0.30],
     [0.06,0.39],[0.10,0.39],[0.16,0.39],[0.21,0.39]].forEach(([ex, ey], i) => {
      const c = ledColors[i];
      g.fillStyle(c, 0.9);
      g.fillCircle(W * ex, H * ey, 3);
      g.fillStyle(c, 0.2);
      g.fillCircle(W * ex, H * ey, 7);
    });

    // CENTRAL ALIEN TRANSMITTER ─────────────────────────────────────
    const txX = W * 0.50, txY = H * 0.38;
    // Base pedestal
    g.fillStyle(0x001a08, 1);
    g.fillRect(txX - 45, H * 0.55, 90, H * 0.23);
    g.lineStyle(2, 0x00661e, 1);
    g.strokeRect(txX - 45, H * 0.55, 90, H * 0.23);
    // Outer glow rings
    g.fillStyle(0x00ff55, 0.04);
    g.fillEllipse(txX, txY, 260, 200);
    g.fillStyle(0x00ff55, 0.07);
    g.fillEllipse(txX, txY, 200, 155);
    g.fillStyle(0x00aa33, 0.15);
    g.fillEllipse(txX, txY, 145, 112);
    // Main device body
    g.fillStyle(0x001e0a, 1);
    g.fillEllipse(txX, txY, 110, 86);
    // Inner energy core
    g.fillStyle(0x00ff55, 0.45);
    g.fillEllipse(txX, txY, 60, 46);
    g.fillStyle(0x88ffaa, 0.6);
    g.fillEllipse(txX, txY, 28, 22);
    g.fillStyle(0xffffff, 0.7);
    g.fillEllipse(txX, txY, 10, 8);
    // Pulsing rings
    g.lineStyle(2, 0x00ee55, 0.8);
    g.strokeEllipse(txX, txY, 90, 70);
    g.lineStyle(1, 0x00cc44, 0.5);
    g.strokeEllipse(txX, txY, 124, 96);
    // Antennae from device
    [[txX - 35, txY - 20, txX - 60, H * 0.10],
     [txX + 35, txY - 20, txX + 55, H * 0.08],
     [txX, txY - 43, txX, H * 0.04]].forEach(([x1,y1,x2,y2]) => {
      g.lineStyle(2, 0x00aa33, 0.9);
      g.lineBetween(x1, y1, x2, y2);
      g.fillStyle(0x00ff55, 0.9);
      g.fillCircle(x2, y2, 4);
      g.fillStyle(0x00ff55, 0.25);
      g.fillCircle(x2, y2, 10);
    });

    // RIGHT COMPUTER TERMINAL ─────────────────────────────────────
    const tX = W * 0.69, tY = H * 0.05, tW = W * 0.29, tH = H * 0.52;
    g.fillStyle(0x001208, 1);
    g.fillRect(tX, tY, tW, tH);
    g.lineStyle(2, 0x006622, 1);
    g.strokeRect(tX, tY, tW, tH);
    // Screen bezel
    g.fillStyle(0x001a0a, 1);
    g.fillRect(tX + 8, tY + 8, tW - 16, tH * 0.75);
    // Phosphor green screen glow
    g.fillStyle(0x00ff44, 0.12);
    g.fillRect(tX + 10, tY + 10, tW - 20, tH * 0.73 - 4);
    // Scanlines
    g.lineStyle(1, 0x002a0e, 0.6);
    for (let sy = tY + 10; sy < tY + tH * 0.73; sy += 5) g.lineBetween(tX + 10, sy, tX + tW - 10, sy);
    // Text lines simulation
    g.lineStyle(1, 0x00cc44, 0.5);
    [0.15, 0.25, 0.35, 0.45, 0.55, 0.65].forEach(ly => {
      const lineW = (ly * 17 % 0.6 + 0.3) * (tW - 25);
      g.lineBetween(tX + 14, tY + tH * ly, tX + 14 + lineW, tY + tH * ly);
    });
    // Outer screen glow
    g.fillStyle(0x00ff44, 0.04);
    g.fillRect(tX - 5, tY - 5, tW + 10, tH + 10);
    // Keyboard below screen
    g.fillStyle(0x001408, 1);
    g.fillRect(tX + 5, tY + tH * 0.78, tW - 10, tH * 0.18);
    g.lineStyle(1, 0x004a18, 0.8);
    for (let kx = 0; kx < 8; kx++) {
      for (let ky = 0; ky < 3; ky++) {
        g.strokeRect(tX + 8 + kx * (tW - 18) / 8, tY + tH * 0.80 + ky * 8, (tW - 18) / 8 - 2, 6);
      }
    }

    // Wall-mounted storage crates (between rack and transmitter)
    [[W*0.29, H*0.08, 55, 38], [W*0.29, H*0.52, 55, 28]].forEach(([cx, cy, cw, ch]) => {
      g.fillStyle(0x001c08, 1);
      g.fillRect(cx, cy, cw, ch);
      g.lineStyle(2, 0x005520, 1);
      g.strokeRect(cx, cy, cw, ch);
      g.lineStyle(1, 0x004018, 0.5);
      g.lineBetween(cx + cw / 2, cy, cx + cw / 2, cy + ch);
      g.lineBetween(cx, cy + ch / 2, cx + cw, cy + ch / 2);
    });

    // Floor — dark metallic grid
    g.fillStyle(0x000e06, 1);
    g.fillRect(0, H * 0.78, W, H * 0.22);
    // Floor grid
    g.lineStyle(1, 0x002a0c, 0.7);
    for (let fx = 0; fx < W; fx += 44) g.lineBetween(fx, H * 0.78, fx, H);
    for (let fy = H * 0.78; fy < H; fy += 22) g.lineBetween(0, fy, W, fy);
    // Floor glow from transmitter
    g.fillStyle(0x00ff44, 0.05);
    g.fillEllipse(txX, H * 0.78, 200, 30);

    // Ambient green atmosphere
    g.fillStyle(0x00ff44, 0.025);
    g.fillRect(0, 0, W, H);

    // Vignette
    g.fillStyle(0x000000, 0.5);
    g.fillTriangle(0, 0, W * 0.30, 0, 0, H * 0.60);
    g.fillTriangle(W, 0, W * 0.70, 0, W, H * 0.60);
    g.fillTriangle(0, H, W * 0.30, H, 0, H * 0.40);
    g.fillTriangle(W, H, W * 0.70, H, W, H * 0.40);
  }

  // ───────────────────────────────────────────── TETTO ───────────────────────

  _bgTetto(g) {
    const W = SCENE_W, H = SCENE_H;

    // Deep night sky — blue-black gradient
    g.fillGradientStyle(0x000008, 0x000008, 0x050520, 0x050520, 1);
    g.fillRect(0, 0, W, H * 0.78);

    // Milky way band
    g.fillStyle(0xffffff, 0.025);
    g.fillEllipse(W * 0.5, H * 0.22, W * 1.3, 50);
    g.fillStyle(0xffffff, 0.015);
    g.fillEllipse(W * 0.5, H * 0.22, W * 1.0, 30);

    // Dense star field — deterministic
    const rooftopStars = [
      [2,3,2],[5,8,1],[8,2,1],[11,14,2],[14,6,1],[18,11,1],[21,4,2],[24,17,1],[27,9,1],[31,2,2],
      [34,15,1],[37,7,2],[41,12,1],[44,3,1],[47,19,2],[50,8,1],[53,14,1],[56,5,2],[59,18,1],[62,10,2],
      [65,3,1],[68,16,1],[71,7,2],[74,12,1],[77,2,1],[80,17,2],[83,8,1],[86,4,1],[89,14,2],[92,9,1],
      [95,3,2],[98,12,1],[3,22,1],[9,27,1],[15,20,2],[22,26,1],[28,24,1],[35,21,1],[42,28,2],
      [49,23,1],[56,27,1],[63,22,2],[70,26,1],[77,23,1],[84,20,1],[91,25,2],
      [6,35,1],[13,38,1],[20,33,1],[27,37,2],[34,32,1],[41,36,1],[48,34,1],[62,33,2],[69,37,1],[76,35,1],
    ];
    rooftopStars.forEach(([xp, yp, sz]) => {
      g.fillStyle(0xffffff, 0.25 + (xp % 11) * 0.055);
      g.fillCircle(xp / 100 * W, yp / 100 * H, sz);
      if (sz > 1) {
        g.fillStyle(0xffffff, 0.12);
        g.fillRect(xp / 100 * W - 7, yp / 100 * H - 0.5, 14, 1);
        g.fillRect(xp / 100 * W - 0.5, yp / 100 * H - 7, 1, 14);
      }
    });

    // Moon (upper-right) with halos
    const mX = W * 0.82, mY = H * 0.12;
    g.fillStyle(0x8899cc, 0.08); g.fillCircle(mX, mY, 52);
    g.fillStyle(0xaabbdd, 0.10); g.fillCircle(mX, mY, 38);
    g.fillStyle(0xdde4f5, 0.90); g.fillCircle(mX, mY, 24);
    g.fillStyle(0xffffff, 0.95); g.fillCircle(mX, mY, 20);
    // Moon craters
    g.fillStyle(0xe8edf8, 1); g.fillCircle(mX - 7, mY + 5, 4);
    g.fillStyle(0xe0e8f5, 1); g.fillCircle(mX + 8, mY - 6, 3);

    // City skyline silhouette
    const skyH = H * 0.63;
    const buildings = [
      [0.00, 0.09, 0.055],[0.05, 0.15, 0.058],[0.10, 0.07, 0.052],[0.15, 0.19, 0.060],
      [0.21, 0.09, 0.055],[0.27, 0.22, 0.058],[0.33, 0.11, 0.055],[0.38, 0.17, 0.060],
      [0.44, 0.07, 0.052],[0.50, 0.24, 0.062],[0.56, 0.13, 0.058],[0.61, 0.19, 0.060],
      [0.67, 0.09, 0.055],[0.72, 0.21, 0.058],[0.78, 0.15, 0.056],[0.83, 0.07, 0.052],
      [0.88, 0.17, 0.058],[0.93, 0.11, 0.055],[0.96, 0.13, 0.052],
    ];
    // Draw buildings (back layer slightly lighter)
    buildings.forEach(([bx, bh, bw], i) => {
      const bW2 = W * bw;
      const bH2 = H * bh;
      g.fillStyle(i % 3 === 0 ? 0x030310 : 0x020209, 1);
      g.fillRect(W * bx, skyH - bH2, bW2, bH2 + H * 0.15);
      // Lit windows — deterministic
      const winColors = [0xffee88, 0xffeebb, 0xffcc66, 0x88ccff];
      const wc = winColors[(i * 3 + 7) % winColors.length];
      if (i % 3 !== 1) {
        g.fillStyle(wc, 0.55);
        g.fillRect(W * bx + bW2 * 0.2, skyH - bH2 * 0.55, bW2 * 0.35, 5);
      }
      if (i % 5 === 0) {
        g.fillStyle(0xffee88, 0.4);
        g.fillRect(W * bx + bW2 * 0.55, skyH - bH2 * 0.30, bW2 * 0.28, 4);
      }
    });

    // Horizon haze — city light pollution
    g.fillStyle(0x0a0a38, 0.45);
    g.fillRect(0, skyH - 12, W, 34);
    g.fillStyle(0x181840, 0.20);
    g.fillRect(0, skyH - 28, W, 28);

    // ROOFTOP SURFACE ─────────────────────────────────────────────
    g.fillGradientStyle(0x0d0d22, 0x0d0d22, 0x0a0a1c, 0x0a0a1c, 1);
    g.fillRect(0, H * 0.78, W, H * 0.22);
    // Parapet / ledge at rooftop edge
    g.fillStyle(0x18182e, 1);
    g.fillRect(0, H * 0.78, W, 10);
    g.lineStyle(1, 0x2a2a44, 0.8);
    g.lineBetween(0, H * 0.78 + 10, W, H * 0.78 + 10);
    // Concrete texture joints
    g.lineStyle(1, 0x0a0a1c, 0.55);
    for (let fx = 0; fx < W; fx += 70) g.lineBetween(fx, H * 0.78, fx + 25, H);
    for (let fy = H * 0.82; fy < H; fy += 22) g.lineBetween(0, fy, W, fy);

    // Left chimney stack
    const chX = W * 0.08, chY = H * 0.60;
    g.fillStyle(0x1a1830, 1);
    g.fillRect(chX, chY, 44, H * 0.78 - chY);
    g.fillStyle(0x222038, 1);
    g.fillRect(chX - 5, chY, 54, 10); // cap
    // Chimney glow — smoke hint
    g.fillStyle(0x445566, 0.08);
    g.fillEllipse(chX + 22, chY - 10, 30, 20);

    // Right chimney stack
    const ch2X = W * 0.86, ch2Y = H * 0.64;
    g.fillStyle(0x1a1830, 1);
    g.fillRect(ch2X, ch2Y, 38, H * 0.78 - ch2Y);
    g.fillStyle(0x222038, 1);
    g.fillRect(ch2X - 4, ch2Y, 46, 8);

    // Water tower (left-center)
    const wtX = W * 0.20, wtY = H * 0.52;
    // Legs
    g.lineStyle(3, 0x181830, 1);
    [[wtX - 14, H * 0.78], [wtX, H * 0.78], [wtX + 14, H * 0.78]].forEach(([lx, ly]) => {
      g.lineBetween(wtX, wtY + 36, lx, ly);
    });
    // Tank body
    g.fillStyle(0x1c1c34, 1);
    g.fillRect(wtX - 22, wtY, 44, 38);
    g.fillEllipse(wtX, wtY, 44, 12); // top dome
    g.fillStyle(0x141428, 1);
    g.fillEllipse(wtX, wtY + 38, 44, 10); // bottom
    g.lineStyle(1, 0x303050, 0.7);
    g.strokeRect(wtX - 22, wtY, 44, 38);

    // Ventilation units
    [[W * 0.36, H * 0.81], [W * 0.52, H * 0.83], [W * 0.74, H * 0.82]].forEach(([vx, vy]) => {
      g.fillStyle(0x14142a, 1);
      g.fillRect(vx - 16, vy - 16, 32, 18);
      g.lineStyle(1, 0x282848, 0.8);
      g.strokeRect(vx - 16, vy - 16, 32, 18);
      // Fan grille
      g.lineStyle(1, 0x222244, 0.6);
      for (let gi = 0; gi < 4; gi++) g.lineBetween(vx - 13 + gi * 9, vy - 15, vx - 13 + gi * 9, vy);
    });

    // TV antenna (right)
    const anX = W * 0.68;
    g.lineStyle(2, 0x202035, 1);
    g.lineBetween(anX, H * 0.78, anX, H * 0.58);
    g.lineBetween(anX - 18, H * 0.62, anX + 18, H * 0.62);
    g.lineBetween(anX - 12, H * 0.67, anX + 12, H * 0.67);
    g.lineBetween(anX - 8, H * 0.72, anX + 8, H * 0.72);

    // ALIEN TRANSMITTER DISH (center) — the final boss device
    const txX = W * 0.50, txY = H * 0.72;
    // Mounting column
    g.fillStyle(0x181830, 1);
    g.fillRect(txX - 6, txY - H * 0.20, 12, H * 0.26);
    g.lineStyle(1, 0x2a2a50, 1);
    g.strokeRect(txX - 6, txY - H * 0.20, 12, H * 0.26);
    // Dish structure
    g.fillStyle(0x200a30, 1);
    g.fillEllipse(txX, txY - H * 0.20, 110, 40);
    g.fillStyle(0x30104a, 1);
    g.fillEllipse(txX, txY - H * 0.20, 90, 30);
    // Alien energy glow on dish
    g.fillStyle(0xaa00ff, 0.25);
    g.fillEllipse(txX, txY - H * 0.20, 70, 22);
    g.fillStyle(0xdd44ff, 0.4);
    g.fillEllipse(txX, txY - H * 0.20, 40, 14);
    g.fillStyle(0xffffff, 0.55);
    g.fillEllipse(txX, txY - H * 0.20, 16, 6);
    // Dish glow rings
    g.lineStyle(2, 0xbb22ff, 0.6);
    g.strokeEllipse(txX, txY - H * 0.20, 80, 26);
    g.lineStyle(1, 0x8800cc, 0.4);
    g.strokeEllipse(txX, txY - H * 0.20, 108, 38);
    // Energy beam going skyward
    g.fillStyle(0xaa00ff, 0.12);
    g.fillTriangle(txX - 20, txY - H * 0.20, txX + 20, txY - H * 0.20, txX, 0);
    g.fillStyle(0xdd44ff, 0.07);
    g.fillTriangle(txX - 35, txY - H * 0.20, txX + 35, txY - H * 0.20, txX, 0);
    // Purple glow on rooftop floor
    g.fillStyle(0xaa00ff, 0.07);
    g.fillEllipse(txX, H * 0.78, 180, 22);

    // Moonlight — faint blue cast on rooftop
    g.fillStyle(0x8899cc, 0.04);
    g.fillTriangle(mX - 50, H * 0.30, mX + 50, H * 0.30, mX, H * 0.78);

    // Vignette
    g.fillStyle(0x000000, 0.45);
    g.fillTriangle(0, 0, W * 0.30, 0, 0, H * 0.65);
    g.fillTriangle(W, 0, W * 0.70, 0, W, H * 0.65);
    g.fillTriangle(0, H, W * 0.28, H, 0, H * 0.38);
    g.fillTriangle(W, H, W * 0.72, H, W, H * 0.38);
  }

  // ── Object / NPC / Exit rendering ─────────────────────────────────────────

  /**
   * Place interactive object sprites in the scene.
   * Each sprite is a Phaser Text object using an emoji.
   */
  drawObjects(scene) {
    scene.objects.forEach(obj => {
      if (getFlag('gone_' + obj.id)) return;
      if (obj.id === 'trasmettitore' && getFlag('trasmettitore_distrutto')) return;

      const sprite = this.add.text(pxX(obj.x), pxY(obj.y), obj.emoji, {
        fontSize: `${obj.size}px`,
      })
        .setOrigin(0.5, 1)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });

      sprite.on('pointerover',  () => this._onHover(obj.label));
      sprite.on('pointerout',   () => this._onHoverEnd());
      sprite.on('pointerdown',  () => this._onObjectClick(obj));

      this._objectGroup.add(sprite);
    });
  }

  drawNPCs(scene) {
    (scene.npcs || []).forEach(npc => {
      const texKey = `npc_${npc.id}`;
      let sprite;
      if (this.textures.exists(texKey)) {
        // Scale custom sprite so its height matches the original emoji size
        sprite = this.add.image(pxX(npc.x), pxY(npc.y), texKey)
          .setOrigin(0.5, 1)
          .setDepth(2);
        const tex = this.textures.get(texKey).getSourceImage();
        const scale = npc.size / tex.height;
        sprite.setScale(scale);
      } else {
        sprite = this.add.text(pxX(npc.x), pxY(npc.y), npc.emoji, {
          fontSize: `${npc.size}px`,
        })
          .setOrigin(0.5, 1)
          .setDepth(2);
      }
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerover',  () => this._onHover(npc.label));
      sprite.on('pointerout',   () => this._onHoverEnd());
      sprite.on('pointerdown',  () => this._onNpcClick(npc));
      this._objectGroup.add(sprite);
    });
  }

  /**
   * Create invisible click zones at the edges of the scene for exits.
   * A small label appears on hover.
   */
  drawExits(scene) {
    (scene.exits || []).forEach(exit => {
      const x = exit.x / 100 * SCENE_W;
      const y = exit.y / 100 * SCENE_H;
      const w = exit.w / 100 * SCENE_W;
      const h = exit.h / 100 * SCENE_H;

      const zone = this.add.zone(x + w/2, y + h/2, w, h)
        .setDepth(8)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(x + w/2, y + h/2, exit.label, {
        fontFamily: FONT, fontSize: '7px', color: '#7ec8e3',
        backgroundColor: '#05051099', padding: { x: 6, y: 3 },
      })
        .setOrigin(0.5)
        .setDepth(9)
        .setVisible(false);

      zone.on('pointerover',  () => label.setVisible(true));
      zone.on('pointerout',   () => label.setVisible(false));
      zone.on('pointerdown',  () => this._onExitClick(exit));

      // Arrow decorations at edges
      const arrowEmoji = exit.label.startsWith('←') ? '◄' :
                         exit.label.startsWith('→') ? '►' :
                         exit.label.startsWith('↑') ? '▲' : '▼';
      this.add.text(x + w/2, y + h/2 + 18, arrowEmoji, {
        fontSize: '10px', color: '#7ec8e344',
      }).setOrigin(0.5).setDepth(8);

      this._objectGroup.add(zone);
      this._objectGroup.add(label);
    });
  }

  // ── Interactions ───────────────────────────────────────────────────────────

  _onHover(label) {
    const ui = this.scene.get('UIScene');
    if (ui) ui.setHoverLabel(label);
  }

  _onHoverEnd() {
    const ui = this.scene.get('UIScene');
    if (ui) ui.setHoverLabel('');
  }

  _onObjectClick(obj) {
    this._walkTo(pxX(obj.x), pxY(obj.y), () => this._execVerb(obj));
  }

  _onNpcClick(npc) {
    this._walkTo(pxX(npc.x), pxY(npc.y), () => {
      const verb = getVerb();
      if (verb === 'talk' || verb === 'walk') {
        const alreadyTalked = getFlag('talked_' + npc.id);
        const key = alreadyTalked ? npc.dlg2 : npc.dlg1;
        setFlag('talked_' + npc.id);
        this.events.emit('dialogue', key);
      } else if (verb === 'look') {
        const already = getFlag('talked_' + npc.id);
        this.events.emit('msg', npc.label + '. ' + (already ? 'Sembra nervoso.' : 'Potrebbe essere utile parlarci.'));
      } else {
        this.events.emit('msg', `Marco non può fare questo con ${npc.label}.`);
      }
    });
  }

  _onExitClick(exit) {
    if (exit.requireFlag && !getFlag(exit.requireFlag)) {
      this.events.emit('msg', exit.blockedMsg || 'Non puoi passare da lì.');
      return;
    }
    if (exit.requireItem && !hasItem(exit.requireItem)) {
      this.events.emit('msg', exit.blockedMsg || 'Non puoi passare da lì.');
      return;
    }
    // Walk to the exit zone center (top/bottom/side). Old code always used y = 84% height,
    // so “go up to roof” exits moved Marco to the floor first — confusing and felt broken.
    const tx = (exit.x + exit.w / 2) / 100 * SCENE_W;
    const ty = (exit.y + exit.h / 2) / 100 * SCENE_H;
    this._walkTo(tx, ty, () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(220, () => {
        this.cameras.main.fadeIn(300, 0, 0, 0);
        this.goScene(exit.to);
      });
    });
  }

  /** Called by UIScene when a verb button is clicked. */
  onVerbSelected(id) {
    setVerb(id);
    clearArmed();
    this.events.emit('verbChanged', id);
    this.events.emit('msg', '');
    this.events.emit('invChanged');
  }

  /** Called by UIScene when an inventory item is clicked. */
  onInventoryClick(id) {
    const item = ITEMS[id];
    const verb = getVerb();

    if (verb === 'look') {
      this.events.emit('msg', item.look || `Marco esamina ${item.label}.`);
      return;
    }

    if (verb === 'use') {
      if (getArmed() === id) {
        if (item.useAlone === 'CRAFT_CAPPELLO') {
          removeItem('stagnola');
          addItem('cappello');
          clearArmed();
          this.events.emit('invChanged');
          this.events.emit('msg', 'Marco piega la stagnola con grande cura (e qualche imprecazione) e costruisce un cappello anti-controllo mentale. Ridicolo ma efficace.');
        } else {
          clearArmed();
          this.events.emit('invChanged');
          this.events.emit('msg', '');
        }
      } else {
        setArmed(id);
        this.events.emit('invChanged');
        this.events.emit('msg', `Usa «${item.label}» su...`);
      }
      return;
    }

    this.events.emit('msg', `«${item.label}» è già nell'inventario di Marco.`);
  }

  // ── Verb execution ─────────────────────────────────────────────────────────

  _execVerb(obj) {
    const verb = getVerb();
    switch (verb) {
      case 'walk':
        this.events.emit('msg', `Marco si avvicina a «${obj.label}».`);
        break;
      case 'look': {
        const override = (obj.lookWhen || []).find(c => getFlag(c.flag));
        this.events.emit('msg', override ? override.text : (obj.look || `Marco osserva «${obj.label}».`));
        break;
      }
      case 'pick':
        if (obj.pick) {
          addItem(obj.pick.item);
          setFlag('gone_' + obj.id);
          this.events.emit('invChanged');
          this._refreshScene();
          this.events.emit('msg', obj.pick.msg);  // set AFTER refresh so it's not cleared
        } else {
          this.events.emit('msg', `Marco non riesce a prendere «${obj.label}».`);
        }
        break;
      case 'talk':
        this.events.emit('msg', `Non si può parlare con «${obj.label}».`);
        break;
      case 'open':
        this._execActionField(obj, 'open');
        break;
      case 'use':
        this._execUse(obj);
        break;
    }
  }

  _execUse(obj) {
    const armed = getArmed();
    if (armed) {
      this._execArmedCombo(armed, obj);
      clearArmed();
      this.events.emit('invChanged');
      return;
    }
    this._execActionField(obj, 'use');
  }

  _execActionField(obj, field) {
    const d = obj[field];
    if (!d) { this.events.emit('msg', `Non c'è niente da fare con «${obj.label}».`); return; }
    if (typeof d === 'string') { this.events.emit('msg', d); return; }
    if (d.action === 'DESTROY_TRANSMITTER') { this._destroyTransmitter(); return; }
    if (d.requireItem) {
      if (!hasItem(d.requireItem)) {
        this.events.emit('msg', `Ci vuole ${ITEMS[d.requireItem]?.label ?? d.requireItem} per farlo.`);
        return;
      }
      if (d.setFlag) setFlag(d.setFlag);
      if (d.msg)     this.events.emit('msg', d.msg);
      this.goScene(getScene());
    }
  }

  _execArmedCombo(armedId, obj) {
    if (armedId === 'chiavi' && obj.id === 'porta_retro') {
      setFlag('retro_open');
      this.events.emit('msg', 'Marco inserisce le chiavi. La porta si apre con un suono strano, quasi musicale. Alieno-musicale.');
      this.goScene(getScene());
      return;
    }
    if (armedId === 'martello' && obj.id === 'trasmettitore') {
      this._destroyTransmitter();
      return;
    }
    const itemLabel = ITEMS[armedId]?.label ?? armedId;
    this.events.emit('msg', `Non sembra utile usare «${itemLabel}» su «${obj.label}».`);
  }

  _destroyTransmitter() {
    if (getFlag('trasmettitore_distrutto')) { this.events.emit('msg', 'È già distrutto.'); return; }
    if (!hasItem('cappello')) { this.events.emit('msg', '"Troppo pericoloso avvicinarsi senza protezione mentale. Sento già la testa che si svuota..."'); return; }
    if (!hasItem('martello')) { this.events.emit('msg', '"Devo trovare qualcosa con cui distruggerla."'); return; }

    setFlag('trasmettitore_distrutto');

    // Impact: snappy flash + layered shake (reads clearer than one long rumble)
    this.cameras.main.flash(320, 255, 245, 255, false);
    this.cameras.main.shake(480, 0.022, false);
    this.time.delayedCall(200, () => {
      this.cameras.main.shake(280, 0.012, false);
    });

    this.events.emit('msg', 'KRAAKK! Marco colpisce il trasmettitore con tutta la forza. Scintille aliene volano ovunque! L\'antenna si piega, si storce e crolla. Il ronzio cessa. Silenzio.');

    this.time.delayedCall(1600, () => {
      this.goScene(getScene());
      this.time.delayedCall(300, () => this.spawnPlok());
    });

    saveGame();
  }

  // ── Character ──────────────────────────────────────────────────────────────

  resetCharacter() {
    const p = this._clampFeetToWalkBand(SCENE_W * 0.18, SCENE_H * 0.84);
    this._char.setPosition(p.x, p.y);
  }

  /**
   * Keeps Marco’s feet on the “floor” / walkable ground for the current scene.
   * Sprite origin is bottom-center — y is where the feet stand.
   */
  _clampFeetToWalkBand(x, y) {
    const scene = SCENES[getScene()];
    const b = scene.walkBand || {
      feetYMinPct: 72, feetYMaxPct: 93, feetXMinPct: 5, feetXMaxPct: 95,
    };
    const yMin = (b.feetYMinPct / 100) * SCENE_H;
    const yMax = (b.feetYMaxPct / 100) * SCENE_H;
    const xMin = ((b.feetXMinPct ?? 5) / 100) * SCENE_W;
    const xMax = ((b.feetXMaxPct ?? 95) / 100) * SCENE_W;
    return {
      x: Phaser.Math.Clamp(x, xMin, xMax),
      y: Phaser.Math.Clamp(y, yMin, yMax),
    };
  }

  /**
   * Move character to a position using a tween, then run a callback.
   * @param {number}   x
   * @param {number}   y
   * @param {Function} onComplete
   */
  _walkTo(x, y, onComplete) {
    const p = this._clampFeetToWalkBand(x, y);
    this.tweens.killTweensOf(this._char);
    const dist = Phaser.Math.Distance.Between(this._char.x, this._char.y, p.x, p.y);
    this.tweens.add({
      targets:  this._char,
      x:        p.x,
      y:        p.y,
      duration: Math.max(200, dist * 1.5),
      ease:     'Power1',
      onComplete,
    });
  }

  // ── Plok ───────────────────────────────────────────────────────────────────

  spawnPlok() {
    if (this.children.getByName('plok_sprite')) return;

    const spawn = SCENES.tetto.plokSpawn;
    let sprite;
    if (this.textures.exists('npc_plok')) {
      const tex = this.textures.get('npc_plok').getSourceImage();
      sprite = this.add.image(pxX(spawn.x), pxY(spawn.y), 'npc_plok')
        .setScale(spawn.size / tex.height)
        .setName('plok_sprite');
    } else {
      sprite = this.add.text(pxX(spawn.x), pxY(spawn.y), '👽', {
        fontSize: `${spawn.size}px`, name: 'plok_sprite',
      });
    }
    sprite
      .setOrigin(0.5, 1)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });

    this.cameras.main.flash(220, 140, 255, 200, false);
    this.cameras.main.shake(380, 0.014, false);

    sprite.on('pointerover',  () => this._onHover('PLOK — Supervisore Galattico'));
    sprite.on('pointerout',   () => this._onHoverEnd());
    sprite.on('pointerdown',  () => this._onNpcClick({ id: 'plok', label: 'PLOK', x: spawn.x, y: spawn.y, dlg1: 'plok_1', dlg2: 'plok_1' }));

    this.events.emit('msg', 'Dal nulla appare una figura verde. "PLOK — Supervisore Settore 7-G" lampeggia sul suo badge olografico.');
  }

  // ── Background click (walk) ────────────────────────────────────────────────

  /** Called when the player clicks empty space in the scene area. */
  handleSceneClick(pointer) {
    const wx = pointer.worldX != null ? pointer.worldX : pointer.x;
    const wy = pointer.worldY != null ? pointer.worldY : pointer.y;
    if (wy >= SCENE_H || wx < 0 || wx > SCENE_W) return;
    if (getVerb() !== 'walk') return;
    const ui = this.scene.get('UIScene');
    if (ui?._dlg?.visible) return;  // don't walk while dialogue is open
    // world coords stay correct when the camera shakes or fades
    this._walkTo(wx, wy, null);
  }
}
