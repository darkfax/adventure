/**
 * characters.js — Programmatic pixel-art character textures
 *
 * Each function draws a character onto a Phaser Graphics object and
 * calls generateTexture() to register a named texture in the cache.
 * Call buildCharacterTextures(scene) once in BootScene.create().
 */

export function buildCharacterTextures(scene) {
  _makeMarco(scene);
  _makeNonna(scene);
  _makeSindaco(scene);
  _makeFranco(scene);
  _makePlok(scene);
}

// ── helpers ───────────────────────────────────────────────────────────────────

function _gen(scene, key, W, H, fn) {
  const g = scene.add.graphics();
  g.setVisible(false);
  fn(g, W, H);
  g.generateTexture(key, W, H);
  g.destroy();
}

// ── Marco — cosmic journalist / detective ─────────────────────────────────────

function _makeMarco(scene) {
  _gen(scene, 'marco', 40, 62, (g) => {
    // Fedora crown
    g.fillStyle(0x7a5228, 1);
    g.fillRect(11, 0, 18, 11);
    // Fedora brim
    g.fillStyle(0x5a3a18, 1);
    g.fillRect(4, 9, 32, 5);
    // Hat band
    g.fillStyle(0x2a1608, 1);
    g.fillRect(11, 8, 18, 3);
    // Hat highlight
    g.fillStyle(0x9a6838, 0.4);
    g.fillRect(12, 1, 6, 3);

    // Face
    g.fillStyle(0xf5c08a, 1);
    g.fillCircle(20, 21, 10);

    // Eyes
    g.fillStyle(0x1e0e06, 1);
    g.fillRect(13, 18, 5, 4);
    g.fillRect(22, 18, 5, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(14, 19, 2, 2);
    g.fillRect(23, 19, 2, 2);
    g.fillStyle(0x000000, 1);
    g.fillRect(15, 20, 1, 1);
    g.fillRect(24, 20, 1, 1);

    // Nose (tiny)
    g.fillStyle(0xd09870, 1);
    g.fillRect(19, 24, 2, 2);

    // Mouth (slight smirk)
    g.fillStyle(0xb07050, 1);
    g.fillRect(15, 27, 10, 2);
    g.fillRect(23, 26, 2, 2);

    // Ear
    g.fillStyle(0xf0b880, 1);
    g.fillRect(10, 20, 3, 5);
    g.fillRect(27, 20, 3, 5);

    // Neck
    g.fillStyle(0xf5c08a, 1);
    g.fillRect(17, 31, 6, 5);

    // Trench coat — body
    g.fillStyle(0xb89050, 1);
    g.fillRect(5, 35, 30, 18);
    // Lapels
    g.fillStyle(0xd4aa60, 1);
    g.fillRect(14, 35, 6, 10);
    g.fillRect(20, 35, 6, 10);
    // Center seam
    g.fillStyle(0x8a6a28, 1);
    g.fillRect(19, 35, 2, 18);
    // Belt
    g.fillStyle(0x7a5820, 1);
    g.fillRect(5, 50, 30, 4);
    // Belt buckle
    g.fillStyle(0xd4a020, 1);
    g.fillRect(17, 49, 6, 6);
    g.fillStyle(0xa87818, 1);
    g.fillRect(18, 50, 4, 4);

    // Sleeves
    g.fillStyle(0xb89050, 1);
    g.fillRect(0, 35, 6, 18);
    g.fillRect(34, 35, 6, 18);
    // Hands
    g.fillStyle(0xf0b880, 1);
    g.fillRect(0, 51, 6, 6);
    g.fillRect(34, 51, 6, 6);

    // Trousers
    g.fillStyle(0x222050, 1);
    g.fillRect(7, 54, 10, 10);
    g.fillRect(23, 54, 10, 10);

    // Shoes
    g.fillStyle(0x100806, 1);
    g.fillRect(5, 62, 14, 0); // placeholder — below texture
    g.fillRect(5, 59, 14, 5);
    g.fillRect(21, 59, 14, 5);
  });
}

// ── Nonna Giuseppa — local busybody ───────────────────────────────────────────

function _makeNonna(scene) {
  _gen(scene, 'npc_nonna', 36, 58, (g) => {
    // Hair bun (white-gray)
    g.fillStyle(0xd8d8d8, 1);
    g.fillCircle(18, 9, 9);
    g.fillStyle(0xe8e8e8, 1);
    g.fillCircle(18, 7, 6);
    g.fillStyle(0xf0f0f0, 1);
    g.fillCircle(16, 5, 3);

    // Face (plump, round)
    g.fillStyle(0xf0b880, 1);
    g.fillEllipse(18, 20, 18, 16);

    // Rosy cheeks
    g.fillStyle(0xff8888, 0.35);
    g.fillCircle(10, 22, 4);
    g.fillCircle(26, 22, 4);

    // Eyes (small, kind)
    g.fillStyle(0x3a2810, 1);
    g.fillRect(12, 18, 4, 3);
    g.fillRect(20, 18, 4, 3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(13, 18, 2, 2);
    g.fillRect(21, 18, 2, 2);

    // Eyebrows (arched, gray)
    g.fillStyle(0xaaaaaa, 1);
    g.fillRect(11, 15, 6, 2);
    g.fillRect(19, 15, 6, 2);

    // Nose
    g.fillStyle(0xd09060, 1);
    g.fillRect(17, 23, 2, 3);

    // Smile
    g.fillStyle(0xb07050, 1);
    g.fillRect(13, 27, 10, 2);
    g.fillRect(13, 26, 2, 2);
    g.fillRect(21, 26, 2, 2);

    // Neck
    g.fillStyle(0xf0b080, 1);
    g.fillRect(15, 28, 6, 5);

    // Dress (dark purple, old-fashioned)
    g.fillStyle(0x3a2860, 1);
    g.fillRect(5, 32, 26, 22);
    // Dress neckline
    g.fillStyle(0x4a3870, 1);
    g.fillRect(10, 32, 16, 6);
    // Dress texture lines
    g.lineStyle(1, 0x2a1848, 0.5);
    g.lineBetween(5, 38, 31, 38);
    g.lineBetween(5, 44, 31, 44);
    g.lineBetween(5, 50, 31, 50);

    // Apron (white)
    g.fillStyle(0xf0efe0, 1);
    g.fillRect(11, 35, 14, 19);
    g.lineStyle(1, 0xd8d8c8, 0.7);
    g.lineBetween(11, 42, 25, 42);
    g.lineBetween(11, 48, 25, 48);

    // Arms
    g.fillStyle(0x3a2860, 1);
    g.fillRect(0, 32, 6, 20);
    g.fillRect(30, 32, 6, 20);
    g.fillStyle(0xf0b080, 1);
    g.fillRect(0, 50, 6, 6);
    g.fillRect(30, 50, 6, 6);

    // Shoes (stout, black)
    g.fillStyle(0x0e0808, 1);
    g.fillRect(5, 54, 12, 6);
    g.fillRect(19, 54, 12, 6);
  });
}

// ── Sindaco Berlucci — pompous mayor ──────────────────────────────────────────

function _makeSindaco(scene) {
  _gen(scene, 'npc_sindaco', 40, 66, (g) => {
    // Top hat — cylinder
    g.fillStyle(0x0e0e12, 1);
    g.fillRect(10, 0, 20, 20);
    // Top hat — brim
    g.fillStyle(0x181820, 1);
    g.fillRect(4, 18, 32, 5);
    // Hat band
    g.fillStyle(0xaa8820, 1);
    g.fillRect(10, 15, 20, 4);
    // Hat highlight
    g.fillStyle(0x2a2a38, 0.6);
    g.fillRect(11, 1, 5, 12);

    // Face (chubby, self-important)
    g.fillStyle(0xf0c080, 1);
    g.fillEllipse(20, 31, 20, 17);

    // Rosy nose
    g.fillStyle(0xe09060, 1);
    g.fillCircle(20, 32, 3);

    // Eyes (beady, suspicious)
    g.fillStyle(0x1a0e06, 1);
    g.fillRect(13, 27, 4, 4);
    g.fillRect(23, 27, 4, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(14, 28, 2, 2);
    g.fillRect(24, 28, 2, 2);

    // Eyebrows (thick, furrowed)
    g.fillStyle(0x604830, 1);
    g.fillRect(12, 24, 7, 3);
    g.fillRect(21, 24, 7, 3);

    // Mustache (big, dark)
    g.fillStyle(0x303028, 1);
    g.fillEllipse(20, 36, 16, 6);
    g.fillStyle(0x1a1818, 1);
    g.fillRect(18, 36, 4, 3);

    // Mouth
    g.fillStyle(0x906040, 1);
    g.fillRect(15, 38, 10, 2);

    // Chin / jowls
    g.fillStyle(0xe8b870, 1);
    g.fillEllipse(20, 41, 14, 6);

    // Neck
    g.fillStyle(0xf0c080, 1);
    g.fillRect(16, 39, 8, 5);

    // White shirt + collar
    g.fillStyle(0xf8f8f0, 1);
    g.fillRect(14, 43, 12, 7);
    // Collar points
    g.fillTriangle(14, 43, 20, 47, 14, 50);
    g.fillTriangle(26, 43, 20, 47, 26, 50);

    // Tie (red)
    g.fillStyle(0xcc1010, 1);
    g.fillTriangle(18, 44, 22, 44, 20, 58);

    // Suit jacket (dark charcoal)
    g.fillStyle(0x282838, 1);
    g.fillRect(4, 43, 32, 20);
    // Lapels
    g.fillStyle(0x1e1e2a, 1);
    g.fillTriangle(4, 43, 16, 43, 4, 56);
    g.fillTriangle(36, 43, 24, 43, 36, 56);

    // Pocket square
    g.fillStyle(0xf8f8f0, 1);
    g.fillRect(27, 45, 5, 6);

    // Arms
    g.fillStyle(0x282838, 1);
    g.fillRect(0, 43, 5, 22);
    g.fillRect(35, 43, 5, 22);
    // Cuffs
    g.fillStyle(0xf8f8f0, 1);
    g.fillRect(0, 61, 5, 4);
    g.fillRect(35, 61, 5, 4);
    // Hands
    g.fillStyle(0xf0c080, 1);
    g.fillRect(0, 64, 5, 4);
    g.fillRect(35, 64, 5, 4);

    // Trousers
    g.fillStyle(0x1e1e2a, 1);
    g.fillRect(6, 63, 11, 5);
    g.fillRect(23, 63, 11, 5);

    // Shoes
    g.fillStyle(0x080608, 1);
    g.fillRect(4, 66, 0, 0); // below canvas — skip
    g.fillRect(4, 62, 14, 5);
    g.fillRect(22, 62, 14, 5);
  });
}

// ── Franco il Pizzaiolo — chef (suspicious alien collaborator) ────────────────

function _makeFranco(scene) {
  _gen(scene, 'npc_franco', 38, 60, (g) => {
    // Chef's toque (tall white hat)
    g.fillStyle(0xf4f4f0, 1);
    g.fillRect(8, 0, 22, 18);
    // Toque puffy top
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(19, 2, 24, 10);
    // Toque band
    g.fillStyle(0xe0e0d8, 1);
    g.fillRect(8, 15, 22, 4);
    // Toque creases
    g.lineStyle(1, 0xd8d8d0, 0.8);
    g.lineBetween(14, 0, 14, 15);
    g.lineBetween(19, 0, 19, 15);
    g.lineBetween(24, 0, 24, 15);

    // Face (warm, stocky)
    g.fillStyle(0xf0a870, 1);
    g.fillEllipse(19, 28, 20, 17);

    // Rosy cheeks
    g.fillStyle(0xff7755, 0.4);
    g.fillCircle(11, 30, 4);
    g.fillCircle(27, 30, 4);

    // Eyes (small, shifty)
    g.fillStyle(0x2a1a0c, 1);
    g.fillRect(12, 26, 4, 4);
    g.fillRect(22, 26, 4, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(13, 27, 2, 2);
    g.fillRect(23, 27, 2, 2);

    // Eyebrows (bushy)
    g.fillStyle(0x3a2010, 1);
    g.fillRect(11, 23, 7, 3);
    g.fillRect(20, 23, 7, 3);

    // Nose (bulbous)
    g.fillStyle(0xd08858, 1);
    g.fillCircle(19, 31, 3);

    // Smile (too friendly)
    g.fillStyle(0xb06040, 1);
    g.fillRect(13, 35, 12, 2);
    g.fillRect(13, 34, 2, 2);
    g.fillRect(23, 34, 2, 2);

    // Neck
    g.fillStyle(0xf0a870, 1);
    g.fillRect(16, 37, 6, 5);

    // White chef coat body
    g.fillStyle(0xf4f4f0, 1);
    g.fillRect(4, 41, 30, 16);
    // Double-breasted buttons
    g.fillStyle(0xd0d0c8, 1);
    g.fillCircle(14, 44, 2);
    g.fillCircle(14, 50, 2);
    g.fillCircle(14, 56, 2);
    g.fillCircle(24, 44, 2);
    g.fillCircle(24, 50, 2);
    g.fillCircle(24, 56, 2);
    // Center line
    g.fillStyle(0xe0e0d8, 1);
    g.fillRect(17, 41, 4, 16);

    // Arms (white sleeves)
    g.fillStyle(0xf4f4f0, 1);
    g.fillRect(0, 41, 5, 17);
    g.fillRect(33, 41, 5, 17);
    // Cuffs (thin dark line)
    g.lineStyle(2, 0xd0d0c8, 1);
    g.lineBetween(0, 56, 5, 56);
    g.lineBetween(33, 56, 38, 56);
    // Hands
    g.fillStyle(0xf0a870, 1);
    g.fillRect(0, 56, 5, 5);
    g.fillRect(33, 56, 5, 5);

    // Checkered pants
    const pY = 57, pH = 5, tS = 4;
    for (let row = 0; row * tS < pH + tS; row++) {
      for (let col = 0; col * tS < 30; col++) {
        g.fillStyle((row + col) % 2 === 0 ? 0x1a1a1a : 0xf0f0f0, 1);
        g.fillRect(4 + col * tS, pY + row * tS, tS, tS);
      }
    }

    // Shoes
    g.fillStyle(0x101010, 1);
    g.fillRect(3, 57, 12, 5);
    g.fillRect(23, 57, 12, 5);
  });
}

// ── PLOK — Galactic Supervisor (alien) ────────────────────────────────────────

function _makePlok(scene) {
  _gen(scene, 'npc_plok', 44, 58, (g) => {
    // Antenna
    g.lineStyle(2, 0x44bb44, 1);
    g.lineBetween(22, 0, 22, 8);
    g.fillStyle(0x88ffaa, 1);
    g.fillCircle(22, 0, 4);
    g.fillStyle(0xccffcc, 0.8);
    g.fillCircle(22, 0, 2);

    // Head (large, round, alien green)
    g.fillStyle(0x3aaa44, 1);
    g.fillEllipse(22, 22, 32, 26);
    // Head highlight
    g.fillStyle(0x55cc55, 0.5);
    g.fillEllipse(18, 16, 14, 10);

    // Large eyes (black with green iris)
    g.fillStyle(0x080e08, 1);
    g.fillEllipse(13, 21, 12, 14);
    g.fillEllipse(31, 21, 12, 14);
    // Iris (green glow)
    g.fillStyle(0x00ff44, 0.7);
    g.fillEllipse(13, 21, 7, 9);
    g.fillEllipse(31, 21, 7, 9);
    // Pupil
    g.fillStyle(0x000000, 1);
    g.fillEllipse(13, 22, 4, 6);
    g.fillEllipse(31, 22, 4, 6);
    // Eye shine
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(10, 18, 2);
    g.fillCircle(28, 18, 2);

    // Nostril slits
    g.fillStyle(0x228822, 1);
    g.fillRect(19, 28, 3, 2);
    g.fillRect(23, 28, 3, 2);

    // Mouth (thin horizontal slit)
    g.fillStyle(0x187a20, 1);
    g.fillRect(14, 32, 16, 2);
    // Teeth (small)
    g.fillStyle(0xeeffee, 0.8);
    g.fillRect(15, 32, 2, 2);
    g.fillRect(20, 32, 2, 2);
    g.fillRect(25, 32, 2, 2);

    // Neck
    g.fillStyle(0x3aaa44, 1);
    g.fillRect(18, 35, 8, 5);

    // Body (small, like a grub)
    g.fillStyle(0x2a8030, 1);
    g.fillEllipse(22, 47, 24, 18);
    // Body highlight
    g.fillStyle(0x44aa44, 0.5);
    g.fillEllipse(18, 43, 12, 7);
    // Alien insignia
    g.fillStyle(0x00ff44, 0.5);
    g.fillCircle(22, 47, 5);
    g.lineStyle(1, 0x55ff66, 0.7);
    g.lineBetween(22, 42, 22, 52);
    g.lineBetween(17, 47, 27, 47);

    // Tentacle arms
    g.lineStyle(4, 0x3aaa44, 1);
    g.lineBetween(10, 42, 2, 52);
    g.lineBetween(34, 42, 42, 52);
    // Sucker tips
    g.fillStyle(0x55cc66, 1);
    g.fillCircle(2, 52, 4);
    g.fillCircle(42, 52, 4);
    g.fillStyle(0x88ffaa, 0.6);
    g.fillCircle(2, 52, 2);
    g.fillCircle(42, 52, 2);

    // Levitation glow (floats, no legs)
    g.fillStyle(0x00ff44, 0.08);
    g.fillEllipse(22, 58, 30, 8);
  });
}
