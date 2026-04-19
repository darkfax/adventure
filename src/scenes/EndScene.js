/**
 * EndScene — Victory Screen
 */

import { GAME_W, GAME_H, FONT } from '../constants.js';
import { resetGame }             from '../game/state.js';

export class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' });
  }

  create() {
    // Background: deep green space (alien defeated)
    const g = this.add.graphics();
    g.fillGradientStyle(0x001a08, 0x001a08, 0x050510, 0x050510, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // Celebration emoji
    const emoji = this.add.text(GAME_W / 2, GAME_H / 2 - 140, '🎉', {
      fontSize: '64px',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: emoji, y: emoji.y - 14,
      duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.add.text(GAME_W / 2, GAME_H / 2 - 60, 'VITTORIA COSMICA!', {
      fontFamily: FONT, fontSize: '22px',
      color: '#57ff87',
      stroke: '#005520', strokeThickness: 4,
      shadow: { x: 3, y: 3, color: '#000', fill: true },
    }).setOrigin(0.5);

    const body = [
      'Marco Rossi ha salvato Porto Cosmo.',
      'Il trasmettitore è distrutto.',
      'Plok se n\'è andato (con l\'accordo sulla pizza).',
      '',
      'Il Gazzettino Cosmico ha finalmente uno scoop vero.',
    ].join('\n');

    this.add.text(GAME_W / 2, GAME_H / 2 + 20, body, {
      fontFamily: FONT, fontSize: '7px',
      color: '#c8c8e8', align: 'center', lineSpacing: 14,
    }).setOrigin(0.5);

    // Restart button
    const btn = this.add.text(GAME_W / 2, GAME_H / 2 + 150, '↺  RICOMINCIA', {
      fontFamily: FONT, fontSize: '9px',
      color: '#7ec8e3', padding: { x: 18, y: 10 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor('#7ec8e3'));
    btn.on('pointerdown', () => {
      resetGame();
      this.scene.stop('UIScene');
      this.scene.start('TitleScene');
    });
  }
}
