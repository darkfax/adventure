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

    // Character sprite
    this._char = this.add.text(0, 0, '🕵️', { fontSize: '32px' })
      .setOrigin(0.5, 1)
      .setDepth(5);

    // Launch UIScene as a simultaneous overlay
    this.scene.launch('UIScene');

    // Background click → walk (only when verb is walk and dialogue is closed)
    this.input.on('pointerdown', pointer => this.handleSceneClick(pointer));

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

    // Scene name label
    if (this._sceneLabel) this._sceneLabel.destroy();
    this._sceneLabel = this.add.text(10, 8, scene.name, {
      fontFamily: FONT, fontSize: '7px', color: '#5a5a7a',
      backgroundColor: '#050510cc', padding: { x: 8, y: 4 },
    }).setDepth(8);
  }

  // ────────────────────────────────── APPARTAMENTO ───────────────────────────

  _bgAppartamento(g) {
    const W = SCENE_W, H = SCENE_H;

    // Warm dark room — back wall
    g.fillGradientStyle(0x1a0a00, 0x1a0a00, 0x2d1500, 0x2d1500, 1);
    g.fillRect(0, 0, W, H);

    // Window (top center-right) — shows night outside
    g.fillStyle(0x08082a, 1);
    g.fillRect(W * 0.55, 30, 140, 100);
    g.fillGradientStyle(0x02020e, 0x04041a, 0x07071c, 0x07071c, 1);
    g.fillRect(W * 0.55 + 4, 34, 132, 92);
    // Window stars
    [[0.57,0.1],[0.61,0.05],[0.66,0.14],[0.71,0.08],[0.76,0.13],[0.8,0.06],[0.84,0.11]].forEach(([x,y]) => {
      g.fillStyle(0xffffff, 0.7 + Math.random() * 0.3);
      g.fillCircle(W * x, H * y, 1);
    });
    // Window frame
    g.lineStyle(3, 0x3a1800, 1);
    g.strokeRect(W * 0.55, 30, 140, 100);
    // Cross frame
    g.lineBetween(W * 0.55 + 70, 30, W * 0.55 + 70, 130);
    g.lineBetween(W * 0.55, 80, W * 0.55 + 140, 80);

    // Left wall (darker)
    g.fillStyle(0x150800, 1);
    g.fillRect(0, 0, 90, H * 0.82);

    // Right wall
    g.fillStyle(0x180a00, 1);
    g.fillRect(W - 80, 0, 80, H * 0.82);

    // Wallpaper stripes (subtle)
    g.lineStyle(1, 0x2a1200, 0.4);
    for (let x = 90; x < W - 80; x += 28) g.lineBetween(x, 0, x, H * 0.82);

    // Floor
    g.fillStyle(0x2a1200, 1);
    g.fillRect(0, H * 0.78, W, H * 0.22);
    // Floor planks
    g.lineStyle(1, 0x200e00, 0.6);
    for (let x = 0; x < W; x += 60) g.lineBetween(x, H * 0.78, x, H);

    // Ceiling border
    g.fillStyle(0x0d0600, 1);
    g.fillRect(0, 0, W, 12);

    // Warm ambient light from a lamp (top-left corner glow)
    g.fillStyle(0xff8800, 0.06);
    g.fillCircle(60, 60, 120);
  }

  // ─────────────────────────────────────────── STRADA ────────────────────────

  _bgStrada(g) {
    const W = SCENE_W, H = SCENE_H;

    // Sky: deep night blue-black
    g.fillGradientStyle(0x000005, 0x000005, 0x06061a, 0x06061a, 1);
    g.fillRect(0, 0, W, H * 0.75);

    // Moon
    g.fillStyle(0xfffde8, 0.9);
    g.fillCircle(W * 0.82, 55, 26);
    g.fillStyle(0xfffde8, 0.15);
    g.fillCircle(W * 0.82, 55, 40);  // glow halo
    // Moon craters
    g.fillStyle(0xf0e8c0, 0.3);
    g.fillCircle(W * 0.82 + 8, 48, 5);
    g.fillCircle(W * 0.82 - 6, 62, 4);

    // Stars
    const starData = [
      [4,8],[10,3],[16,12],[22,5],[28,18],[35,8],[42,3],[50,14],
      [57,6],[63,20],[68,4],[74,10],[79,2],[85,16],[92,7],[96,11],
      [7,25],[19,28],[31,22],[44,30],[56,24],[67,27],[78,21],[90,29],
    ];
    starData.forEach(([xp, yp]) => {
      g.fillStyle(0xffffff, 0.5 + (xp % 5) * 0.1);
      g.fillCircle(xp / 100 * W, yp / 100 * H, 1 + (xp % 3) * 0.5);
    });

    // Left building (4-story)
    g.fillStyle(0x04041a, 1);
    g.fillRect(0, H * 0.12, W * 0.22, H * 0.63);
    g.fillStyle(0x060620, 1);
    g.fillRect(W * 0.22, H * 0.2, W * 0.06, H * 0.55);
    // Left windows
    [[0.04,0.18],[0.11,0.18],[0.04,0.32],[0.11,0.32],[0.04,0.46],[0.11,0.46]].forEach(([wx,wy]) => {
      const lit = Math.random() > 0.4;
      g.fillStyle(lit ? 0xffdd57 : 0x1a1a3a, lit ? 0.7 : 0.8);
      g.fillRect(W*wx, H*wy, 14, 10);
    });

    // Right building (3-story)
    g.fillStyle(0x030318, 1);
    g.fillRect(W * 0.78, H * 0.18, W * 0.22, H * 0.57);
    // Right windows
    [[0.81,0.22],[0.89,0.22],[0.81,0.36],[0.89,0.36],[0.81,0.50]].forEach(([wx,wy]) => {
      const lit = Math.random() > 0.5;
      g.fillStyle(lit ? 0xffdd57 : 0x1a1a3a, lit ? 0.65 : 0.8);
      g.fillRect(W*wx, H*wy, 14, 10);
    });

    // Sidewalk + road
    g.fillStyle(0x0e0e28, 1);
    g.fillRect(0, H * 0.75, W, H * 0.25);
    // Road center divider (faded dashes)
    g.fillStyle(0x1e1e3a, 0.5);
    for (let x = 0; x < W; x += 60) g.fillRect(x, H * 0.84, 36, 4);

    // Lamp post glow
    g.fillStyle(0xffdd00, 0.12);
    g.fillCircle(W * 0.48, H * 0.72, 80);
    g.fillStyle(0xffcc00, 0.25);
    g.fillCircle(W * 0.48, H * 0.72, 20);
    // Pole
    g.fillStyle(0x2a2a4a, 1);
    g.fillRect(W * 0.48 - 2, H * 0.35, 4, H * 0.4);
    // Lamp head
    g.fillStyle(0x3a3a5a, 1);
    g.fillRect(W * 0.44, H * 0.34, 20, 8);
  }

  // ──────────────────────────────────────────── PIAZZA ───────────────────────

  _bgPiazza(g) {
    const W = SCENE_W, H = SCENE_H;

    // Sky
    g.fillGradientStyle(0x000003, 0x000003, 0x04041a, 0x04041a, 1);
    g.fillRect(0, 0, W, H * 0.78);

    // Stars
    [[5,5],[12,14],[20,8],[30,16],[40,4],[52,12],[60,7],[70,18],[80,10],[88,5],[94,15],
     [15,25],[35,22],[55,28],[75,24],[92,20]].forEach(([xp,yp]) => {
      g.fillStyle(0xffffff, 0.4 + (xp%7)*0.08);
      g.fillCircle(xp/100*W, yp/100*H, 1+(xp%4>2?1:0));
    });

    // Municipio (town hall) — large central building
    g.fillStyle(0x06062a, 1);
    g.fillRect(W*0.25, H*0.05, W*0.5, H*0.73);
    // Columns (pilasters)
    g.fillStyle(0x0a0a32, 1);
    [0.27, 0.35, 0.43, 0.57, 0.65, 0.73].forEach(cx => {
      g.fillRect(W*cx, H*0.2, 12, H*0.58);
    });
    // Central pediment / triangle roof
    g.fillStyle(0x080828, 1);
    g.fillTriangle(W*0.35, H*0.05, W*0.65, H*0.05, W*0.5, H*0-10);
    // Municipio windows
    [[0.32,0.3],[0.44,0.3],[0.56,0.3],[0.68,0.3],[0.32,0.5],[0.44,0.5],[0.56,0.5],[0.68,0.5]].forEach(([wx,wy]) => {
      const lit = Math.random() > 0.3;
      g.fillStyle(lit ? 0x8888ff : 0x14143a, lit ? 0.6 : 0.9);
      g.fillRect(W*wx, H*wy, 16, 22);
    });
    // Side buildings
    g.fillStyle(0x04041e, 1);
    g.fillRect(0, H*0.25, W*0.22, H*0.53);
    g.fillRect(W*0.78, H*0.3, W*0.22, H*0.48);
    // Side windows
    [[0.03,0.32],[0.12,0.32],[0.03,0.48],[0.12,0.48]].forEach(([wx,wy]) => {
      g.fillStyle(Math.random()>0.5 ? 0xffdd57 : 0x1a1a3a, 0.7);
      g.fillRect(W*wx, H*wy, 12, 9);
    });

    // Square / cobblestones
    g.fillStyle(0x0c0c28, 1);
    g.fillRect(0, H*0.78, W, H*0.22);
    g.lineStyle(1, 0x16163a, 0.4);
    for (let x = 0; x < W; x += 40)  g.lineBetween(x, H*0.78, x, H);
    for (let y = H*0.82; y < H; y += 18) g.lineBetween(0, y, W, y);

    // Fountain glow (blue reflection)
    g.fillStyle(0x0044ff, 0.08);
    g.fillCircle(W*0.5, H*0.72, 70);
  }

  // ─────────────────────────────────────────── PIZZERIA ──────────────────────

  _bgPizzeria(g) {
    const W = SCENE_W, H = SCENE_H;

    // Warm brick interior
    g.fillGradientStyle(0x1e0400, 0x1e0400, 0x2e0800, 0x2e0800, 1);
    g.fillRect(0, 0, W, H);

    // Brick pattern (back wall)
    g.lineStyle(1, 0x3a0c00, 0.3);
    for (let y = 20; y < H*0.78; y += 18) {
      const offset = Math.floor(y/18) % 2 === 0 ? 0 : 22;
      for (let x = -22 + offset; x < W; x += 44) g.strokeRect(x, y, 42, 16);
    }

    // Large arch / entrance at the left
    g.fillStyle(0x180400, 1);
    g.fillRect(0, 0, W*0.18, H*0.82);

    // Sign / facade (top center)
    g.fillStyle(0x240600, 1);
    g.fillRect(W*0.28, 18, W*0.44, 70);
    g.lineStyle(2, 0x550e00, 1);
    g.strokeRect(W*0.28, 18, W*0.44, 70);
    // Sign text placeholder (actual text added as Phaser Text object in drawObjects)
    g.fillStyle(0xff6600, 0.15);
    g.fillRect(W*0.3, 20, W*0.4, 66);

    // Oven (right side) — blue alien glow
    g.fillStyle(0x001a40, 1);
    g.fillRect(W*0.62, H*0.12, W*0.28, H*0.55);
    g.fillStyle(0x0033aa, 0.5);
    g.fillEllipse(W*0.76, H*0.4, 100, 80);
    g.fillStyle(0x0055ff, 0.2);
    g.fillEllipse(W*0.76, H*0.4, 180, 140);
    // Oven bricks
    g.lineStyle(1, 0x002244, 0.5);
    for (let y = H*0.12; y < H*0.67; y += 14) g.lineBetween(W*0.62, y, W*0.9, y);

    // Counter (center-left)
    g.fillStyle(0x1a0600, 1);
    g.fillRect(W*0.08, H*0.55, W*0.38, H*0.12);
    g.lineStyle(1, 0x2a0a00, 1);
    g.strokeRect(W*0.08, H*0.55, W*0.38, H*0.12);

    // Floor (terracotta)
    g.fillStyle(0x280700, 1);
    g.fillRect(0, H*0.78, W, H*0.22);
    g.lineStyle(1, 0x350a00, 0.5);
    for (let x = 0; x < W; x += 50) g.lineBetween(x, H*0.78, x, H);
    for (let y = H*0.82; y < H; y += 22) g.lineBetween(0, y, W, y);

    // Ambient warm glow from oven
    g.fillStyle(0xff4400, 0.04);
    g.fillRect(W*0.4, 0, W*0.6, H);
  }

  // ──────────────────────────────────────── RETROBOTTEGA ─────────────────────

  _bgRetrobottega(g) {
    const W = SCENE_W, H = SCENE_H;

    // Dark alien green interior
    g.fillGradientStyle(0x001505, 0x001505, 0x002a0a, 0x002a0a, 1);
    g.fillRect(0, 0, W, H);

    // Wall grid (alien tech pattern)
    g.lineStyle(1, 0x003a10, 0.3);
    for (let x = 0; x < W; x += 40) g.lineBetween(x, 0, x, H*0.78);
    for (let y = 0; y < H*0.78; y += 40) g.lineBetween(0, y, W, y);

    // Left equipment rack
    g.fillStyle(0x001a06, 1);
    g.fillRect(W*0.04, H*0.08, W*0.22, H*0.62);
    g.lineStyle(2, 0x004a15, 1);
    g.strokeRect(W*0.04, H*0.08, W*0.22, H*0.62);
    // Equipment LEDs
    [[0.07,0.12],[0.14,0.12],[0.2,0.12],
     [0.07,0.22],[0.14,0.22],[0.2,0.22],
     [0.07,0.32],[0.14,0.32]].forEach(([ex,ey]) => {
      g.fillStyle([0x00ff44, 0xff4400, 0xffaa00][Math.floor(Math.random()*3)], 0.9);
      g.fillCircle(W*ex, H*ey, 3);
    });

    // Right computer terminal
    g.fillStyle(0x001a05, 1);
    g.fillRect(W*0.68, H*0.06, W*0.28, H*0.45);
    g.lineStyle(2, 0x005a1a, 1);
    g.strokeRect(W*0.68, H*0.06, W*0.28, H*0.45);
    // Screen glow
    g.fillStyle(0x00ff44, 0.1);
    g.fillRect(W*0.7, H*0.08, W*0.24, H*0.41);
    g.fillStyle(0x00ff44, 0.05);
    g.fillRect(W*0.66, H*0.04, W*0.32, H*0.49);
    // Scanlines
    g.lineStyle(1, 0x003a10, 0.4);
    for (let y = H*0.08; y < H*0.49; y += 6) g.lineBetween(W*0.7, y, W*0.94, y);

    // Central alien device (glowing)
    g.fillStyle(0x002008, 1);
    g.fillEllipse(W*0.5, H*0.3, 160, 120);
    g.fillStyle(0x00aa33, 0.3);
    g.fillEllipse(W*0.5, H*0.3, 130, 100);
    g.fillStyle(0x00ff55, 0.15);
    g.fillEllipse(W*0.5, H*0.3, 200, 160);
    // Pulsing ring
    g.lineStyle(2, 0x00dd44, 0.7);
    g.strokeEllipse(W*0.5, H*0.3, 110, 85);

    // Floor
    g.fillStyle(0x001a06, 1);
    g.fillRect(0, H*0.78, W, H*0.22);
    g.lineStyle(1, 0x002a0a, 0.6);
    for (let x = 0; x < W; x += 50) g.lineBetween(x, H*0.78, x, H);
    for (let y = H*0.82; y < H; y += 20) g.lineBetween(0, y, W, y);

    // Ambient green fill
    g.fillStyle(0x00ff44, 0.03);
    g.fillRect(0, 0, W, H);
  }

  // ───────────────────────────────────────────── TETTO ───────────────────────

  _bgTetto(g) {
    const W = SCENE_W, H = SCENE_H;

    // Very dark night sky
    g.fillGradientStyle(0x000002, 0x000002, 0x04041a, 0x04041a, 1);
    g.fillRect(0, 0, W, H * 0.78);

    // Milky way band (faint horizontal streak)
    g.fillStyle(0xffffff, 0.03);
    g.fillEllipse(W*0.5, H*0.25, W*1.2, 60);

    // Dense star field
    const rooftopStars = [
      [2,3],[5,8],[8,2],[11,14],[14,6],[18,11],[21,4],[24,17],[27,9],[31,2],
      [34,15],[37,7],[41,12],[44,3],[47,19],[50,8],[53,14],[56,5],[59,18],[62,10],
      [65,3],[68,16],[71,7],[74,12],[77,2],[80,17],[83,8],[86,4],[89,14],[92,9],[95,3],[98,12],
      [3,22],[9,27],[15,20],[22,26],[28,24],[35,21],[42,28],[49,23],[56,27],[63,22],[70,26],[77,23],[84,20],[91,25],
      [6,35],[13,38],[20,33],[27,37],[34,32],[41,36],[48,34],[55,38],[62,33],[69,37],[76,35],[83,32],[90,36],
    ];
    rooftopStars.forEach(([xp,yp]) => {
      const size = (xp % 5 === 0) ? 2 : 1;
      g.fillStyle(0xffffff, 0.3 + (xp%11)*0.06);
      g.fillCircle(xp/100*W, yp/100*H, size);
      if (size > 1) { // bright star cross
        g.fillStyle(0xffffff, 0.15);
        g.fillRect(xp/100*W - 6, yp/100*H - 0.5, 12, 1);
        g.fillRect(xp/100*W - 0.5, yp/100*H - 6, 1, 12);
      }
    });

    // City skyline (dark silhouette along horizon)
    const skylineH = H * 0.65;
    g.fillStyle(0x02020e, 1);
    // Varied building heights
    const buildings = [
      [0,0.08],[0.06,0.14],[0.11,0.06],[0.16,0.18],[0.22,0.08],[0.27,0.20],
      [0.33,0.10],[0.38,0.16],[0.44,0.06],[0.50,0.22],[0.56,0.12],[0.61,0.18],
      [0.67,0.08],[0.72,0.20],[0.78,0.14],[0.83,0.06],[0.88,0.16],[0.92,0.10],[0.96,0.12],
    ];
    buildings.forEach(([bx, bh]) => {
      const w = W * 0.06;
      const h = H * bh;
      g.fillRect(W*bx, skylineH - h, w, h + H*0.13);
      // Lit window on some buildings
      if (Math.random() > 0.5) {
        g.fillStyle(0xffdd5755, 0.6);
        g.fillRect(W*bx + w*0.25, skylineH - h*0.6, w*0.4, 6);
        g.fillStyle(0x02020e, 1);
      }
    });

    // Rooftop surface — rough concrete
    g.fillStyle(0x0c0c20, 1);
    g.fillRect(0, H*0.78, W, H*0.22);
    // Rooftop edge lip
    g.fillStyle(0x141428, 1);
    g.fillRect(0, H*0.78, W, 8);
    // Concrete cracks / texture
    g.lineStyle(1, 0x0a0a1e, 0.6);
    for (let x = 0; x < W; x += 80) g.lineBetween(x, H*0.78, x+30, H);
    for (let y = H*0.82; y < H; y += 20) g.lineBetween(0, y, W, y);

    // Atmospheric haze on horizon
    g.fillStyle(0x0a0a30, 0.4);
    g.fillRect(0, skylineH - 10, W, 30);
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
      const sprite = this.add.text(pxX(npc.x), pxY(npc.y), npc.emoji, {
        fontSize: `${npc.size}px`,
      })
        .setOrigin(0.5, 1)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });

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
    const tx = (exit.x < 50) ? (exit.x + 8) / 100 * SCENE_W : (exit.x - 8) / 100 * SCENE_W;
    this._walkTo(tx, SCENE_H * 0.84, () => {
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

    // Flash effect using camera
    this.cameras.main.flash(800, 255, 255, 255);
    this.cameras.main.shake(600, 0.015);

    this.events.emit('msg', 'KRAAKK! Marco colpisce il trasmettitore con tutta la forza. Scintille aliene volano ovunque! L\'antenna si piega, si storce e crolla. Il ronzio cessa. Silenzio.');

    this.time.delayedCall(1600, () => {
      this.goScene(getScene());
      this.time.delayedCall(300, () => this.spawnPlok());
    });

    saveGame();
  }

  // ── Character ──────────────────────────────────────────────────────────────

  resetCharacter() {
    this._char.setPosition(SCENE_W * 0.18, SCENE_H * 0.84);
  }

  /**
   * Move character to a position using a tween, then run a callback.
   * @param {number}   x
   * @param {number}   y
   * @param {Function} onComplete
   */
  _walkTo(x, y, onComplete) {
    this.tweens.killTweensOf(this._char);
    const dist = Phaser.Math.Distance.Between(this._char.x, this._char.y, x, y);
    this.tweens.add({
      targets:  this._char,
      x:        Math.min(SCENE_W - 20, Math.max(20, x)),
      y:        Math.min(SCENE_H - 10, Math.max(30, y)),
      duration: Math.max(200, dist * 1.5),
      ease:     'Power1',
      onComplete,
    });
  }

  // ── Plok ───────────────────────────────────────────────────────────────────

  spawnPlok() {
    if (this.children.getByName('plok_sprite')) return;

    const spawn = SCENES.tetto.plokSpawn;
    const sprite = this.add.text(pxX(spawn.x), pxY(spawn.y), '👽', {
      fontSize: `${spawn.size}px`, name: 'plok_sprite',
    })
      .setOrigin(0.5, 1)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });

    sprite.on('pointerover',  () => this._onHover('PLOK — Supervisore Galattico'));
    sprite.on('pointerout',   () => this._onHoverEnd());
    sprite.on('pointerdown',  () => this._onNpcClick({ id: 'plok', label: 'PLOK', x: spawn.x, y: spawn.y, dlg1: 'plok_1', dlg2: 'plok_1' }));

    this.events.emit('msg', 'Dal nulla appare una figura verde. "PLOK — Supervisore Settore 7-G" lampeggia sul suo badge olografico.');
  }

  // ── Background click (walk) ────────────────────────────────────────────────

  /** Called when the player clicks empty space in the scene area. */
  handleSceneClick(pointer) {
    if (pointer.y >= SCENE_H) return;
    if (getVerb() !== 'walk') return;
    const ui = this.scene.get('UIScene');
    if (ui?._dlg?.visible) return;  // don't walk while dialogue is open
    this._walkTo(pointer.x, pointer.y, null);
  }
}
