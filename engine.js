// ── STATE ────────────────────────────────────────────────────────────────────
var G = {
  scene: 'appartamento',
  inv:   [],
  verb:  'walk',
  armed: null,       // item armed for USE
  flags: {},
  npcTalked: {},
  plokAlive: false,
};

// ── BOOT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function(){
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('loadBtn').addEventListener('click', loadGame);
  document.getElementById('restartBtn').addEventListener('click', restartGame);
  document.getElementById('sceneArea').addEventListener('click', onSceneClick);
});

function startGame(){
  resetState();
  document.getElementById('titleScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
  buildVerbs();
  renderInv();
  goScene(G.scene);
}
function loadGame(){
  var saved = localStorage.getItem('kraken_save');
  if(!saved){setMsg('Nessun salvataggio trovato.'); return;}
  var s = JSON.parse(saved);
  G.scene=s.scene; G.inv=s.inv; G.flags=s.flags; G.npcTalked=s.npcTalked;
  G.verb='walk'; G.armed=null; G.plokAlive=false;
  document.getElementById('titleScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
  buildVerbs();
  renderInv();
  goScene(G.scene);
}
function saveGame(){
  localStorage.setItem('kraken_save', JSON.stringify({
    scene:G.scene, inv:G.inv, flags:G.flags, npcTalked:G.npcTalked
  }));
}
function restartGame(){
  resetState();
  document.getElementById('endScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
  buildVerbs();
  renderInv();
  goScene(G.scene);
}
function resetState(){
  G.scene='appartamento'; G.inv=[]; G.verb='walk'; G.armed=null;
  G.flags={}; G.npcTalked={}; G.plokAlive=false;
}

// ── VERB BAR ─────────────────────────────────────────────────────────────────
function buildVerbs(){
  var p = document.getElementById('verbPanel');
  p.innerHTML = '';
  VERBS.forEach(function(v){
    var b = document.createElement('button');
    b.className = 'vbtn' + (v.id===G.verb?' active':'');
    b.textContent = v.label;
    b.dataset.verb = v.id;
    b.addEventListener('click', function(){ selectVerb(v.id); });
    p.appendChild(b);
  });
}
function selectVerb(id){
  G.verb = id;
  G.armed = null;
  document.querySelectorAll('.vbtn').forEach(function(b){
    b.classList.toggle('active', b.dataset.verb===id);
  });
  var lbl = VERBS.find(function(v){return v.id===id;}).label;
  document.getElementById('verbLabel').textContent = lbl;
  document.getElementById('msgText').textContent = '';
}

// ── SCENE RENDERING ───────────────────────────────────────────────────────────
function goScene(id){
  G.scene = id;
  G.armed = null;
  selectVerb('walk');
  var scene = SCENES[id];
  if(!scene) return;

  // Background
  document.getElementById('sceneBg').style.background = scene.bg;

  // Floor strip
  var decor = document.getElementById('sceneDecor');
  var strip = '<div class="floor-strip" style="background:'+scene.floor.bg+';height:'+scene.floor.h+'"></div>';
  decor.innerHTML = strip + (scene.decor ? scene.decor() : '');

  // Scene label
  document.getElementById('sceneLabel').textContent = scene.name;

  // Objects + NPCs + exits
  buildSceneObjects(scene);

  // Reset character to entry position
  var ch = document.getElementById('character');
  ch.style.left = '18%';
  ch.style.bottom = '18%';

  // If tetto and trasmettitore already destroyed, check for plok
  if(id==='tetto' && G.flags.trasmettitore_distrutto && !G.plokAlive){
    spawnPlok();
  }

  setMsg('');
  saveGame();
}

function buildSceneObjects(scene){
  var container = document.getElementById('sceneObjects');
  container.innerHTML = '';

  // Interactive objects
  scene.objects.forEach(function(obj){
    if(G.flags['gone_'+obj.id]) return;

    var el = document.createElement('div');
    el.className = 'sprite';
    el.style.cssText = 'left:'+obj.x+'%;bottom:'+(100-obj.y-4)+'%;font-size:'+obj.size+'px';
    el.textContent = obj.emoji;
    el.title = obj.label;
    el.addEventListener('mouseenter', function(){ showHover(obj.label); });
    el.addEventListener('mouseleave', function(){ showHover(''); });
    el.addEventListener('click', function(e){ e.stopPropagation(); onObjectClick(obj); });
    container.appendChild(el);
  });

  // NPCs
  (scene.npcs||[]).forEach(function(npc){
    var el = document.createElement('div');
    el.className = 'sprite';
    el.style.cssText = 'left:'+npc.x+'%;bottom:'+(100-npc.y-4)+'%;font-size:'+npc.size+'px';
    el.textContent = npc.emoji;
    el.title = npc.label;
    el.addEventListener('mouseenter', function(){ showHover(npc.label); });
    el.addEventListener('mouseleave', function(){ showHover(''); });
    el.addEventListener('click', function(e){ e.stopPropagation(); onNpcClick(npc); });
    container.appendChild(el);
  });

  // Exits
  (scene.exits||[]).forEach(function(exit){
    var el = document.createElement('div');
    el.className = 'exit-zone';
    el.style.cssText = 'left:'+exit.x+'%;top:'+exit.y+'%;width:'+exit.w+'%;height:'+exit.h+'%';
    var tag = document.createElement('div');
    tag.className = 'exit-tag';
    tag.textContent = exit.label;
    el.appendChild(tag);
    el.addEventListener('click', function(e){ e.stopPropagation(); onExitClick(exit); });
    container.appendChild(el);
  });
}

// ── INTERACTIONS ─────────────────────────────────────────────────────────────
function onSceneClick(e){
  if(e.target !== document.getElementById('sceneArea') &&
     e.target !== document.getElementById('sceneBg') &&
     e.target !== document.getElementById('sceneDecor')) return;
  if(G.verb==='walk'){
    var rect = document.getElementById('sceneArea').getBoundingClientRect();
    var x = ((e.clientX - rect.left) / rect.width) * 100;
    var y = ((e.clientY - rect.top)  / rect.height)* 100;
    moveChar(x, Math.max(14, 100-y-8));
  }
}

function onObjectClick(obj){
  moveChar(obj.x, Math.max(14, 100-obj.y));
  var self = this;
  setTimeout(function(){
    execOnObject(obj);
  }, 500);
}

function execOnObject(obj){
  var v = G.verb;

  if(v==='walk'){
    setMsg('Marco si avvicina a «'+obj.label+'».');
  }
  else if(v==='look'){
    var txt = typeof obj.look==='function' ? obj.look(G) : obj.look;
    setMsg(txt || 'Marco osserva «'+obj.label+'». Niente di speciale.');
  }
  else if(v==='pick'){
    if(obj.pick){
      addItem(obj.pick.item);
      setMsg(obj.pick.msg);
      G.flags['gone_'+obj.id] = true;
      buildSceneObjects(SCENES[G.scene]);
    } else {
      setMsg('Marco non riesce a prendere «'+obj.label+'».');
    }
  }
  else if(v==='talk'){
    setMsg('Non si può parlare con «'+obj.label+'».');
  }
  else if(v==='open'){
    var res = obj.open ? (typeof obj.open==='function' ? obj.open(G) : obj.open) : null;
    if(res==='REFRESH'){ setMsg('Marco apre la porta con le chiavi. Si sente un ronzio alieno provenire dall\'interno.'); buildSceneObjects(SCENES[G.scene]); }
    else if(res){ setMsg(res); }
    else { setMsg('Marco non riesce ad aprire «'+obj.label+'».'); }
  }
  else if(v==='use'){
    // If an item is armed, try item+object combo
    if(G.armed){
      handleArmedUse(obj);
      return;
    }
    var res2 = obj.use ? (typeof obj.use==='function' ? obj.use(G) : obj.use) : null;
    if(res2==='DESTROY'){ destroyTransmitter(); }
    else if(res2==='REFRESH'){ setMsg('Marco apre la porta con le chiavi.'); buildSceneObjects(SCENES[G.scene]); }
    else if(res2){ setMsg(res2); }
    else { setMsg('Non c\'è niente di utile da fare con «'+obj.label+'».'); }
  }
}

function handleArmedUse(obj){
  // Special combinations
  if(G.armed==='chiavi' && obj.id==='porta_retro'){
    G.flags.retro_open = true;
    setMsg('Marco inserisce le chiavi. La porta si apre con un suono strano, quasi musicale. Alieno-musicale.');
    G.armed = null; renderInv();
    buildSceneObjects(SCENES[G.scene]);
    return;
  }
  if(G.armed==='martello' && obj.id==='trasmettitore'){
    destroyTransmitter();
    G.armed = null; renderInv();
    return;
  }
  setMsg('Non sembra utile usare «'+ITEMS[G.armed].label+'» su «'+obj.label+'».');
  G.armed = null; renderInv();
}

function onNpcClick(npc){
  moveChar(npc.x, Math.max(14, 100-npc.y));
  setTimeout(function(){
    if(G.verb==='talk' || G.verb==='walk'){
      var key = G.npcTalked[npc.id] ? npc.dlg2 : npc.dlg1;
      G.npcTalked[npc.id] = true;
      openDialogue(key);
    } else if(G.verb==='look'){
      setMsg(npc.label + '. ' + (G.npcTalked[npc.id] ? 'Sembra nervoso.' : 'Potrebbe essere utile parlarci.'));
    } else {
      setMsg('Marco non può fare questo con '+npc.label+'.');
    }
  }, 500);
}

function onExitClick(exit){
  if(exit.cond && !exit.cond(G)){
    setMsg(exit.blocked || 'Non puoi passare da lì.');
    return;
  }
  var tx = exit.x < 50 ? exit.x+8 : exit.x-8;
  moveChar(tx, 16);
  setTimeout(function(){ goScene(exit.to); }, 650);
}

// ── CHARACTER MOVEMENT ────────────────────────────────────────────────────────
function moveChar(x, bottomPct){
  var ch = document.getElementById('character');
  ch.classList.add('walking');
  ch.style.left   = Math.min(88, Math.max(4, x-2)) + '%';
  ch.style.bottom = bottomPct + '%';
  clearTimeout(ch._walkTimer);
  ch._walkTimer = setTimeout(function(){ ch.classList.remove('walking'); }, 750);
}

// ── INVENTORY ─────────────────────────────────────────────────────────────────
function addItem(id){
  if(!G.inv.includes(id)) G.inv.push(id);
  renderInv();
}
function renderInv(){
  var p = document.getElementById('invPanel');
  p.innerHTML = '';
  G.inv.forEach(function(id){
    var item = ITEMS[id];
    var slot = document.createElement('div');
    slot.className = 'inv-slot' + (G.armed===id ? ' armed' : '');
    slot.innerHTML = '<span class="inv-emoji">'+item.emoji+'</span><span class="inv-name">'+item.label+'</span>';
    slot.addEventListener('mouseenter', function(){ showHover(item.label); });
    slot.addEventListener('mouseleave', function(){ showHover(''); });
    slot.addEventListener('click', function(){ onInvClick(id); });
    p.appendChild(slot);
  });
}
function onInvClick(id){
  var item = ITEMS[id];
  if(G.verb==='look'){
    setMsg(item.look || 'Marco esamina '+item.label+'.');
    return;
  }
  if(G.verb==='use'){
    if(G.armed===id){
      // Clicked armed item again = use alone (e.g. craft)
      if(item.useAlone==='CRAFT_CAPPELLO'){
        G.inv = G.inv.filter(function(i){return i!=='stagnola';});
        addItem('cappello');
        setMsg('Marco piega la stagnola con grande cura (e qualche imprecazione) e costruisce un cappello anti-controllo mentale. Ridicolo ma efficace.');
        G.armed = null; renderInv();
      } else {
        G.armed = null; renderInv();
        setMsg('');
      }
    } else {
      G.armed = id;
      renderInv();
      setMsg('Usa «'+item.label+'» su...');
    }
    return;
  }
  // Any other verb on inventory item
  setMsg('«'+item.label+'» è già nell\'inventario di Marco.');
}

// ── DIALOGUE ──────────────────────────────────────────────────────────────────
function openDialogue(key){
  var d = DIALOGUES[key];
  if(!d){ closeDialogue(); return; }

  var box = document.getElementById('dialogueBox');
  box.classList.remove('hidden');
  document.getElementById('dlgSpeaker').textContent = d.speaker;

  if(d.lines){
    // Sequential lines with "Continua" button
    var idx = 0;
    var showLine = function(){
      document.getElementById('dlgText').textContent = d.lines[idx];
      var opts = document.getElementById('dlgOptions');
      opts.innerHTML = '';
      var btn = document.createElement('button');
      btn.className = 'dlg-opt';
      btn.textContent = idx < d.lines.length-1 ? '▶ Continua' : '▶ Fine';
      btn.addEventListener('click', function(){
        idx++;
        if(idx < d.lines.length) showLine();
        else {
          closeDialogue();
          if(d.onClose==='TRIGGER_END') triggerEnd();
        }
      });
      opts.appendChild(btn);
    };
    showLine();
  } else {
    // Dialogue with options
    document.getElementById('dlgText').textContent = d.text||'';
    var opts = document.getElementById('dlgOptions');
    opts.innerHTML = '';
    if(d.options && d.options.length){
      d.options.forEach(function(opt){
        var btn = document.createElement('button');
        btn.className = 'dlg-opt';
        btn.textContent = opt.text;
        btn.addEventListener('click', function(){
          if(opt.next) openDialogue(opt.next);
          else closeDialogue();
        });
        opts.appendChild(btn);
      });
    } else {
      var btn2 = document.createElement('button');
      btn2.className = 'dlg-opt';
      btn2.textContent = '▶ Fine';
      btn2.addEventListener('click', function(){
        closeDialogue();
        if(d.onClose==='TRIGGER_END') triggerEnd();
      });
      opts.appendChild(btn2);
    }
  }
}
function closeDialogue(){
  document.getElementById('dialogueBox').classList.add('hidden');
}

// ── SPECIAL EVENTS ────────────────────────────────────────────────────────────
function destroyTransmitter(){
  if(!G.inv.includes('cappello')){
    setMsg('"Troppo pericoloso avvicinarsi senza protezione mentale. Sento già la testa che si svuota..."');
    return;
  }
  if(!G.inv.includes('martello')){
    setMsg('"Devo trovare qualcosa con cui distruggerla."');
    return;
  }
  G.flags.trasmettitore_distrutto = true;

  // Flash effect on scene
  var area = document.getElementById('sceneArea');
  area.classList.add('flash');
  setTimeout(function(){ area.classList.remove('flash'); }, 900);

  setMsg('KRAAKK! Marco colpisce il trasmettitore con tutta la forza. Scintille aliene volano ovunque! L\'antenna si piega, si storce e crolla. Il ronzio cessa. Silenzio.');

  // Remove trasmettitore sprite
  G.flags['gone_trasmettitore'] = true;
  buildSceneObjects(SCENES[G.scene]);

  // Spawn Plok after a moment
  setTimeout(function(){
    spawnPlok();
  }, 1600);

  saveGame();
}

function spawnPlok(){
  G.plokAlive = true;
  var spawn = SCENES.tetto.plokSpawn;
  var container = document.getElementById('sceneObjects');
  var el = document.createElement('div');
  el.className = 'sprite';
  el.id = 'plok_sprite';
  el.style.cssText = 'left:'+spawn.x+'%;bottom:'+(100-spawn.y-4)+'%;font-size:'+spawn.size+'px';
  el.textContent = '👽';
  el.title = 'PLOK';
  el.addEventListener('mouseenter', function(){ showHover('PLOK — Supervisore Galattico'); });
  el.addEventListener('mouseleave', function(){ showHover(''); });
  el.addEventListener('click', function(e){
    e.stopPropagation();
    onNpcClick({id:'plok', label:'PLOK', x:spawn.x, y:spawn.y, dlg1:'plok_1', dlg2:'plok_1'});
  });
  container.appendChild(el);
  setMsg('Dal nulla appare una figura verde. "PLOK — Supervisore Settore 7-G" lampeggia sul suo badge olografico.');
}

function triggerEnd(){
  document.getElementById('gameScreen').classList.add('hidden');
  document.getElementById('endScreen').classList.remove('hidden');
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────
function setMsg(text){
  document.getElementById('msgText').textContent = text ? ' — '+text : '';
}
function showHover(label){
  if(label){
    var verbName = VERBS.find(function(v){return v.id===G.verb;}).label;
    var prefix = G.armed ? 'Usa «'+ITEMS[G.armed].label+'» su ' : verbName+' ';
    document.getElementById('verbLabel').textContent = prefix + label;
  } else {
    var vn = VERBS.find(function(v){return v.id===G.verb;}).label;
    document.getElementById('verbLabel').textContent = vn;
  }
}
