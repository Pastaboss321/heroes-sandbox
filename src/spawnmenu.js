// Spawn menu UI: a comic-panel drawer listing everything the player can place.
// Pure DOM; the game hands in the catalogue and reacts to picks through callbacks.
//
// createSpawnMenu({ tabs, onPick(item), onToggle(item, on), onAction(item), onBrush(n), onSnap(on) })
//   tabs: [{ id, label, items: [{ id, label, kind: 'place'|'paint'|'toggle'|'action', icon(ctx, size) }] }]
// returns { open(), close(), toggle(), isOpen(), select(id|null), setToggle(id, on), setBrush(n), el }
export function createSpawnMenu(opt) {
  const el = document.createElement('div');
  el.id = 'spawn';
  el.className = 'hidden';
  el.innerHTML = `
    <div class="sp-head"><b>SPAWN</b><span>B close · click places · right-click cancels · [ ] brush</span></div>
    <div class="sp-tabs"></div>
    <div class="sp-grid"></div>
    <div class="sp-foot">
      <label>BRUSH <input type="range" min="1" max="14" value="4"><i>4</i></label>
      <label class="chk"><input type="checkbox" checked> SNAP TO GROUND</label>
    </div>`;
  document.body.appendChild(el);
  const tabsEl = el.querySelector('.sp-tabs'), grid = el.querySelector('.sp-grid');
  const brush = el.querySelector('input[type=range]'), brushV = el.querySelector('.sp-foot i'), snap = el.querySelector('input[type=checkbox]');
  let tab = opt.tabs[0].id, selected = null;
  const toggles = new Map();
  // keep game input out of the panel (no casting through it)
  for (const ev of ['mousedown', 'wheel', 'contextmenu']) el.addEventListener(ev, (e) => e.stopPropagation());

  function drawTabs() {
    tabsEl.innerHTML = '';
    for (const t of opt.tabs) {
      const b = document.createElement('button');
      b.className = 'sp-tab' + (t.id === tab ? ' on' : '');
      b.textContent = t.label;
      b.onclick = () => { tab = t.id; drawTabs(); drawGrid(); };
      tabsEl.appendChild(b);
    }
  }
  function drawGrid() {
    grid.innerHTML = '';
    const t = opt.tabs.find((x) => x.id === tab);
    for (const it of t.items) {
      const b = document.createElement('button');
      const on = it.kind === 'toggle' ? toggles.get(it.id) : selected === it.id;
      b.className = 'sp-item' + (on ? ' on' : '') + (it.kind === 'toggle' ? ' tog' : '') + (it.kind === 'action' ? ' act' : '');
      b.title = it.tip || it.label;
      const c = document.createElement('canvas');
      c.width = c.height = 28;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      try { it.icon && it.icon(x, 28); } catch (e) { /* icons are decoration only */ }
      const s = document.createElement('span');
      s.textContent = it.label;
      b.append(c, s);
      b.onclick = () => {
        if (it.kind === 'toggle') { const v = !toggles.get(it.id); toggles.set(it.id, v); opt.onToggle && opt.onToggle(it, v); }
        else if (it.kind === 'action') opt.onAction && opt.onAction(it);
        else { selected = selected === it.id ? null : it.id; opt.onPick && opt.onPick(selected ? it : null); }
        drawGrid();
        b.blur();
      };
      grid.appendChild(b);
    }
  }
  brush.oninput = () => { brushV.textContent = brush.value; opt.onBrush && opt.onBrush(+brush.value); };
  snap.onchange = () => { opt.onSnap && opt.onSnap(snap.checked); snap.blur(); };
  drawTabs(); drawGrid();
  return {
    el,
    open() { el.classList.remove('hidden'); drawGrid(); },
    close() { el.classList.add('hidden'); },
    toggle() { el.classList.toggle('hidden'); if (!el.classList.contains('hidden')) drawGrid(); },
    isOpen: () => !el.classList.contains('hidden'),
    select(id) { selected = id; drawGrid(); },
    setToggle(id, on) { toggles.set(id, on); drawGrid(); },
    setBrush(n) { brush.value = n; brushV.textContent = n; },
  };
}
