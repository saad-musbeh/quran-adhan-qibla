/** Runs inside the persistent offline reader; no external resources or scripts. */
export const MUSHAF_RUNTIME = String.raw`
const initial = window.readerInitial;
const pageStep = initial.pageStep === 2 ? 2 : 1;
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
let drag = null, dragFrame = null;
let turnSequence = 0;
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
function makeLeaf(item) {
  const panel = document.createElement('section');
  panel.className = 'panel leaf'; panel.dataset.page = item.page;
  panel.innerHTML = '<header class="metadata"><span class="juz"></span><span class="names"></span></header><div class="page-art"></div><footer class="page-number"></footer>';
  panel.querySelector('.juz').textContent = item.juzName;
  panel.querySelector('.names').textContent = item.surahNames;
  panel.querySelector('.page-number').textContent = String(item.page).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  const art = panel.querySelector('.page-art'), metadata = panel.querySelector('.metadata');
  metadata.style.left = art.style.left = '6%';
  metadata.style.right = art.style.right = '6%';
  art.innerHTML = item.svg;
  const svg = art.querySelector('svg');
  if (!svg) throw new Error('Missing Mushaf artwork');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet'); prefixIds(svg, item.page);
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
    // Move only the verified title glyph group into the floral cartouche.
    // All verse glyphs, basmala, markers and hit polygons stay together.
    const content = svg.querySelector('.mushaf-content');
    if (content?.children.length === 2 && content.firstElementChild.tagName.toLowerCase() === 'g') {
      const heading = document.createElement('div');
      heading.className = 'opening-title'; heading.setAttribute('aria-hidden','true');
      const title = svg.cloneNode(true);
      title.querySelectorAll('.ayahPolygon,.ayah_markers').forEach(node=>node.remove());
      const titleContent = title.querySelector('.mushaf-content');
      titleContent.lastElementChild.remove();
      prefixIds(title,'title'+item.page);
      heading.appendChild(title); panel.insertBefore(heading,art);
      const box = title.getBBox(), pad = 2;
      title.setAttribute('viewBox',[box.x-pad,box.y-pad,box.width+pad*2,box.height+pad*2].join(' '));
      title.setAttribute('preserveAspectRatio','xMidYMid meet');
      content.firstElementChild.remove();
    }
    // Crop empty source canvas without changing the verified glyph paths.
    const bounds = svg.getBBox(), padding = 7;
    svg.setAttribute('viewBox', [bounds.x-padding,bounds.y-padding,bounds.width+padding*2,bounds.height+padding*2].join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    art.style.left = art.style.right = '16%';
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
function makePanel(item) {
  if (pageStep === 1) return makeLeaf(item);
  if (!item.companion || item.page % 2 !== 1 || item.companion.page !== item.page + 1) throw new Error('Invalid Mushaf spread');
  const panel = document.createElement('section');
  panel.className = 'panel spread'; panel.dataset.page = item.page;
  // One cached panel owns both leaves: gestures, zoom and animation cannot diverge.
  panel.append(makeLeaf(item), makeLeaf(item.companion));
  prepared.appendChild(panel);
  return panel;
}
function updatePanel(panel) {
  panel.setAttribute('aria-label', ui.page + ' ' + panel.dataset.page + (pageStep === 2 ? '–' + (Number(panel.dataset.page) + 1) : ''));
  for (const leaf of panel.querySelectorAll('.leaf')) leaf.setAttribute('aria-label', ui.page + ' ' + leaf.dataset.page);
  // Keep the source artwork and the added heading banners in their authored
  // colors. Invert only the source glyph group so dark ink stays legible on
  // the night page while the pale banner center remains pale.
  for (const art of panel.querySelectorAll('.page-art,.opening-title')) art.classList.toggle('night',dark);
  for (const node of panel.querySelectorAll('.ayahPolygon')) {node.classList.toggle('active',keyOf(node)===activeKey);node.classList.toggle('loopstart',keyOf(node)===loopStartKey);node.classList.toggle('loopend',keyOf(node)===loopEndKey);}
}
function layoutPanel(panel) {
  if (panel.classList.contains('spread')) {
    for (const leaf of panel.children) layoutLeaf(leaf);
  } else layoutLeaf(panel);
}
function layoutLeaf(panel) {
  // Prepared panels have viewport dimensions, which differ from the zoomed
  // sheet. Measure only after mounting in the stage; source paths and their
  // hit polygons stay together inside an aspect-preserving SVG.
  if (!stage.contains(panel) || panel.classList.contains('opening')) return;
  const metadata = panel.querySelector('.metadata'), footer = panel.querySelector('.page-number');
  const gap = Math.max(4, parseFloat(getComputedStyle(metadata).fontSize) * .6);
  const top = Math.max(panel.clientHeight * .09, metadata.offsetTop + metadata.offsetHeight + gap);
  const bottom = Math.min(panel.clientHeight * .93, footer.offsetTop - gap);
  const art = panel.querySelector('.page-art');
  art.style.top = top + 'px'; art.style.height = Math.max(0, bottom - top) + 'px';
}
function layoutVisiblePanels() { for (const panel of stage.children) layoutPanel(panel); }
function updateState(state) {
  if (Number.isFinite(state.textScale)) document.documentElement.style.setProperty('--text-scale', String(state.textScale));
  language = state.language ?? language; dark = state.dark ?? dark;
  ui=state.ui??(state.language?defaultUi(language):ui);
  if ('activeKey' in state) activeKey = state.activeKey;
  if ('bookmarkedKeys' in state) bookmarks = state.bookmarkedKeys;
  if ('loopPickMode' in state) loopPickMode=state.loopPickMode;
  if ('loopStartKey' in state) loopStartKey=state.loopStartKey;
  if ('loopEndKey' in state) loopEndKey=state.loopEndKey;
  theme=state.theme??theme;
  for(const [name,value] of Object.entries({paper:dark?theme.deep:theme.lightPaper,ink:dark?theme.lightPaper:theme.ink,mint:theme.lightPaper,green:theme.ink,primary:theme.background,pale:theme.pale,accent:theme.accent})) document.documentElement.style.setProperty('--'+name,value);
  for (const [name,value] of Object.entries(dark
    ? {green:'#254B46',rose:'#B56F82',leaf:'#67927D',gold:'#B4915D',scroll:'#ADC8BF',outline:'#93ABA1'}
    : {green:'#286248',rose:'#C9516A',leaf:'#A4AD75',gold:'#C69A50',scroll:'#E8DEC0',outline:'#374E43'})) document.documentElement.style.setProperty('--illum-'+name,value);
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
  layoutVisiblePanels();
}
function settle() {
  clearTimeout(transitionTimer); transitionTimer = null;
  if (dragFrame !== null) cancelAnimationFrame(dragFrame);
  dragFrame = null; drag = null;
  for (const panel of [...stage.children]) {
    panel.style.transition = ''; panel.style.transform = '';
    if (Number(panel.dataset.page) !== shownPage) {
      panel.setAttribute('aria-hidden','true'); panel.inert = true; prepared.appendChild(panel);
    }
  }
}
window.cachePage = item => {
  if (cache.has(item.page)) return;
  const panel = makePanel(item);
  updatePanel(panel);
  cache.set(item.page,panel);
  while (cache.size > 5) {
    // Keep the immediate neighbors when native preparation adds the +/-2 pages.
    const candidates=[...cache.keys()].filter(n=>n!==shownPage&&n!==item.page&&n!==drag?.target);
    const victim=candidates.reduce((furthest,n)=>furthest===undefined||Math.abs(n-shownPage)>Math.abs(furthest-shownPage)?n:furthest,undefined);
    if (victim === undefined) break;
    cache.get(victim).remove(); cache.delete(victim);
  }
  acknowledge();
};
window.activatePage = (page, state, animate = true, acknowledgedTurn = turnSequence) => {
  if(acknowledgedTurn<turnSequence){updateState(state);return;}
  const next = cache.get(page);
  if (!next) return;
  // Native acknowledgement of a gesture must not cut its animation short.
  if (page === shownPage && next.parentElement === stage) {
    updateState(state); acknowledge(); return;
  }
  const fromDrag = drag && drag.target === page ? drag : null;
  if (fromDrag) {
    if (dragFrame !== null) cancelAnimationFrame(dragFrame);
    dragFrame = null; paintDrag(); drag = null;
  } else settle();
  start = null; clearTimeout(timer); closeMenu();
  const previousPage = shownPage, old = stage.firstElementChild;
  shownPage = page;
  cache.delete(page); cache.set(page, next);
  updateState(state);
  const viewport = document.getElementById('reader-viewport');
  viewport.scrollLeft = viewport.scrollTop = 0;
  next.removeAttribute('aria-hidden'); next.inert = false;
  const shouldAnimate = animate && old && old !== next && page !== previousPage && (zoom <= 1 || fromDrag) && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!shouldAnimate) {
    if (old && old !== next) { old.setAttribute('aria-hidden','true'); old.inert = true; prepared.appendChild(old); }
    next.style.transition = ''; next.style.transform = '';
    stage.appendChild(next); layoutPanel(next); acknowledge(); return;
  }
  const axis = fromDrag?.axis || 'x';
  const extent = (axis === 'x' ? innerWidth : innerHeight) * zoom;
  const direction = axis === 'x' ? (page > previousPage ? 1 : -1) : (page > previousPage ? -1 : 1);
  if (!fromDrag) {
    next.style.transition = ''; next.style.transform = translate(axis, -direction * extent);
    stage.appendChild(next); layoutPanel(next); next.getBoundingClientRect();
  }
  old.setAttribute('aria-hidden','true'); old.inert = true;
  next.style.transition = old.style.transition = 'transform 210ms ease-out';
  old.style.transform = translate(axis, direction * extent);
  next.style.transform = translate(axis, 0);
  transitionTimer = setTimeout(settle, 230);
  acknowledge();
};
function translate(axis, offset) { return axis === 'x' ? 'translate3d('+offset+'px,0,0)' : 'translate3d(0,'+offset+'px,0)'; }
function paintDrag() {
  if (!drag) return;
  const old = cache.get(shownPage), next = cache.get(drag.target);
  old.style.transform = translate(drag.axis, drag.offset);
  if (next) next.style.transform = translate(drag.axis, drag.offset - drag.sign * drag.extent);
}
function moveDrag(origin, dx, dy) {
  if (!origin.axis) {
    if (Math.max(Math.abs(dx),Math.abs(dy)) < 8) return;
    origin.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    closeMenu(); settle();
  }
  const axis = origin.axis, extent = (axis === 'x' ? innerWidth : innerHeight) * zoom;
  const offset = axis === 'x' ? dx : dy, sign = offset >= 0 ? 1 : -1;
  const delta = axis === 'x' ? sign : -sign, target = shownPage + delta * pageStep;
  const next = cache.get(target);
  if (drag && drag.target !== target) {
    const abandoned = cache.get(drag.target);
    if (abandoned) { abandoned.style.transform = ''; prepared.appendChild(abandoned); }
  }
  drag = {axis,extent,sign,target,offset:next?Math.max(-extent,Math.min(extent,offset)):offset*.16};
  const old = cache.get(shownPage); old.style.transition = '';
  if (next) {
    updatePanel(next); next.style.transition = '';
    next.setAttribute('aria-hidden','true'); next.inert = true;
    const mounted = next.parentElement === stage;
    stage.appendChild(next);
    if (!mounted) layoutPanel(next);
  }
  if (dragFrame === null) dragFrame = requestAnimationFrame(() => { dragFrame = null; paintDrag(); });
}
function returnDrag() {
  if (!drag) return;
  if (dragFrame !== null) cancelAnimationFrame(dragFrame);
  dragFrame = null; paintDrag();
  const old = cache.get(shownPage), next = cache.get(drag.target);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  old.style.transition = reduceMotion ? '' : 'transform 180ms ease-out';
  old.style.transform = translate(drag.axis, 0);
  if (next) {
    next.style.transition = old.style.transition;
    next.style.transform = translate(drag.axis, -drag.sign * drag.extent);
  }
  drag = null;
  transitionTimer = setTimeout(settle, reduceMotion ? 0 : 200);
}
window.updateState = updateState;
window.zoomPage = value => {
  settle(); closeMenu(); zoom = Number.isFinite(value) ? Math.max(16/22, Math.min(3,value)) : 1;
  const sheet = document.getElementById('sheet');
  sheet.style.width = innerWidth * zoom + 'px'; sheet.style.height = innerHeight * zoom + 'px';
  sheet.style.left = Math.max(0, innerWidth * (1-zoom) / 2) + 'px';
  sheet.style.top = Math.max(0, innerHeight * (1-zoom) / 2) + 'px';
  const viewport = document.getElementById('reader-viewport');
  viewport.style.overflow = zoom > 1 ? 'auto' : 'hidden';
  viewport.style.touchAction = zoom > 1 ? 'auto' : 'pinch-zoom';
  if (zoom <= 1) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
  layoutVisiblePanels();
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
  if (event.touches.length !== 1 || event.target.closest('#verse-menu')) { returnDrag(); start = null; return; }
  if (transitionTimer !== null) settle();
  const t = event.touches[0];
  const viewport = document.getElementById('reader-viewport');
  start = { x:t.clientX, y:t.clientY, page:shownPage, menu:menu.classList.contains('show'), axis:null,
    scrollX:viewport.scrollLeft, scrollY:viewport.scrollTop, maxX:viewport.scrollWidth-viewport.clientWidth, maxY:viewport.scrollHeight-viewport.clientHeight }; held = false;
  const node = event.target.closest('.ayahPolygon');
  if (node && !loopPickMode) timer = setTimeout(() => {
    if (start && !start.axis && start.page === shownPage) { held = true; showMenu(node,t.clientX,t.clientY); }
  }, 500);
}, {passive:true});
document.addEventListener('touchmove', event => {
  if (!start || event.touches.length !== 1) { returnDrag(); start = null; clearTimeout(timer); return; }
  const t = event.touches[0], dx=t.clientX-start.x, dy=t.clientY-start.y;
  if (Math.abs(dx)>8 || Math.abs(dy)>8) clearTimeout(timer);
  const horizontal = Math.abs(dx)>Math.abs(dy);
  const atEdge = horizontal ? (dx>0 ? start.scrollX<=1 : start.scrollX>=start.maxX-1)
    : (dy>0 ? start.scrollY<=1 : start.scrollY>=start.maxY-1);
  if (!start.axis && Math.max(Math.abs(dx),Math.abs(dy))>=8 && zoom>1 && !atEdge) start.panning=true;
  if (!held && !start.panning && (zoom<=1 || start.axis || atEdge) && (window.visualViewport?.scale??1)===1) {
    moveDrag(start,dx,dy);
    if (start.axis) event.preventDefault();
  }
}, {passive:false});
document.addEventListener('touchend', event => {
  clearTimeout(timer);
  const origin = start; start = null;
  if (!origin || held || origin.page !== shownPage || !event.changedTouches.length) { returnDrag(); return; }
  const t = event.changedTouches[0], dx=t.clientX-origin.x, dy=t.clientY-origin.y;
  if (origin.axis) {
    moveDrag(origin,dx,dy);
    // Keep short accidental drags reversible; cap the deliberate swipe
    // distance so large pages never demand a half-screen movement.
    const turnDistance=drag?Math.max(24,Math.min(64,drag.extent*.18)):Infinity;
    if (drag && Math.abs(drag.offset) >= turnDistance && cache.has(drag.target)) {
      const target = drag.target, delta=(target-shownPage)/pageStep;
      send({type:'swipe',delta,turn:++turnSequence});
      window.activatePage(target,{},true);
    } else returnDrag();
  } else if (Math.abs(dx)<12 && Math.abs(dy)<12 && !event.target.closest('#verse-menu')) {
    const node=event.target.closest('.ayahPolygon');
    if(loopPickMode&&node){closeMenu();send({type:'looppick',key:keyOf(node)});}else if(origin.menu)closeMenu();else send({type:'tap'});
  }
}, {passive:true});
document.addEventListener('touchcancel', () => { start=null; clearTimeout(timer); returnDrag(); });
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
window.zoomPage(initial.zoom ?? 1);
if (document.fonts?.ready) document.fonts.ready.then(() => { layoutVisiblePanels(); send({type:'ready'}); }); else send({type:'ready'});
`;
