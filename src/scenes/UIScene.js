/**
 * UIScene — Persistent HUD
 *
 * Runs in parallel on top of GameScene (launched with scene.launch, not
 * scene.start) so the verb bar, inventory, and message bar stay visible
 * while the game world underneath changes.
 *
 * Layout (y 410–600):
 *   410–460  message bar
 *   460–600  bottom panel: verbs (left) | inventory (right)
 *
 * Communication pattern:
 *   GameScene → UIScene : emits events on this.events (e.g. 'msg', 'inv')
 *   UIScene → GameScene : calls methods directly on the GameScene reference
 *
 * Phaser concepts used:
 *   • Multiple simultaneous scenes (scene.launch)
 *   • Scene cross-reference (this.scene.get)
 *   • Graphics for panel backgrounds and borders
 *   • Text GameObjects as interactive buttons
 *   • Container for grouping dialogue elements
 */

import { VERBS, ITEMS, DIALOGUES } from '../data/data.js';
import {
  getVerb, setVerb, getArmed, setArmed, clearArmed,
  getInventory, hasItem,
} from '../game/state.js';
import { GAME_W, MSG_Y, MSG_H, PANEL_Y, PANEL_H, VERB_W, INV_X, FONT, SCENE_H } from '../constants.js';
import { FONT_CINEMA } from '../game/visualTheme.js';

const D_PANEL = 0;
const D_VERB_BG = 1;
const D_VERB_TXT = 2;
const D_MSG = 3;
const D_INV = 2;
const D_DLG = 100;

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.gameScene = this.scene.get('GameScene');

    this.drawPanelBackground();
    this.buildVerbBar();
    this.refreshVerbBar(getVerb());
    this.buildInventory();
    this.buildMessageBar();
    this.buildDialogueBox();

    // Listen for events emitted by GameScene
    this.gameScene.events.on('msg',         text => this.setMessage(text),       this);
    this.gameScene.events.on('verbChanged', id   => this.refreshVerbBar(id),     this);
    this.gameScene.events.on('invChanged',  ()   => this.refreshInventory(),     this);
    this.gameScene.events.on('dialogue',    key  => this.openDialogue(key),      this);
    this.gameScene.events.on('shutdown',    ()   => this.cleanupListeners(),     this);
  }

  cleanupListeners() {
    this.gameScene.events.off('msg',         null, this);
    this.gameScene.events.off('verbChanged', null, this);
    this.gameScene.events.off('invChanged',  null, this);
    this.gameScene.events.off('dialogue',    null, this);
  }

  // ── Panel background ───────────────────────────────────────────────────────

  drawPanelBackground() {
    const g = this.add.graphics().setDepth(D_PANEL);

    g.fillGradientStyle(0x040810, 0x060c18, 0x080a14, 0x080a14, 1, 1, 1, 1);
    g.fillRect(0, MSG_Y, GAME_W, MSG_H);
    g.lineStyle(1, 0x4eefff, 0.28);
    g.lineBetween(0, MSG_Y, GAME_W, MSG_Y);
    g.lineStyle(1, 0x1a3048, 0.85);
    g.strokeRect(0, MSG_Y, GAME_W, MSG_H);

    g.fillGradientStyle(0x060a14, 0x060a14, 0x0a1424, 0x081018, 1);
    g.fillRect(0, PANEL_Y, GAME_W, PANEL_H);
    g.lineStyle(2, 0x4eefff, 0.22);
    g.lineBetween(0, PANEL_Y, GAME_W, PANEL_Y);
    g.lineStyle(1, 0xff4ec8, 0.1);
    g.lineBetween(0, PANEL_Y + 2, GAME_W, PANEL_Y + 2);

    g.lineStyle(1, 0x2a4a6a, 0.75);
    g.lineBetween(VERB_W + 10, PANEL_Y, VERB_W + 10, PANEL_Y + PANEL_H);
    g.lineStyle(1, 0x4eefff, 0.12);
    g.lineBetween(VERB_W + 11, PANEL_Y + 6, VERB_W + 11, PANEL_Y + PANEL_H - 6);
  }

  // ── Message bar ────────────────────────────────────────────────────────────

  buildMessageBar() {
    this._verbLabel = this.add.text(10, MSG_Y + MSG_H / 2, 'Cammina', {
      fontFamily: FONT_CINEMA,
      fontSize: '9px',
      color: '#ffe8a8',
      letterSpacing: '0.04em',
    })
      .setOrigin(0, 0.5)
      .setDepth(D_MSG);

    this._msgText = this.add.text(10, MSG_Y + 8, '', {
      fontFamily: FONT,
      fontSize: '7px',
      color: '#d8e0f0',
      wordWrap: { width: GAME_W - 20 },
      lineSpacing: 4,
    }).setDepth(D_MSG);
  }

  setMessage(text) {
    const verbName = VERBS.find(v => v.id === getVerb())?.label ?? '';
    const armed    = getArmed();

    if (text) {
      // Full message: hide verb label and show the text across 2 lines if needed
      this._verbLabel.setVisible(false);
      this._msgText.setY(MSG_Y + 8).setText(text);
    } else {
      this._verbLabel.setVisible(true).setText(armed
        ? `Usa «${ITEMS[armed].label}» su`
        : verbName
      );
      this._msgText.setText('');
    }
  }

  setHoverLabel(label) {
    const verbName = VERBS.find(v => v.id === getVerb())?.label ?? '';
    const armed    = getArmed();
    if (label) {
      const prefix = armed ? `Usa «${ITEMS[armed].label}» su ` : verbName + ' ';
      this._verbLabel.setVisible(true).setText(prefix + label);
      this._msgText.setText('');
    } else {
      this.setMessage('');
    }
  }

  // ── Verb bar ───────────────────────────────────────────────────────────────

  buildVerbBar() {
    this._verbBtns = {};

    // 3 columns × 2 rows grid
    const cols = 3;
    const btnW = Math.floor(VERB_W / cols);
    const btnH = Math.floor(PANEL_H / 2);

    VERBS.forEach((v, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x   = col * btnW + btnW / 2;
      const y   = PANEL_Y + row * btnH + btnH / 2;

      const btn = this.add.text(x, y, v.label, {
        fontFamily: FONT,
        fontSize:   '7px',
        color:      v.id === getVerb() ? '#ffffff' : '#9ee8ff',
        padding:    { x: 4, y: 4 },
        align:      'center',
      })
        .setOrigin(0.5)
        .setDepth(D_VERB_TXT)
        .setInteractive({ useHandCursor: true });

      const bg = this.add.graphics().setDepth(D_VERB_BG);

      btn.on('pointerover',  () => { if (getVerb() !== v.id) btn.setColor('#ffffff'); });
      btn.on('pointerout',   () => { if (getVerb() !== v.id) btn.setColor('#9ee8ff'); });
      btn.on('pointerdown',  () => {
        setVerb(v.id);
        this.refreshVerbBar(v.id);
        this.gameScene.onVerbSelected(v.id);
      });

      this._verbBtns[v.id] = { btn, bg };
    });
  }

  refreshVerbBar(activeId) {
    Object.entries(this._verbBtns).forEach(([id, { btn, bg }]) => {
      const isActive = id === activeId;
      btn.setColor(isActive ? '#ffffff' : '#9ee8ff');
      bg.clear();
      if (isActive) {
        const b = btn.getBounds();
        bg.fillStyle(0x1a3a52, 0.88);
        bg.fillRoundedRect(b.x - 6, b.y - 4, b.width + 12, b.height + 8, 8);
        bg.lineStyle(1, 0x4eefff, 0.65);
        bg.strokeRoundedRect(b.x - 6, b.y - 4, b.width + 12, b.height + 8, 8);
        bg.lineStyle(1, 0xa8f6ff, 0.2);
        bg.strokeRoundedRect(b.x - 4, b.y - 2, b.width + 8, b.height + 4, 6);
      }
    });
    const verbName = VERBS.find(v => v.id === activeId)?.label ?? '';
    this._verbLabel.setVisible(true).setText(verbName);
    this._msgText.setText('');
  }

  // ── Inventory ──────────────────────────────────────────────────────────────

  buildInventory() {
    this._invSlots = [];
    const cols  = 6;
    const rows  = 2;
    const slotW = Math.floor((GAME_W - INV_X - 10) / cols);
    const slotH = Math.floor(PANEL_H / rows);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = INV_X + c * slotW + slotW / 2;
        const y = PANEL_Y + r * slotH + slotH / 2;
        const idx = r * cols + c;

        // Slot border (hidden unless occupied)
        const border = this.add.graphics().setDepth(D_INV);

        // Emoji text (hidden until item is assigned)
        const emoji = this.add.text(x, y - 6, '', { fontSize: '20px' }).setOrigin(0.5).setDepth(D_INV);
        const name  = this.add.text(x, y + 14, '', {
          fontFamily: FONT, fontSize: '5px', color: '#7a8aa8', align: 'center',
          wordWrap: { width: slotW - 4 },
        }).setOrigin(0.5).setDepth(D_INV);

        const zone = this.add.zone(x, y, slotW, slotH).setInteractive({ useHandCursor: true }).setDepth(D_INV);
        zone.on('pointerover',  () => { if (this._invSlots[idx].item) this.setHoverLabel(ITEMS[this._invSlots[idx].item].label); });
        zone.on('pointerout',   () => this.setHoverLabel(''));
        zone.on('pointerdown',  () => { if (this._invSlots[idx].item) this.gameScene.onInventoryClick(this._invSlots[idx].item); });

        this._invSlots.push({ emoji, name, border, zone, item: null, x, y, slotW, slotH });
      }
    }
  }

  refreshInventory() {
    const inv = getInventory();
    const armed = getArmed();

    this._invSlots.forEach((slot, i) => {
      const itemId = inv[i] ?? null;
      slot.item = itemId;

      slot.border.clear();

      if (itemId) {
        const item = ITEMS[itemId];
        slot.emoji.setText(item.emoji);
        slot.name.setText(item.label);

        const borderColor = armed === itemId ? 0xffdd57 : 0x3a5a78;
        const lx = slot.x - slot.slotW / 2 + 2;
        const ly = slot.y - slot.slotH / 2 + 2;
        const lw = slot.slotW - 4;
        const lh = slot.slotH - 4;
        slot.border.lineStyle(armed === itemId ? 2 : 1, borderColor, 1);
        slot.border.strokeRoundedRect(lx, ly, lw, lh, 8);
        if (armed === itemId) {
          slot.border.lineStyle(1, 0xfff8c8, 0.35);
          slot.border.strokeRoundedRect(lx + 2, ly + 2, lw - 4, lh - 4, 6);
        }
      } else {
        slot.emoji.setText('');
        slot.name.setText('');
      }
    });
  }

  // ── Dialogue box ───────────────────────────────────────────────────────────

  buildDialogueBox() {
    this._dlg = this.add.container(0, 0).setVisible(false).setDepth(D_DLG);

    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x000008, 0x000008, 0x0a0518, 0x0a0518, 0.55, 0.55, 0.65, 0.65);
    overlay.fillRect(0, 0, GAME_W, SCENE_H);

    const boxX = 12;
    const boxY = SCENE_H - 182;
    const boxW = GAME_W - 24;
    const boxH = 172;
    const r = 14;
    const box = this.add.graphics();
    box.fillStyle(0x060a18, 0.94);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, r);
    box.lineStyle(2, 0x4eefff, 0.75);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, r);
    box.lineStyle(1, 0xff4ec8, 0.18);
    box.strokeRoundedRect(boxX + 3, boxY + 3, boxW - 6, boxH - 6, r - 3);

    this._dlgSpeaker = this.add.text(boxX + 16, boxY + 14, '', {
      fontFamily: FONT_CINEMA,
      fontSize: '10px',
      color: '#ffe8a8',
      letterSpacing: '0.06em',
    });

    this._dlgText = this.add.text(boxX + 16, boxY + 38, '', {
      fontFamily: FONT,
      fontSize: '7px',
      color: '#d8e4f5',
      wordWrap: { width: boxW - 32 },
      lineSpacing: 6,
    });

    this._dlgOptions = this.add.container(boxX + 16, boxY + 108);

    this._dlg.add([overlay, box, this._dlgSpeaker, this._dlgText, this._dlgOptions]);
  }

  openDialogue(key) {
    const node = DIALOGUES[key];
    if (!node) { this.closeDialogue(); return; }

    this._dlg.setVisible(true);
    this._dlgSpeaker.setText(node.speaker);
    this._clearDlgOptions();

    if (node.lines) {
      this._showMonologue(node.lines, 0, node.onClose);
    } else {
      this._showBranching(node);
    }
  }

  _showMonologue(lines, idx, onClose) {
    this._dlgText.setText(lines[idx]);
    this._clearDlgOptions();

    const isLast = idx >= lines.length - 1;
    this._addDlgButton(isLast ? '▶ Fine' : '▶ Continua', () => {
      if (isLast) {
        this.closeDialogue();
        if (onClose) this._handleClose(onClose);
      } else {
        this._showMonologue(lines, idx + 1, onClose);
      }
    });
  }

  _showBranching(node) {
    this._dlgText.setText(node.text || '');
    this._clearDlgOptions();

    const options = node.options;
    if (options && options.length) {
      options.forEach((opt, i) => {
        this._addDlgButton(opt.text, () => {
          if (opt.next) this.openDialogue(opt.next);
          else {
            this.closeDialogue();
            if (node.onClose) this._handleClose(node.onClose);
          }
        }, i);
      });
    } else {
      this._addDlgButton('▶ Fine', () => {
        this.closeDialogue();
        if (node.onClose) this._handleClose(node.onClose);
      });
    }
  }

  _addDlgButton(label, onClick, index = 0) {
    const btn = this.add.text(0, index * 24, label, {
      fontFamily: FONT, fontSize: '7px', color: '#9ee8ff',
      padding: { x: 6, y: 4 },
    }).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  () => btn.setColor('#ffffff'));
    btn.on('pointerout',   () => btn.setColor('#9ee8ff'));
    btn.on('pointerdown',  onClick);
    this._dlgOptions.add(btn);
  }

  _clearDlgOptions() {
    this._dlgOptions.removeAll(true);
    this._dlgText.setY(this._dlgText.y);
  }

  closeDialogue() {
    this._dlg.setVisible(false);
  }

  _handleClose(action) {
    if (action === 'TRIGGER_END') {
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('EndScene');
    }
  }
}
