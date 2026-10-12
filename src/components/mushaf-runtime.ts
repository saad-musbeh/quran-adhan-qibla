/** Runs inside the persistent offline reader; no external resources or scripts. */
export const MUSHAF_RUNTIME = String.raw`
const initial = window.readerInitial;
const stage = document.getElementById('stage');
const prepared = document.getElementById('prepared');
const menu = document.getElementById('verse-menu');
const cache = new Map();
let shownPage = initial.page, selected = null, activeKey = initial.activeKey;
let language = initial.language, dark = initial.dark, bookmarks = initial.bookmarkedKeys || [];
function defaultUi(lang){return lang==='ar'?{page:'الصفحة',actions:'إجراءات الآية',menu:['تشغيل','التفسير','إشارة مرجعية','ابدأ التكرار هنا','أنهِ التكرار هنا'],rtl:true}:{page:'Page',actions:'Verse actions',menu:['Play','Tafsir','Bookmark','Start loop here','End loop here'],rtl:false};}
let ui=initial.ui??defaultUi(language);
let loopPickMode=initial.loopPickMode??null,loopStartKey=initial.loopStartKey??null,loopEndKey=initial.loopEndKey??null;
let theme=initial.theme??{background:'#18334A',deep:'#14293C',ink:'#18334A',lightPaper:'#FAF7EF',pale:'#E5EDF2',accent:'#DBAB68'};
let zoom = 1, start = null, timer = null, held = false, transitionTimer = null;
const keyOf = node => node.getAttribute('surah') + ':' + node.getAttribute('ayah');
const send = data => window.ReactNativeWebView.postMessage(JSON.stringify({ ...data, page: shownPage }));
const acknowledge = () => send({ type: 'cache', pages: [...cache.keys()] });
function closeMenu() {
  menu.classList.remove('show');
  if (selected) selected.classList.remove('selected');
  selected = null;
}
function prefixIds(svg, page) {
  const ids = new Map();
  for (const node of svg.querySelectorAll('[id]')) {
    const old = node.id, next = 'page' + page + '-' + old;
    ids.set(old, next); node.id = next;
  }
  for (const node of svg.querySelectorAll('*')) {
    for (const attr of ['href','xlink:href','clip-path','mask','filter','fill','stroke']) {
      const value = node.getAttribute(attr);
      if (!value) continue;
      let next = value.replace(/url\(#([^)]+)\)/g, (_, id) => 'url(#' + (ids.get(id) || id) + ')');
      if ((attr === 'href' || attr === 'xlink:href') && next[0] === '#') next = '#' + (ids.get(next.slice(1)) || next.slice(1));
      if (next !== value) node.setAttribute(attr, next);
    }
  }
}
function makePanel(item) {
  const panel = document.createElement('section');
  panel.className = 'panel'; panel.dataset.page = item.page;
  panel.innerHTML = '<header class="metadata"><span class="juz"></span><span class="names"></span></header><div class="page-art"></div><footer class="page-number"></footer>';
  panel.querySelector('.juz').textContent = item.juzName;
  panel.querySelector('.names').textContent = item.surahNames;
  panel.querySelector('.page-number').textContent = String(item.page).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  const art = panel.querySelector('.page-art'), metadata = panel.querySelector('.metadata');
  metadata.style.left = art.style.left = '12.75%';
  metadata.style.right = art.style.right = '12.75%';
  art.innerHTML = item.svg;
  const svg = art.querySelector('svg');
  if (!svg) throw new Error('Missing Mushaf artwork');
  svg.setAttribute('preserveAspectRatio', 'none'); prefixIds(svg, item.page);
  svg.querySelector('[id$="-content"]')?.classList.add('mushaf-content');
  const verses = new Map(item.verses.map(v => [v.surah + ':' + v.number, v]));
  for (const node of svg.querySelectorAll('.ayahPolygon')) {
    const verse = verses.get(keyOf(node));
    if (verse) { node.setAttribute('role','button'); node.setAttribute('tabindex','0'); node.setAttribute('aria-label', verse.text); }
  }
  // Attach invisibly before measuring paths, so section headings use real SVG geometry.
  prepared.appendChild(panel);
  if (item.page <= 2) {
    panel.classList.add('opening');
    // Crop only the empty source canvas. The source paths, verse polygons,
    // title and basmala remain unchanged and scale together.
    const bounds = svg.getBBox(), padding = 7;
    svg.setAttribute('viewBox', [bounds.x-padding,bounds.y-padding,bounds.width+padding*2,bounds.height+padding*2].join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    art.style.left = art.style.right = '14%';
    const decoration = document.createElement('div');
    decoration.className = 'opening-frame'; decoration.setAttribute('aria-hidden','true');
    decoration.innerHTML = initial.openingFrame;
    prefixIds(decoration.querySelector('svg'), 'opening' + item.page);
    panel.insertBefore(decoration, art);
  } else {
    const background = document.createElementNS('http://www.w3.org/2000/svg','g');
    background.setAttribute('aria-hidden','true'); svg.insertBefore(background, svg.firstChild);
    for (const node of svg.querySelectorAll('.ayahPolygon[ayah="1"]')) {
      const headingAnchor = node.getBBox().y;
      // On these source pages the title glyph box is centered about 51 units
      // above its first ayah. Keep that measured title center inside the frame.
      const top = headingAnchor - (node.getAttribute('surah') === '9' ? 35 : 67.5);
      const frame = new DOMParser().parseFromString(initial.banner, 'image/svg+xml').documentElement;
      frame.setAttribute('x','1'); frame.setAttribute('y',String(top));
      frame.setAttribute('width','341'); frame.setAttribute('height','35'); frame.setAttribute('preserveAspectRatio','none');
      frame.dataset.headingAnchor = String(headingAnchor);
      frame.removeAttribute('role'); frame.removeAttribute('aria-label');
      background.appendChild(document.importNode(frame, true));
    }
  }
  return panel;
}
function updatePanel(panel) {
  panel.setAttribute('aria-label', ui.page + ' ' + panel.dataset.page);
  // Keep the source artwork and the added heading banners in their authored
  // colors. Invert only the source glyph group so dark ink stays legible on
  // the night page while the pale banner center remains pale.
  panel.querySelector('.page-art').classList.toggle('night', dark);
  for (const node of panel.querySelectorAll('.ayahPolygon')) {node.classList.toggle('active',keyOf(node)===activeKey);node.classList.toggle('loopstart',keyOf(node)===loopStartKey);node.classList.toggle('loopend',keyOf(node)===loopEndKey);}
}
function updateState(state) {
  language = state.language ?? language; dark = state.dark ?? dark;
  ui=state.ui??(state.language?defaultUi(language):ui);
  if ('activeKey' in state) activeKey = state.activeKey;
  if ('bookmarkedKeys' in state) bookmarks = state.bookmarkedKeys;
  if ('loopPickMode' in state) loopPickMode=state.loopPickMode;
  if ('loopStartKey' in state) loopStartKey=state.loopStartKey;
  if ('loopEndKey' in state) loopEndKey=state.loopEndKey;
  theme=state.theme??theme;
  for(const [name,value] of Object.entries({paper:dark?theme.deep:theme.lightPaper,ink:dark?theme.lightPaper:theme.ink,mint:theme.lightPaper,green:theme.ink,primary:theme.background,pale:theme.pale,accent:theme.accent})) document.documentElement.style.setProperty('--'+name,value);
  const labels = ui.menu;
  menu.setAttribute('aria-label', ui.actions);
  menu.style.direction=ui.rtl?'rtl':'ltr';
  [...menu.querySelectorAll('button')].forEach((button,i) => {button.setAttribute('aria-label',labels[i]);button.querySelector('.action-label').textContent=labels[i]});
  menu.querySelector('[data-action="loopend"]').disabled=!loopStartKey;
  const marked = Boolean(selected && bookmarks.includes(keyOf(selected)));
  const bookmark = menu.querySelector('[data-action="bookmark"]');
  bookmark.classList.toggle('bookmarked', marked); bookmark.setAttribute('aria-pressed', String(marked));
  for (const panel of cache.values()) updatePanel(panel);
  document.getElementById('sheet').setAttribute('aria-label', ui.page + ' ' + shownPage);
}
function settle() {
  clearTimeout(transitionTimer);
  for (const panel of [...stage.children]) {
    panel.style.transition = ''; panel.style.transform = '';
    if (Number(panel.dataset.page) !== shownPage) {
      panel.setAttribute('aria-hidden','true'); panel.inert = true; prepared.appendChild(panel);
    }
  }
}
window.cachePage = item => {
  if (cache.has(item.page)) return;
  cache.set(item.page, makePanel(item));
  while (cache.size > 5) {
    const victim = [...cache.keys()].find(n => n !== shownPage && n !== item.page);
    if (victim === undefined) break;
    cache.get(victim).remove(); cache.delete(victim);
  }
  acknowledge();
};
window.activatePage = (page, state, animate = true) => {
  const next = cache.get(page);
  if (!next) return;
  settle(); closeMenu();
  const previousPage = shownPage, old = stage.firstElementChild;
  shownPage = page;
  cache.delete(page); cache.set(page, next);
  updateState(state);
  next.removeAttribute('aria-hidden'); next.inert = false;
  if (old === next) { acknowledge(); return; }
  next.style.transition = ''; next.style.transform = '';
  const shouldAnimate = animate && old && page !== previousPage && zoom === 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!shouldAnimate) {
    if (old) { old.setAttribute('aria-hidden','true'); old.inert = true; prepared.appendChild(old); }
    stage.appendChild(next); acknowledge(); return;
  }
  const direction = page > previousPage ? 1 : -1;
  next.style.transform = 'translateX(' + (-direction * innerWidth) + 'px)';
  old.setAttribute('aria-hidden','true'); old.inert = true;
  stage.appendChild(next);
  // Force the prepared starting position before a single paired slide; both pages remain painted.
  next.getBoundingClientRect();
  next.style.transition = old.style.transition = 'transform 190ms ease-out';
  old.style.transform = 'translateX(' + (direction * innerWidth) + 'px)';
  next.style.transform = 'translateX(0)';
  transitionTimer = setTimeout(settle, 210);
  acknowledge();
};
window.updateState = updateState;
window.zoomPage = value => {
  settle(); closeMenu(); zoom = Math.max(1, Math.min(3,value));
  const sheet = document.getElementById('sheet');
  sheet.style.width = innerWidth * zoom + 'px'; sheet.style.height = innerHeight * zoom + 'px';
  const viewport = document.getElementById('reader-viewport');
  viewport.style.overflow = zoom > 1 ? 'auto' : 'hidden';
  if (zoom === 1) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
};
window.addEventListener('resize', () => window.zoomPage(zoom));
function showMenu(node,x,y) {
  closeMenu(); selected = node; selected.classList.add('selected');
  menu.classList.add('show'); updateState({});
  const width=menu.offsetWidth,height=menu.offsetHeight;
  menu.style.left=Math.max(8,Math.min(innerWidth-width-8,x-width/2))+'px';
  menu.style.top=Math.max(8,Math.min(innerHeight-height-8,y>=height+24?y-height-16:y+16))+'px';
}
document.addEventListener('touchstart', event => {
  clearTimeout(timer);
  if (event.touches.length !== 1) { start = null; return; }
  const t = event.touches[0];
  start = { x:t.clientX, y:t.clientY, page:shownPage, menu:menu.classList.contains('show') }; held = false;
  const node = event.target.closest('.ayahPolygon');
  if (node && !loopPickMode) timer = setTimeout(() => {
    if (start && start.page === shownPage) { held = true; showMenu(node,t.clientX,t.clientY); }
  }, 500);
}, {passive:true});
document.addEventListener('touchmove', event => {
  if (!start || event.touches.length !== 1) { start = null; clearTimeout(timer); return; }
  const t = event.touches[0];
  if (Math.abs(t.clientX-start.x)>8 || Math.abs(t.clientY-start.y)>8) clearTimeout(timer);
}, {passive:true});
document.addEventListener('touchend', event => {
  clearTimeout(timer);
  const origin = start; start = null;
  if (!origin || held || origin.page !== shownPage || !event.changedTouches.length) return;
  const t = event.changedTouches[0], dx=t.clientX-origin.x, dy=t.clientY-origin.y;
  if (zoom===1 && (window.visualViewport?.scale??1)===1 && Math.abs(dx)>56 && Math.abs(dx)>Math.abs(dy)*1.5) {
    closeMenu(); send({type:'swipe',delta:dx>0?1:-1});
  } else if (Math.abs(dx)<12 && Math.abs(dy)<12 && !event.target.closest('#verse-menu')) {
    const node=event.target.closest('.ayahPolygon');
    if(loopPickMode&&node){closeMenu();send({type:'looppick',key:keyOf(node)});}else if(origin.menu)closeMenu();else send({type:'tap'});
  }
}, {passive:true});
document.addEventListener('touchcancel', () => { start=null; clearTimeout(timer); });
menu.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled || !selected) return;
  send({type:button.dataset.action,key:keyOf(selected)}); closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { closeMenu(); return; }
  const node = event.target.closest('.ayahPolygon');
  if (node && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault(); if(loopPickMode){send({type:'looppick',key:keyOf(node)});return;} const r=node.getBoundingClientRect(); showMenu(node,r.left+r.width/2,r.top+r.height/2);
    menu.querySelector('button').focus();
  }
});
document.addEventListener('click', event => {
  if (event.detail!==0 || event.target.closest('#verse-menu')) return;
  const node = event.target.closest('.ayahPolygon');
  if (node) { if(loopPickMode){send({type:'looppick',key:keyOf(node)});return;} const r=node.getBoundingClientRect(); showMenu(node,r.left+r.width/2,r.top+r.height/2); }
});
window.cachePage(initial);
window.activatePage(initial.page,initial,false);
if (document.fonts?.ready) document.fonts.ready.then(() => send({type:'ready'})); else send({type:'ready'});
`;
