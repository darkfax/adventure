/**
 * engine.js — Game Engine
 *
 * This module is the heart of the game. It reads data from data.js,
 * reads and writes state through state.js, and updates the DOM to
 * reflect what the player sees and does.
 *
 * RESPONSIBILITIES:
 *  • Rendering scenes (background, objects, NPCs, exits, characters)
 *  • Handling player input (verb selection, clicks on objects/NPCs/exits)
 *  • Executing game actions (pick up, examine, open, use, talk)
 *  • Running special events (crafting, transmitter destruction, Plok)
 *  • Managing the dialogue system
 *  • Updating the inventory display
 *
 * WHAT THIS MODULE DOES NOT DO:
 *  • Store state directly — it calls state.js functions for that
 *  • Define game content — it reads from data.js
 *  • Bootstrap the game — that is main.js's job
 *
 * PATTERN: DOM IDs
 * ─────────────────
 * All DOM elements are accessed by id using getElementById().
 * The ids are defined in index.html and never change.
 * This is simpler than a component framework for a game this size.
 *
 * PATTERN: Event delegation vs direct listeners
 * ─────────────────────────────────────────────
 * Scene objects are recreated every time we enter a scene, so their
 * event listeners are added dynamically inside buildSceneObjects().
 * The scene area's background click is handled by a single listener
 * attached once in main.js (event delegation).
 */

import { VERBS, ITEMS, SCENES, DIALOGUES } from './data.js';
import {
  getScene, setScene,
  getVerb, setVerb,
  getArmed, setArmed, clearArmed,
  getInventory, hasItem, addItem, removeItem,
  getFlag, setFlag,
  saveGame,
} from './state.js';


// ── SCENE RENDERING ───────────────────────────────────────────────────────────

/**
 * Navigate to a scene: update state, re-render everything, save.
 * This is the main entry point for moving between locations.
 *
 * @param {string} id — a key from SCENES (e.g. 'strada', 'pizzeria')
 */
export function goScene(id) {
  setScene(id);
  clearArmed();
  setVerb('walk');

  const scene = SCENES[id];
  if (!scene) { console.error('Unknown scene:', id); return; }

  renderBackground(scene);
  renderDecor(scene);
  buildSceneObjects(scene, id);
  renderSceneLabel(scene.name);
  resetCharacterPosition();
  setMsg('');
  updateVerbBar();  // refresh active highlight after setVerb('walk')

  saveGame();
}

/** Set the CSS background of the scene area. */
function renderBackground(scene) {
  document.getElementById('sceneBg').style.background = scene.bg;
}

/**
 * Render background decorations: the floor strip, static HTML decor,
 * and optionally animated stars.
 */
function renderDecor(scene) {
  const decor = document.getElementById('sceneDecor');

  // The floor strip is a full-width bar at the bottom of the scene.
  const floorHtml = `<div class="floor-strip" style="background:${scene.floor.bg};height:${scene.floor.h}"></div>`;

  // Stars are generated programmatically so each scene gets a consistent
  // spread without us needing to hardcode positions in data.js.
  const starsHtml = scene.stars ? generateStars() : '';

  decor.innerHTML = floorHtml + scene.decor + starsHtml;
}

/**
 * Generate a fixed set of star positions.
 * The positions are hardcoded (not random) so the scene looks the same
 * every time the player enters it.
 */
function generateStars() {
  const positions = [
    [5,20],[15,8],[25,35],[35,15],[50,5],
    [65,25],[75,12],[85,30],[92,18],[45,10],
    [20,40],[70,22],
  ];
  return positions.map(([x, y], i) =>
    `<div class="star" style="left:${x}%;top:${y}%;animation-delay:${(i * 0.18).toFixed(2)}s">✧</div>`
  ).join('');
}

/**
 * Build all interactive elements in the scene: objects, NPCs, exits.
 * This function clears the container first, so it also acts as a refresh
 * (call it again to re-render after a flag changes, e.g. a door opens).
 *
 * @param {object} scene   — the scene data object from SCENES
 * @param {string} sceneId — the scene key (needed for Plok special case)
 */
function buildSceneObjects(scene, sceneId) {
  const container = document.getElementById('sceneObjects');
  container.innerHTML = '';

  // ── Objects ───────────────────────────────────────────────────────────────
  scene.objects.forEach(obj => {
    // Skip objects that have been picked up (flag 'gone_<id>' is set)
    if (getFlag('gone_' + obj.id)) return;
    // Skip the transmitter if it's been destroyed
    if (obj.id === 'trasmettitore' && getFlag('trasmettitore_distrutto')) return;

    const el = createSprite(obj.emoji, obj.label, obj.x, obj.y, obj.size);
    el.addEventListener('click', e => { e.stopPropagation(); onObjectClick(obj); });
    container.appendChild(el);
  });

  // ── NPCs ──────────────────────────────────────────────────────────────────
  (scene.npcs || []).forEach(npc => {
    const el = createSprite(npc.emoji, npc.label, npc.x, npc.y, npc.size);
    el.addEventListener('click', e => { e.stopPropagation(); onNpcClick(npc); });
    container.appendChild(el);
  });

  // ── Exits ─────────────────────────────────────────────────────────────────
  (scene.exits || []).forEach(exit => {
    const el = document.createElement('div');
    el.className = 'exit-zone';
    el.style.cssText = `left:${exit.x}%;top:${exit.y}%;width:${exit.w}%;height:${exit.h}%`;

    const tag = document.createElement('div');
    tag.className = 'exit-tag';
    tag.textContent = exit.label;
    el.appendChild(tag);

    el.addEventListener('click', e => { e.stopPropagation(); onExitClick(exit); });
    container.appendChild(el);
  });

  // ── Special: Plok appears on the roof after the transmitter is destroyed ──
  // This check happens every time we enter the tetto scene, so Plok is always
  // present if the transmitter has already been destroyed (even after leaving
  // and coming back).
  if (sceneId === 'tetto' && getFlag('trasmettitore_distrutto')) {
    spawnPlok(container);
  }
}

/**
 * Create a positioned emoji element (sprite) for a scene object or NPC.
 * Hover shows the label in the verb bar; mouse-leave restores it.
 *
 * @param {string} emoji
 * @param {string} label
 * @param {number} x     — left position as % of scene width
 * @param {number} y     — top position as % of scene height
 * @param {number} size  — font-size in px
 * @returns {HTMLElement}
 */
function createSprite(emoji, label, x, y, size) {
  const el = document.createElement('div');
  el.className = 'sprite';
  // bottom is calculated from y (which is a top% in data) so sprites sit
  // naturally on the floor: the lower the y value, the higher on screen.
  el.style.cssText = `left:${x}%;bottom:${100 - y - 4}%;font-size:${size}px`;
  el.textContent = emoji;
  el.title = label;
  el.addEventListener('mouseenter', () => showHoverLabel(label));
  el.addEventListener('mouseleave', () => showHoverLabel(''));
  return el;
}

/** Update the scene name label in the top-left corner. */
function renderSceneLabel(name) {
  document.getElementById('sceneLabel').textContent = name;
}

/** Place the character at the default starting position for any scene. */
function resetCharacterPosition() {
  const ch = document.getElementById('character');
  ch.style.left   = '18%';
  ch.style.bottom = '18%';
}


// ── VERB BAR ──────────────────────────────────────────────────────────────────

/**
 * Build the six verb buttons from the VERBS array and attach click listeners.
 * Called once when the game starts; the active class is updated by updateVerbBar().
 */
export function buildVerbBar() {
  const panel = document.getElementById('verbPanel');
  panel.innerHTML = '';

  VERBS.forEach(v => {
    const btn = document.createElement('button');
    btn.className   = 'vbtn' + (v.id === getVerb() ? ' active' : '');
    btn.textContent = v.label;
    btn.dataset.verb = v.id;
    btn.addEventListener('click', () => selectVerb(v.id));
    panel.appendChild(btn);
  });
}

/** Highlight the active verb button and update the verb label in the message bar. */
function updateVerbBar() {
  const current = getVerb();
  document.querySelectorAll('.vbtn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.verb === current);
  });
  const verbLabel = VERBS.find(v => v.id === current)?.label ?? '';
  document.getElementById('verbLabel').textContent = verbLabel;
}

/**
 * Called when the player clicks a verb button.
 * Switches the active verb and clears any armed item.
 *
 * @param {string} id — verb id from VERBS
 */
export function selectVerb(id) {
  setVerb(id);
  updateVerbBar();
  document.getElementById('msgText').textContent = '';
}


// ── INTERACTIONS ──────────────────────────────────────────────────────────────

/**
 * Called when the player clicks an empty part of the scene (not an object).
 * Only responds to WALK verb: moves the character to the clicked position.
 *
 * @param {MouseEvent} e
 */
export function onSceneClick(e) {
  // Only react if the click landed directly on a background element,
  // not on a sprite or exit zone (those call stopPropagation).
  const bg = document.getElementById('sceneArea');
  const isBackground = [
    bg,
    document.getElementById('sceneBg'),
    document.getElementById('sceneDecor'),
  ].includes(e.target);

  if (!isBackground) return;
  if (getVerb() !== 'walk') return;

  const rect = bg.getBoundingClientRect();
  const x = ((e.clientX - rect.left)  / rect.width)  * 100;
  const y = ((e.clientY - rect.top)   / rect.height) * 100;

  moveChar(x, Math.max(14, 100 - y - 8));
}

/**
 * Called when the player clicks a scene object.
 * Moves the character toward it, then executes the current verb.
 *
 * @param {object} obj — an entry from scene.objects in data.js
 */
function onObjectClick(obj) {
  moveChar(obj.x, Math.max(14, 100 - obj.y));
  setTimeout(() => execVerbOnObject(obj), 500);
}

/**
 * Execute the currently selected verb on a scene object.
 * Each case reads the object's data and produces a message or side-effect.
 *
 * @param {object} obj — scene object from data.js
 */
function execVerbOnObject(obj) {
  const verb = getVerb();

  switch (verb) {

    case 'walk':
      setMsg(`Marco si avvicina a «${obj.label}».`);
      break;

    case 'look': {
      // Check lookWhen conditions first — they override the default look text
      // when a specific flag is set (e.g. transmitter destroyed, door open).
      const override = (obj.lookWhen || []).find(c => getFlag(c.flag));
      setMsg(override ? override.text : (obj.look || `Marco osserva «${obj.label}». Niente di speciale.`));
      break;
    }

    case 'pick':
      if (obj.pick) {
        addItem(obj.pick.item);
        setMsg(obj.pick.msg);
        setFlag('gone_' + obj.id);
        buildSceneObjects(SCENES[getScene()], getScene());
        renderInventory();
      } else {
        setMsg(`Marco non riesce a prendere «${obj.label}».`);
      }
      break;

    case 'talk':
      setMsg(`Non si può parlare con «${obj.label}».`);
      break;

    case 'open':
      execActionField(obj, 'open');
      break;

    case 'use':
      execUseOnObject(obj);
      break;
  }
}

/**
 * Handle USE verb on a scene object.
 * If an item is armed ("USE <item> ON …"), check that combination first.
 * Otherwise, execute the object's own 'use' descriptor.
 *
 * @param {object} obj — scene object from data.js
 */
function execUseOnObject(obj) {
  const armed = getArmed();

  if (armed) {
    // The player has an item ready: "use <armed> on <obj>"
    execArmedCombination(armed, obj);
    clearArmed();
    renderInventory();
    return;
  }

  execActionField(obj, 'use');
}

/**
 * Execute an action descriptor stored in obj[field] ('use' or 'open').
 *
 * An action descriptor can be:
 *   null                                      — action not available
 *   string                                    — show the string as a message
 *   { requireItem, setFlag, msg }             — conditional action
 *   { action: 'DESTROY_TRANSMITTER' }         — special named action
 *
 * @param {object} obj   — scene object
 * @param {string} field — 'use' or 'open'
 */
function execActionField(obj, field) {
  const descriptor = obj[field];

  if (!descriptor) {
    setMsg(`Marco non riesce ad usare «${obj.label}» in questo modo.`);
    return;
  }

  // Plain string: just show the message
  if (typeof descriptor === 'string') {
    setMsg(descriptor);
    return;
  }

  // Special named actions handled by the engine
  if (descriptor.action === 'DESTROY_TRANSMITTER') {
    destroyTransmitter();
    return;
  }

  // Conditional action: requires an item in inventory
  if (descriptor.requireItem) {
    if (!hasItem(descriptor.requireItem)) {
      const itemLabel = ITEMS[descriptor.requireItem]?.label ?? descriptor.requireItem;
      setMsg(`Ci vuole ${itemLabel} per farlo.`);
      return;
    }
    // Item is present — perform the action
    if (descriptor.setFlag) setFlag(descriptor.setFlag);
    if (descriptor.msg)     setMsg(descriptor.msg);
    // Rebuild scene objects so state changes (e.g. open door) are visible
    buildSceneObjects(SCENES[getScene()], getScene());
    return;
  }

  setMsg(`Marco non riesce ad usare «${obj.label}» in questo modo.`);
}

/**
 * Handle "USE <armed item> ON <object>" combinations.
 * Most combinations don't make sense; specific ones produce meaningful results.
 *
 * @param {string} armedId — id of the item the player armed
 * @param {object} obj     — the scene object they used it on
 */
function execArmedCombination(armedId, obj) {
  // Chiavi + porta retro = open the back door
  if (armedId === 'chiavi' && obj.id === 'porta_retro') {
    setFlag('retro_open');
    setMsg('Marco inserisce le chiavi. La porta si apre con un suono strano, quasi musicale. Alieno-musicale.');
    buildSceneObjects(SCENES[getScene()], getScene());
    return;
  }

  // Martello + trasmettitore = destroy the transmitter
  if (armedId === 'martello' && obj.id === 'trasmettitore') {
    destroyTransmitter();
    return;
  }

  const itemLabel = ITEMS[armedId]?.label ?? armedId;
  setMsg(`Non sembra utile usare «${itemLabel}» su «${obj.label}».`);
}

/**
 * Called when the player clicks an NPC.
 * TALK and WALK both open dialogue; LOOK gives a brief description.
 *
 * @param {object} npc — an entry from scene.npcs in data.js
 */
function onNpcClick(npc) {
  moveChar(npc.x, Math.max(14, 100 - npc.y));

  setTimeout(() => {
    const verb = getVerb();

    if (verb === 'talk' || verb === 'walk') {
      // Use dlg2 for all conversations after the first
      const alreadyTalked = getFlag('talked_' + npc.id);
      const dialogueKey   = alreadyTalked ? npc.dlg2 : npc.dlg1;
      setFlag('talked_' + npc.id);
      openDialogue(dialogueKey);

    } else if (verb === 'look') {
      const already = getFlag('talked_' + npc.id);
      setMsg(npc.label + '. ' + (already ? 'Sembra nervoso.' : 'Potrebbe essere utile parlarci.'));

    } else {
      setMsg(`Marco non può fare questo con ${npc.label}.`);
    }
  }, 500);
}

/**
 * Called when the player clicks an exit zone.
 * Checks any conditions (requireFlag, requireItem), then navigates.
 *
 * @param {object} exit — an entry from scene.exits in data.js
 */
function onExitClick(exit) {
  // Check flag condition
  if (exit.requireFlag && !getFlag(exit.requireFlag)) {
    setMsg(exit.blockedMsg || 'Non puoi passare da lì.');
    return;
  }
  // Check item condition
  if (exit.requireItem && !hasItem(exit.requireItem)) {
    setMsg(exit.blockedMsg || 'Non puoi passare da lì.');
    return;
  }

  // Move character toward the exit before transitioning
  const tx = exit.x < 50 ? exit.x + 8 : exit.x - 8;
  moveChar(tx, 16);
  setTimeout(() => goScene(exit.to), 650);
}


// ── INVENTORY ─────────────────────────────────────────────────────────────────

/**
 * Re-render the inventory panel from the current state.
 * Called after any change to the inventory (pick up, craft, use).
 */
export function renderInventory() {
  const panel = document.getElementById('invPanel');
  panel.innerHTML = '';

  getInventory().forEach(id => {
    const item = ITEMS[id];
    const slot = document.createElement('div');
    slot.className = 'inv-slot' + (getArmed() === id ? ' armed' : '');

    slot.innerHTML = `<span class="inv-emoji">${item.emoji}</span>`
                   + `<span class="inv-name">${item.label}</span>`;

    slot.addEventListener('mouseenter', () => showHoverLabel(item.label));
    slot.addEventListener('mouseleave', () => showHoverLabel(''));
    slot.addEventListener('click',      () => onInventoryClick(id));
    panel.appendChild(slot);
  });
}

/**
 * Handle a click on an inventory item.
 *
 * LOOK verb:   describe the item.
 * USE verb:    arm the item (first click) or use it alone (second click).
 * Other verbs: generic message.
 *
 * @param {string} id — item id from ITEMS
 */
function onInventoryClick(id) {
  const item = ITEMS[id];
  const verb = getVerb();

  if (verb === 'look') {
    setMsg(item.look || `Marco esamina ${item.label}.`);
    return;
  }

  if (verb === 'use') {
    if (getArmed() === id) {
      // Clicked the already-armed item: try using it alone
      if (item.useAlone === 'CRAFT_CAPPELLO') {
        craftCappello();
      } else {
        // Nothing to do alone — cancel
        clearArmed();
        renderInventory();
        setMsg('');
      }
    } else {
      // Arm the item, waiting for a target
      setArmed(id);
      renderInventory();
      setMsg(`Usa «${item.label}» su...`);
    }
    return;
  }

  setMsg(`«${item.label}» è già nell'inventario di Marco.`);
}


// ── SPECIAL ACTIONS ───────────────────────────────────────────────────────────

/**
 * Craft the tin-foil hat from the stagnola item.
 * Removes stagnola from inventory, adds cappello.
 */
function craftCappello() {
  removeItem('stagnola');
  addItem('cappello');
  clearArmed();
  renderInventory();
  setMsg('Marco piega la stagnola con grande cura (e qualche imprecazione) e costruisce un cappello anti-controllo mentale. Ridicolo ma efficace.');
}

/**
 * Destroy the alien transmitter on the rooftop.
 *
 * Requires:
 *   - cappello in inventory (mental protection)
 *   - martello in inventory (physical tool)
 *
 * Effects:
 *   - Sets 'trasmettitore_distrutto' flag
 *   - Triggers a visual flash effect
 *   - Rebuilds scene objects (transmitter disappears)
 *   - Spawns Plok after a short delay
 */
function destroyTransmitter() {
  if (getFlag('trasmettitore_distrutto')) {
    setMsg('È già distrutto.');
    return;
  }
  if (!hasItem('cappello')) {
    setMsg('"Troppo pericoloso avvicinarsi senza protezione mentale. Sento già la testa che si svuota..."');
    return;
  }
  if (!hasItem('martello')) {
    setMsg('"Devo trovare qualcosa con cui distruggerla."');
    return;
  }

  setFlag('trasmettitore_distrutto');

  // Visual flash: CSS class is added and then removed after the animation
  const area = document.getElementById('sceneArea');
  area.classList.add('flash');
  setTimeout(() => area.classList.remove('flash'), 900);

  setMsg('KRAAKK! Marco colpisce il trasmettitore con tutta la forza. '
       + 'Scintille aliene volano ovunque! L\'antenna si piega, si storce e crolla. '
       + 'Il ronzio cessa. Silenzio.');

  // Rebuild scene so the transmitter sprite is removed
  buildSceneObjects(SCENES[getScene()], getScene());

  // Plok appears a moment after the destruction
  setTimeout(() => {
    const container = document.getElementById('sceneObjects');
    spawnPlok(container);
  }, 1600);

  saveGame();
}

/**
 * Add Plok to the scene as a clickable NPC sprite.
 * Uses the plokSpawn coordinates defined in the tetto scene data.
 *
 * @param {HTMLElement} container — the sceneObjects div
 */
function spawnPlok(container) {
  // Don't add Plok twice if already in the DOM
  if (document.getElementById('plok_sprite')) return;

  const spawn = SCENES.tetto.plokSpawn;
  const el = createSprite('👽', 'PLOK', spawn.x, spawn.y, spawn.size);
  el.id = 'plok_sprite';

  el.addEventListener('mouseenter', () => showHoverLabel('PLOK — Supervisore Galattico'));
  el.addEventListener('mouseleave', () => showHoverLabel(''));
  el.addEventListener('click', e => {
    e.stopPropagation();
    // Plok always uses dlg1 (the tree leads to the end by itself)
    onNpcClick({ id: 'plok', label: 'PLOK', x: spawn.x, y: spawn.y, dlg1: 'plok_1', dlg2: 'plok_1' });
  });

  container.appendChild(el);
  setMsg('Dal nulla appare una figura verde. "PLOK — Supervisore Settore 7-G" lampeggia sul suo badge olografico.');
}


// ── DIALOGUE ──────────────────────────────────────────────────────────────────

/**
 * Open a dialogue node by key.
 * Handles both monologue (lines[]) and branching (options[]) formats.
 *
 * @param {string} key — a key from DIALOGUES in data.js
 */
export function openDialogue(key) {
  const node = DIALOGUES[key];
  if (!node) { closeDialogue(); return; }

  const box     = document.getElementById('dialogueBox');
  const speaker = document.getElementById('dlgSpeaker');
  const text    = document.getElementById('dlgText');
  const options = document.getElementById('dlgOptions');

  box.classList.remove('hidden');
  speaker.textContent = node.speaker;

  if (node.lines) {
    // ── Monologue: display lines one at a time ─────────────────────────────
    // We use a closure to keep track of which line we're showing.
    // A "closure" is a function that remembers variables from the scope
    // where it was created — here, `lineIndex` persists between button clicks.
    let lineIndex = 0;

    const showLine = () => {
      text.textContent = node.lines[lineIndex];
      options.innerHTML = '';

      const btn = document.createElement('button');
      btn.className   = 'dlg-opt';
      btn.textContent = lineIndex < node.lines.length - 1 ? '▶ Continua' : '▶ Fine';

      btn.addEventListener('click', () => {
        lineIndex++;
        if (lineIndex < node.lines.length) {
          showLine();
        } else {
          closeDialogue();
          if (node.onClose) handleDialogueClose(node.onClose);
        }
      });

      options.appendChild(btn);
    };

    showLine();

  } else {
    // ── Branching: show text and player-choice buttons ─────────────────────
    text.textContent = node.text || '';
    options.innerHTML = '';

    const choices = node.options;
    if (choices && choices.length) {
      choices.forEach(opt => {
        const btn = document.createElement('button');
        btn.className   = 'dlg-opt';
        btn.textContent = opt.text;
        btn.addEventListener('click', () => {
          if (opt.next) {
            openDialogue(opt.next);      // follow the tree
          } else {
            closeDialogue();
            if (node.onClose) handleDialogueClose(node.onClose);
          }
        });
        options.appendChild(btn);
      });
    } else {
      // No options: single "Fine" button
      const btn = document.createElement('button');
      btn.className   = 'dlg-opt';
      btn.textContent = '▶ Fine';
      btn.addEventListener('click', () => {
        closeDialogue();
        if (node.onClose) handleDialogueClose(node.onClose);
      });
      options.appendChild(btn);
    }
  }
}

/** Hide the dialogue box. */
function closeDialogue() {
  document.getElementById('dialogueBox').classList.add('hidden');
}

/**
 * Execute an action triggered when a dialogue ends.
 *
 * @param {string} action — action id from the dialogue's onClose field
 */
function handleDialogueClose(action) {
  if (action === 'TRIGGER_END') {
    triggerVictory();
  }
}

/** Show the victory / end screen. */
function triggerVictory() {
  document.getElementById('gameScreen').classList.add('hidden');
  document.getElementById('endScreen').classList.remove('hidden');
}


// ── CHARACTER MOVEMENT ────────────────────────────────────────────────────────

/**
 * Animate the character moving to a position on screen.
 * CSS transitions (defined in styles.css) handle the smooth movement.
 * The 'walking' class triggers a brief flip animation.
 *
 * @param {number} x         — target left position as % of scene width
 * @param {number} bottomPct — target bottom position as % of scene height
 */
function moveChar(x, bottomPct) {
  const ch = document.getElementById('character');
  ch.classList.add('walking');
  ch.style.left   = Math.min(88, Math.max(4, x - 2)) + '%';
  ch.style.bottom = bottomPct + '%';

  // Remove the walking class after the animation completes
  clearTimeout(ch._walkTimer);
  ch._walkTimer = setTimeout(() => ch.classList.remove('walking'), 750);
}


// ── UI HELPERS ────────────────────────────────────────────────────────────────

/**
 * Show a message in the bottom message bar.
 * Prepends " — " as a visual separator from the verb label.
 *
 * @param {string} text — the message, or '' to clear
 */
export function setMsg(text) {
  document.getElementById('msgText').textContent = text ? ' — ' + text : '';
}

/**
 * Update the verb bar label when hovering over a sprite or inventory item.
 * Shows "VERB label" or "Usa «item» su label" when an item is armed.
 *
 * @param {string} label — the hovered element's name, or '' to reset
 */
function showHoverLabel(label) {
  const verbEl   = document.getElementById('verbLabel');
  const verbName = VERBS.find(v => v.id === getVerb())?.label ?? '';
  const armed    = getArmed();

  if (label) {
    const prefix = armed ? `Usa «${ITEMS[armed].label}» su ` : verbName + ' ';
    verbEl.textContent = prefix + label;
  } else {
    verbEl.textContent = verbName;
  }
}
