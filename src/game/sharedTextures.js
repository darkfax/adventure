/**
 * Tiny procedural textures used by Title, End, and particle FX.
 * Safe to call from any scene; generates once per game run.
 */

export function ensureSharedTextures(scene) {
  if (scene.textures.exists('fx_flare')) return;

  let g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(6, 6, 5);
  g.generateTexture('fx_flare', 12, 12);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(2, 2, 2);
  g.generateTexture('fx_spark', 5, 5);
  g.destroy();
}
