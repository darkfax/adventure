/**
 * data.js — Game Content
 *
 * This file contains the entire "script" of the game: all locations,
 * characters, items, and dialogue. It is PURE DATA — no functions,
 * no game logic, no DOM access.
 *
 * WHY separate data from logic?
 * ─────────────────────────────
 * When data and logic are mixed together, changing the story means
 * touching the engine, and changing the engine risks breaking the story.
 * Keeping them apart means you can:
 *  • Edit all dialogue and puzzles without touching engine.js
 *  • Test the engine with dummy data
 *  • Read the whole story in one place
 *
 * DATA STRUCTURES USED IN THIS FILE:
 * ─────────────────────────────────────────────────────────────────────
 *  Object literal   { key: value, key2: value2 }   — a named collection
 *  Array            [ item1, item2 ]                — an ordered list
 *  String           'text'                          — a piece of text
 *  null             no value / action not available
 *
 * ES MODULE EXPORTS:
 * ─────────────────────────────────────────────────────────────────────
 *  `export const` makes a constant available to other files that
 *  import it. Constants declared here cannot be reassigned, which
 *  protects the game data from accidental modification at runtime.
 */


// ── VERBS ─────────────────────────────────────────────────────────────────────
//
// The six action buttons shown in the bottom-left panel.
// Each verb has:
//   id    — internal identifier used by the engine to decide what to do
//   label — the text shown on the button and in the message bar

export const VERBS = [
  { id: 'walk',  label: 'Cammina'  },
  { id: 'look',  label: 'Guarda'   },
  { id: 'pick',  label: 'Prendi'   },
  { id: 'talk',  label: 'Parla con' },
  { id: 'use',   label: 'Usa'      },
  { id: 'open',  label: 'Apri'     },
];


// ── ITEMS ─────────────────────────────────────────────────────────────────────
//
// Items the player can pick up and carry in their inventory.
// Stored as an object so any item can be looked up instantly by id:
//   ITEMS['martello']  →  { label: 'Martello', emoji: '🔨', … }
//
// Fields:
//   label     — display name shown in the inventory slot and messages
//   emoji     — the visual icon rendered in the inventory panel
//   look      — text shown when the player examines the item
//   useAlone  — (optional) action id triggered when the player uses
//               the item on itself (e.g. folding the tin foil into a hat)
//               The engine looks up this id and executes the matching action.

export const ITEMS = {

  giornale: {
    label: 'Giornale',
    emoji: '📰',
    look: 'Il Gazzettino Cosmico. Titolo: "ALIENI A PORTO COSMO — ESCLUSIVO!" '
        + 'Marco l\'ha scritto ieri sera alle 3 di notte in preda alla febbre. '
        + 'Stavolta aveva ragione.',
  },

  stagnola: {
    label: 'Stagnola',
    emoji: '🫙',
    look: 'Un rotolo di carta stagnola. "Con un po\' di creatività potrei farci '
        + 'qualcosa di utile..." pensa Marco, guardandosi i capelli.',
    // Using the stagnola on itself triggers the hat-crafting action in the engine
    useAlone: 'CRAFT_CAPPELLO',
  },

  cappello: {
    label: 'Cappello Anti-mente',
    emoji: '🎩',
    look: 'Un cappello fatto di stagnola piegata con cura. Blocca le onde aliene '
        + 'di controllo mentale. Non è elegante, ma funziona. '
        + 'Marco lo indossa con orgoglio disperato.',
  },

  chiavi: {
    label: 'Chiavi "Da Cosmo"',
    emoji: '🗝️',
    look: 'Un mazzo di chiavi. Il portachiavi è una piccola pizza sorridente con '
        + 'occhi a spirale ipnotica. Inquietante ma pratico.',
  },

  schema: {
    label: 'Schema Alieno',
    emoji: '📋',
    look: 'Uno schema tecnico alieno. Pur essendo in lingua intergalattica, '
        + 'i disegni sono chiari: un tetto, un\'antenna, e frecce che puntano '
        + 'ai cervelli degli abitanti di Porto Cosmo.',
  },

  martello: {
    label: 'Martello',
    emoji: '🔨',
    look: 'Un robusto martello da falegname. Ottimo per riparare mobili, '
        + 'o per distruggere trasmettitori alieni. '
        + 'Marco lo stringe con determinazione.',
  },

};


// ── DIALOGUES ─────────────────────────────────────────────────────────────────
//
// Conversation trees. Each entry is a "dialogue node" with a unique string key.
// The engine starts a conversation by loading the first node, then follows the
// `next` pointers as the player makes choices.
//
// A node can be one of two types:
//
//   TYPE A — Monologue (the NPC speaks several lines in sequence)
//   ────────────────────────────────────────────────────────────
//   {
//     speaker: 'Name',
//     lines: ['First line.', 'Second line.', '...'],
//     onClose: 'ACTION_ID'   ← optional: action to run when dialogue ends
//   }
//
//   TYPE B — Branching (the player chooses a response)
//   ────────────────────────────────────────────────────────────
//   {
//     speaker: 'Name',
//     text: 'What the NPC says.',
//     options: [
//       { text: '"Player response"', next: 'other_node_key' },
//       { text: '"Another response"', next: null },   ← null closes the dialogue
//     ],
//     onClose: 'ACTION_ID'   ← optional: runs when the dialogue closes
//   }
//
// onClose values:
//   'TRIGGER_END'  — transition to the victory screen

export const DIALOGUES = {

  // ── Nonna Giuseppa ─────────────────────────────────────────────────────────

  nonna_1: {
    speaker: 'Nonna Giuseppa',
    lines: [
      'Ah, Marco! Stavo proprio pensando a te. Ti vedo spesso uscire di notte con quel taccuino...',
      'Sai, ieri sera ho visto delle luci blu sul tetto della pizzeria di Franco. Strane, strane luci.',
      'E i cartoni della pizza di quel posto... giuro che brillano al buio! Io non ordino più da lì, per la Madonna!',
    ],
  },

  nonna_2: {
    speaker: 'Nonna Giuseppa',
    lines: [
      'Quel Franco mi ha sempre fatto un\'impressione strana. Parla in modo buffo.',
      'L\'altro giorno ha detto "sul nostro pianeta la pizza—" e poi si è interrotto.',
      'E il sindaco! Non lo riconosco più. Prima si preoccupava della viabilità, ora parla solo di pizza.',
    ],
  },

  // ── Sindaco Berlucci ───────────────────────────────────────────────────────

  sindaco_1: {
    speaker: 'Sindaco Berlucci',
    lines: [
      'Pizza... pizza per tutti! La pizza è la risposta a tutto!',
      'Porto Cosmo ama la pizza! Vota pizza! Mangia pizza! Pensa pizza! Solo pizza!',
    ],
  },

  sindaco_2: {
    speaker: 'Sindaco Berlucci',
    lines: ['Pizza... pizza... pizza...'],
  },

  // ── Franco il Pizzaiolo ────────────────────────────────────────────────────
  //
  // Franco's dialogue is branching: the player can ask different questions.
  // Each choice leads to a different node, demonstrating the tree structure.

  franco_1: {
    speaker: 'Franco il Pizzaiolo',
    text: 'Buonasera, um— amico umano! Voglio dire, amico! Vuoi pizza? '
        + 'La nostra pizza è la migliore del pianeta. Di questo pianeta. '
        + 'Che è l\'unico. Ovviamente.',
    options: [
      { text: '"Cosa c\'è in quella stanza sul retro?"', next: 'franco_retro'  },
      { text: '"Hai visto luci strane di notte?"',       next: 'franco_luci'  },
      { text: '"Sei molto strano, lo sai?"',             next: 'franco_strano' },
      { text: '"No grazie, sto solo guardando."',        next: null           },
    ],
  },

  franco_retro: {
    speaker: 'Franco il Pizzaiolo',
    text: 'QUELLA STANZA? È... è la dispensa! Farina, pomodoro, formaggio '
        + 'd\'importazione. Niente di interessante per un umano— per un cliente normale!',
    options: [
      { text: '"Hai detto \'umano\' due volte."', next: 'franco_slip' },
      { text: '"Ok, grazie."',                   next: null          },
    ],
  },

  franco_luci: {
    speaker: 'Franco il Pizzaiolo',
    text: 'Luci? Quali luci? Il forno emette riflessi particolari a volte. '
        + 'Tecnologia avanzata. Del pianeta Terra. Dove viviamo tutti noi. Terrani.',
    options: [
      { text: '"Terrani?"',                next: 'franco_slip' },
      { text: '"Sì, certo. Arrivederci."', next: null          },
    ],
  },

  franco_slip: {
    speaker: 'Franco il Pizzaiolo',
    text: '*tosse nervosa* Ho detto... TRENTINI! Sono di Trento! '
        + 'Una pizza trentina! Con lo speck! Buonasera! PIZZA!',
    options: [
      { text: '"Sei la persona più sospetta che abbia mai incontrato."', next: null },
    ],
  },

  franco_strano: {
    speaker: 'Franco il Pizzaiolo',
    text: 'Strano?! IO?! Sul vostro— su questo pianeta tutti dicono così '
        + 'quando incontrano qualcuno di culturalmente diverso. È xenofobia, '
        + 'Marco Rossi! Buonasera!',
    options: [
      { text: '"Come sai il mio nome?"',   next: 'franco_nome' },
      { text: '"Sì, hai ragione. Scusa."', next: null          },
    ],
  },

  franco_nome: {
    speaker: 'Franco il Pizzaiolo',
    text: 'È... è scritto sul tuo tesserino della stampa! Che guarda caso '
        + 'hai in tasca e non è visibile. Arrivederci! PIZZA!',
    options: [
      { text: '"Questo non regge per niente."', next: null },
    ],
  },

  // Shown after the player has already spoken to Franco once
  franco_dopo: {
    speaker: 'Franco il Pizzaiolo',
    text: '*evita il tuo sguardo nervosamente* Pizza... vuoi pizza? No? Arrivederci allora.',
    options: null,
  },

  // ── PLOK — final boss dialogue ─────────────────────────────────────────────
  //
  // Plok's dialogue tree leads to the game's ending.
  // All paths eventually reach plok_fine, which triggers TRIGGER_END on close.

  plok_1: {
    speaker: 'PLOK — Supervisore Settore 7-G',
    text: 'FERMATI, UMANO FASTIDIOSO! Hai distrutto il Trasmettitore Cerebrale '
        + 'Modello 4400-X! Sai quanto ci ho messo ad installarlo?! TRE NOTTI COSMICHE!',
    options: [
      { text: '"Chi sei? Cosa state facendo alla mia città?"', next: 'plok_spiega' },
      { text: '"Sei il peggior alieno che abbia mai visto."',  next: 'plok_offeso' },
      { text: '"Vai via e non tornare MAI PIÙ!"',              next: 'plok_resa'   },
    ],
  },

  plok_spiega: {
    speaker: 'PLOK',
    text: 'Cosa facciamo?! VI MIGLIORIAMO! Meno pensieri complessi = meno stress '
        + '= più felicità! Il nostro sondaggio intergalattico dice che gli umani '
        + 'vogliono solo pizza e televisione!',
    options: [
      { text: '"Il vostro sondaggio ha un problema metodologico enorme."', next: 'plok_metodo' },
      { text: '"Fuori dal mio pianeta, SUBITO!"',                          next: 'plok_resa'   },
    ],
  },

  plok_metodo: {
    speaker: 'PLOK',
    text: '...Devo ammettere che il campione era di quattro soggetti e uno era '
        + 'già sotto controllo mentale quando l\'abbiamo intervistato. '
        + 'Forse... forse il mio supervisore aveva ragione a bocciarmi.',
    options: [
      { text: '"Vai via e rifletti sulle tue scelte di vita cosmica."', next: 'plok_resa' },
    ],
  },

  plok_offeso: {
    speaker: 'PLOK',
    text: 'PEGGIORE?! Ho vinto il Premio Intergalattico per la Simmetria Bilaterale '
        + 'per QUATTRO anni consecutivi! Cosa ne sai tu di estetica cosmica!',
    options: [
      { text: '"Ok ok, siete tutti bellissimi. Ora andate via."', next: 'plok_resa' },
    ],
  },

  plok_resa: {
    speaker: 'PLOK',
    text: '*sospiro cosmico profondo* Bene. Mandiamo il rapporto: Settore Italia, '
        + 'Pianeta Terra — TROPPO COMPLICATI. Missione abbandonata. '
        + 'Però... la pizza è genuinamente ottima. Possiamo tornare come clienti normali?',
    options: [
      { text: '"...Solo se pagate il conto per intero."', next: 'plok_fine' },
    ],
  },

  plok_fine: {
    speaker: 'PLOK',
    text: 'Accordo intergalattico siglato. Arrivederci, Marco Rossi. '
        + 'Sei stato un avversario... adeguato. Per gli standard del vostro pianeta.',
    options: null,
    onClose: 'TRIGGER_END',  // the engine checks this after the dialogue closes
  },

};


// ── SCENES ────────────────────────────────────────────────────────────────────
//
// Each scene is a location in the game world. Scenes are stored in an object
// keyed by scene id, so the engine can do SCENES['strada'] to get scene data.
//
// SCENE FIELDS:
//   name      — display name shown in the top-left corner
//   bg        — CSS background property for the sky / walls
//   floor     — { bg: cssColor, h: cssHeight } for the floor strip
//   stars     — if true, the renderer generates animated star decorations
//   decor     — HTML string for static background scenery (buildings, signs…)
//               Using innerHTML is acceptable here because this content is
//               written by us in this file, not from user input.
//
// OBJECT FIELDS (interactive hotspots in the scene):
//   id        — unique string key
//               Note: the engine uses 'gone_<id>' as a flag to track
//               whether the object was already picked up
//   emoji     — visual icon
//   label     — name shown in the verb bar on hover
//   x, y      — position as % of scene area width/height (0–100)
//   size      — font-size in pixels
//   look      — default description shown when the player examines the object
//   lookWhen  — (optional) array of { flag, text } pairs that override
//               the default look text when a specific flag is set
//   pick      — { item: itemId, msg: string } or null
//               If non-null, the object can be picked up
//   use       — string message, or an action descriptor object (see below)
//   open      — string message, or an action descriptor object (see below)
//
// ACTION DESCRIPTOR (for use/open):
//   { requireItem, setFlag, msg }
//     requireItem — item id that must be in inventory to perform the action
//     setFlag     — flag to set when the action succeeds
//     msg         — message shown on success
//   { action: 'DESTROY_TRANSMITTER' }
//     special action handled directly by the engine
//
// NPC FIELDS:
//   id, emoji, label, x, y, size
//   dlg1      — dialogue key for the first conversation
//   dlg2      — dialogue key for all subsequent conversations
//
// EXIT FIELDS:
//   label, x, y, w, h — position/size as % of scene area
//   to          — scene id to navigate to
//   requireItem — (optional) item that must be in inventory
//   requireFlag — (optional) flag that must be set
//   blockedMsg  — message shown when the condition is not met

export const SCENES = {

  // ── 1. Appartamento ────────────────────────────────────────────────────────

  appartamento: {
    name:  "L'Appartamento di Marco",
    bg:    'linear-gradient(180deg,#1a0a00 0%,#2d1500 55%,#1a0800 100%)',
    floor: { bg: '#3d2000', h: '18%' },
    stars: false,
    decor: '<div class="building" style="--color:#2a1000;--bc:#3a1800;left:0;width:35%;height:55%;bottom:18%"></div>'
         + '<div class="building" style="--color:#1e0c00;--bc:#2e1400;right:0;width:30%;height:45%;bottom:18%"></div>',

    objects: [
      {
        id: 'letto', emoji: '🛏️', label: 'Letto di Marco',
        x: 8, y: 58, size: 44,
        look: 'Il letto sfatto di Marco. Sul cuscino c\'è una statuetta di Zak McKracken, l\'unico eroe in cui crede.',
        pick: null, use: null, open: null,
      },
      {
        id: 'scrivania', emoji: '🖥️', label: 'Scrivania',
        x: 60, y: 55, size: 42,
        look: 'La scrivania sommersa di articoli non pubblicati. In cima alla pila: '
            + '"ALIENI IN PIZZERIA? — La mia ricerca esclusiva". Sembrava pazzesco. Ora meno.',
        pick: null, use: null, open: null,
      },
      {
        id: 'giornale', emoji: '📰', label: 'Gazzettino Cosmico',
        x: 70, y: 68, size: 26,
        look: 'Il giornale di stamattina. La sua storia di prima pagina: "STRANE LUCI A PORTO COSMO."',
        pick:  { item: 'giornale', msg: 'Marco raccoglie il giornale. "Forse questa volta ho ragione davvero."' },
        use:   null,
        open:  null,
      },
      {
        id: 'stagnola', emoji: '🫙', label: 'Rotolo di Stagnola',
        x: 28, y: 68, size: 24,
        look: 'Carta stagnola. Buona per gli avanzi, migliore per i cappelli anti-controllo mentale.',
        pick:  { item: 'stagnola', msg: 'Marco prende la stagnola. "Non si sa mai."' },
        use:   null,
        open:  null,
      },
    ],

    npcs: [],

    exits: [
      { label: '→ Strada', x: 88, y: 15, w: 12, h: 70, to: 'strada' },
    ],
  },


  // ── 2. Strada ──────────────────────────────────────────────────────────────

  strada: {
    name:  'Via Cosmo — di notte',
    bg:    'linear-gradient(180deg,#02020e 0%,#07071c 50%,#0a0a22 100%)',
    floor: { bg: '#12122a', h: '15%' },
    stars: true,
    decor: '<div class="building" style="--color:#06061a;--bc:#10102a;left:0;width:28%;height:60%;bottom:15%">'
         +   '<div class="window-lit" style="width:8px;height:6px;top:20%;left:20%"></div>'
         +   '<div class="window-lit" style="width:8px;height:6px;top:20%;left:55%"></div>'
         + '</div>'
         + '<div class="building" style="--color:#050518;--bc:#0e0e28;right:0;width:32%;height:50%;bottom:15%">'
         +   '<div class="window-lit" style="width:8px;height:6px;top:30%;left:30%"></div>'
         + '</div>',

    objects: [
      {
        id: 'chiavi', emoji: '🗝️', label: 'Mazzo di Chiavi',
        x: 42, y: 72, size: 22,
        look: 'Un mazzo di chiavi sul marciapiede. Sul portachiavi: una pizzetta sorridente '
            + 'con occhi a spirale ipnotica. Appartengono alla pizzeria Da Cosmo.',
        pick:  { item: 'chiavi', msg: 'Marco raccoglie le chiavi. "Qualcuno le ha perse qui sul marciapiede. Strano."' },
        use:   null,
        open:  null,
      },
      {
        id: 'lampione', emoji: '🪔', label: 'Lampione',
        x: 72, y: 30, size: 38,
        look: 'Un lampione sfarfallante. Qualcuno ha inciso sulla base: '
            + '"CHI HA MANGIATO LA MIA PIZZA — L\'Alieno Arrabbiato". Normale.',
        pick: null, use: null, open: null,
      },
      {
        id: 'cassetta', emoji: '📬', label: 'Cassetta Postale',
        x: 14, y: 55, size: 28,
        look: 'Cassetta piena di volantini: "DA COSMO — Pizza con Controllo Mentale Gratuito '
            + '(finché i diritti umani lo consentono)". Porto Cosmo è nei guai.',
        pick: null, use: null, open: null,
      },
    ],

    npcs: [
      {
        id: 'nonna', emoji: '👵', label: 'Nonna Giuseppa',
        x: 55, y: 52, size: 32,
        dlg1: 'nonna_1', dlg2: 'nonna_2',
      },
    ],

    exits: [
      { label: '← Appartamento', x: 0,  y: 15, w: 11, h: 70, to: 'appartamento' },
      { label: '→ Piazza',       x: 88, y: 15, w: 12, h: 70, to: 'piazza'       },
    ],
  },


  // ── 3. Piazza ──────────────────────────────────────────────────────────────

  piazza: {
    name:  'Piazza del Municipio — notte',
    bg:    'linear-gradient(180deg,#010108 0%,#06061a 60%,#090920 100%)',
    floor: { bg: '#0e0e24', h: '15%' },
    stars: true,
    decor: '<div class="building" style="--color:#08082a;--bc:#14143a;left:30%;width:40%;height:65%;bottom:15%">'
         +   '<div class="window-lit" style="width:10px;height:8px;top:25%;left:15%"></div>'
         +   '<div class="window-lit" style="width:10px;height:8px;top:25%;left:70%"></div>'
         +   '<div style="position:absolute;top:0;left:40%;width:20%;height:15%;background:#06061a;border:1px solid #20204a"></div>'
         + '</div>',

    objects: [
      {
        id: 'manifesto', emoji: '📜', label: 'Manifesto Elettorale',
        x: 12, y: 44, size: 30,
        look: 'Manifesto di Berlucci. I suoi occhi sono stati ritoccati con pupille a spirale. '
            + 'Sotto: "MANGIA PIZZA — PENSA MENO — VOTA BERLUCCI". Questo non è marketing normale.',
        pick: null, use: null, open: null,
      },
      {
        id: 'fontana', emoji: '⛲', label: 'Fontana del Comune',
        x: 45, y: 40, size: 40,
        look: 'La fontana del municipio. L\'acqua emette un lieve bagliore bluastro. '
            + 'Sicuramente una questione di alghe.',
        use:  'Marco avvicina la mano all\'acqua. La ritira subito: per un attimo sente '
            + 'solo voglia di pizza. "Con il cappello questo non succede", pensa.',
        pick: null,
        open: null,
      },
    ],

    npcs: [
      {
        id: 'sindaco', emoji: '🎩', label: 'Sindaco Berlucci',
        x: 65, y: 46, size: 34,
        dlg1: 'sindaco_1', dlg2: 'sindaco_2',
      },
    ],

    exits: [
      { label: '← Strada',   x: 0,  y: 15, w: 11, h: 70, to: 'strada'   },
      { label: '→ Pizzeria', x: 88, y: 15, w: 12, h: 70, to: 'pizzeria' },
    ],
  },


  // ── 4. Pizzeria ────────────────────────────────────────────────────────────

  pizzeria: {
    name:  'Da Cosmo — Pizzeria',
    bg:    'linear-gradient(180deg,#1e0400 0%,#300800 55%,#1e0300 100%)',
    floor: { bg: '#300800', h: '15%' },
    stars: false,
    decor: '<div class="building" style="--color:#280600;--bc:#380a00;left:0;width:25%;height:70%;bottom:15%"></div>'
         + '<div style="position:absolute;top:8%;left:30%;width:40%;height:30%;background:#280600;'
         + 'border:2px solid #400c00;display:flex;align-items:center;justify-content:center;'
         + 'font-size:9px;color:#ff7700;font-family:\'Press Start 2P\',monospace">🍕 DA COSMO 🍕</div>',

    objects: [
      {
        id: 'menu', emoji: '📋', label: 'Menu',
        x: 14, y: 56, size: 26,
        look: 'Menu di Da Cosmo. Le pizze si chiamano "Cosmica Special", "Invasione Margherita", '
            + '"Controllo Mentale con Funghi" e "Grande Fratello Salamino". Probabilmente ironia.',
        pick: null, use: null, open: null,
      },
      {
        id: 'forno', emoji: '🔥', label: 'Forno della Pizzeria',
        x: 58, y: 36, size: 42,
        look: 'Un forno che emette luce BLU invece che arancione. '
            + '"Solo una resistenza difettosa", direbbe un ingenuo. Marco non è ingenuo (di solito).',
        pick: null, use: null, open: null,
      },
      {
        id: 'porta_retro', emoji: '🚪', label: 'Porta Retrobottega',
        x: 80, y: 42, size: 34,
        look: 'Porta chiusa a chiave. C\'è scritto "VIETATO L\'ACCESSO — UMANI". '
            + 'Poi qualcuno ha corretto l\'ultima parola con "PERSONALE".',
        // lookWhen overrides the default look text when the flag is set
        lookWhen: [
          { flag: 'retro_open', text: 'La porta è aperta. Dal buio proviene un ronzio meccanico e una luce verde pulsante.' },
        ],
        pick: null,
        // Both 'open' and 'use' unlock the door if the player has the keys.
        // The engine reads requireItem, checks inventory, then sets the flag.
        open: { requireItem: 'chiavi', setFlag: 'retro_open', msg: 'Marco inserisce le chiavi. La porta si apre con un suono strano, quasi musicale. Alieno-musicale.' },
        use:  { requireItem: 'chiavi', setFlag: 'retro_open', msg: 'Marco inserisce le chiavi. La porta si apre con un suono strano, quasi musicale. Alieno-musicale.' },
      },
    ],

    npcs: [
      {
        id: 'franco', emoji: '👨‍🍳', label: 'Franco il Pizzaiolo',
        x: 40, y: 42, size: 36,
        dlg1: 'franco_1', dlg2: 'franco_dopo',
      },
    ],

    exits: [
      { label: '← Piazza',       x: 0,  y: 15, w: 11, h: 70, to: 'piazza'       },
      { label: '→ Retrobottega', x: 88, y: 15, w: 12, h: 70, to: 'retrobottega',
        requireFlag: 'retro_open',
        blockedMsg: 'La porta del retrobottega è chiusa a chiave.' },
    ],
  },


  // ── 5. Retrobottega ────────────────────────────────────────────────────────

  retrobottega: {
    name:  'Retrobottega — Area Riservata',
    bg:    'linear-gradient(180deg,#001505 0%,#002a0a 55%,#001505 100%)',
    floor: { bg: '#002a0a', h: '15%' },
    stars: false,
    decor: '<div style="position:absolute;top:5%;right:5%;width:30%;height:40%;background:#001a05;'
         + 'border:1px solid #005020;display:flex;align-items:center;justify-content:center;'
         + 'font-size:28px;animation:twinkle 1.5s infinite">🖥️</div>'
         + '<div style="position:absolute;top:5%;left:5%;width:20%;height:35%;background:#001a05;border:1px solid #004020"></div>',

    objects: [
      {
        id: 'schema', emoji: '📋', label: 'Schema Tecnico',
        x: 18, y: 52, size: 26,
        look: 'Schema alieno. Lingua incomprensibile, ma i disegni sono chiari: '
            + 'PORTO COSMO, ANTENNA, TETTO, FRECCE VERSO I CERVELLI. '
            + 'A margine, scritto in italiano: "Scala sul retro — F."',
        pick:  { item: 'schema', msg: 'Marco prende lo schema. "C\'è tutto. L\'antenna è sul tetto. Devo salire."' },
        use:   null,
        open:  null,
      },
      {
        id: 'martello', emoji: '🔨', label: 'Martello',
        x: 65, y: 64, size: 24,
        look: 'Un martello robusto. Ottimo per riparare cose. O per distruggerle. Marco pensa alla seconda opzione.',
        pick:  { item: 'martello', msg: 'Marco prende il martello. Sente già la colonna sonora della scena finale.' },
        use:   null,
        open:  null,
      },
      {
        id: 'dispositivo', emoji: '🛸', label: 'Dispositivo Misterioso',
        x: 44, y: 32, size: 44,
        look: 'Un macchinario alieno che ronza e pulsa di verde. '
            + 'Sul pannello: "TRASMETTITORE AUSILIARIO — BACKUP". '
            + 'Questo è il backup. Quello principale è sul tetto.',
        use:  'Troppo complesso da manomettere qui. Il trasmettitore principale è sul tetto.',
        pick: null,
        open: null,
      },
    ],

    npcs: [],

    exits: [
      { label: '← Pizzeria', x: 0,  y: 15, w: 11, h: 70, to: 'pizzeria' },
      { label: '↑ Tetto',    x: 40, y: 0,  w: 20, h: 12, to: 'tetto',
        requireItem: 'schema',
        blockedMsg: '"Devo prima capire cosa c\'è lassù." Marco esita sulla scala.' },
    ],
  },


  // ── 6. Tetto ───────────────────────────────────────────────────────────────

  tetto: {
    name:  'Tetto del Palazzo — Porto Cosmo',
    bg:    'linear-gradient(180deg,#000003 0%,#040015 60%,#08082a 100%)',
    floor: { bg: '#0a0a1e', h: '12%' },
    stars: true,
    decor: '',  // stars only — generated by the renderer

    objects: [
      {
        id: 'trasmettitore', emoji: '📡', label: 'Trasmettitore Alieno',
        x: 42, y: 18, size: 54,
        look: 'L\'antenna aliena. Pulsa di luce blu intensa. Anche con il cappello '
            + 'Marco sente il segnale: "MANGIA PIZZA... MANGIA PIZZA..." '
            + 'Deve distruggerla subito.',
        // lookWhen: different description after it has been destroyed
        lookWhen: [
          { flag: 'trasmettitore_distrutto', text: 'I resti fumanti del trasmettitore alieno. Ce l\'ha fatta.' },
        ],
        // use: special action — the engine handles 'DESTROY_TRANSMITTER' directly
        use:  { action: 'DESTROY_TRANSMITTER' },
        pick: null,
        open: null,
      },
      {
        id: 'parapetto', emoji: '🏙️', label: 'Il Panorama di Porto Cosmo',
        x: 10, y: 25, size: 36,
        look: 'Porto Cosmo di notte, dall\'alto. Le strade sono vuote. '
            + 'Da qualche finestra si vede la luce blu dei televisori accesi sullo stesso canale. '
            + 'Poi si sente: "PIZZA... PIZZA..." Marco stringe il martello.',
        pick: null, use: null, open: null,
      },
    ],

    npcs: [],

    exits: [
      { label: '↓ Retrobottega', x: 40, y: 88, w: 20, h: 12, to: 'retrobottega' },
    ],

    // Coordinates where Plok appears after the transmitter is destroyed.
    // Used by the engine to place the Plok sprite dynamically.
    plokSpawn: { x: 62, y: 35, size: 46 },
  },

};
