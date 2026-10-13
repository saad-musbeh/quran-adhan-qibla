// Optional browser QA: node --experimental-strip-types scripts/check-mushaf-renderer.mjs
// Uses Playwright when installed, or PLAYWRIGHT_MODULE pointing to its package entry.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { buildMushafDocument, mushafLabels } from '../src/components/mushaf-document.ts';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const quran = JSON.parse(readFileSync(new URL('../src/data/quran.json', import.meta.url)));
const pages = JSON.parse(readFileSync(new URL('../src/data/mushaf-pages.json', import.meta.url)));
const verseByKey = new Map(quran.verses.map(v => [v.surah + ':' + v.number, v]));
const cssRgb = hex => 'rgb(' + hex.slice(1).match(/../g).map(value => parseInt(value,16)).join(', ') + ')';
function descriptor(page) {
  const verses = pages[page - 1].verseKeys.map(key => verseByKey.get(key));
  return { page, verses, surahNames: 'سورة ' + quran.surahs.find(s => s.number === verses[0].surah).arabicName, juzName:'الجزء الثلاثون', svg: gunzipSync(readFileSync(new URL('../assets/mushaf/pages/' + String(page).padStart(3,'0') + '.svg.gz', import.meta.url))).toString() };
}
const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport:{width:390,height:606} });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const settled = () => page.waitForFunction(() => {
    const stage=document.querySelector('#stage');
    if(stage.children.length!==1)return false;
    return getComputedStyle(stage.firstElementChild).transform==='none';
  });
  await page.addInitScript(() => {});
  const html = buildMushafDocument({...descriptor(600),language:'en',dark:false,activeKey:null}, descriptor(600).svg, readFileSync(new URL('../assets/quran/AmiriQuran.ttf', import.meta.url)).toString('base64'));
  await page.setContent(html.replace('<script>', '<script>window.bridgeEvents=[];window.ReactNativeWebView={postMessage:value=>window.bridgeEvents.push(JSON.parse(value))};'));
  await page.waitForFunction(() => window.bridgeEvents.some(e => e.type==='ready'));
  assert.equal(await page.locator('#stage .ayahPolygon').count(), pages[599].verseKeys.length);
  for (const n of [599,601,598,602]) await page.evaluate(info => window.cachePage(info), descriptor(n));
  assert.equal(await page.locator('.panel').count(), 5);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390,'prepared pages cannot expand the RTL viewport');
  for(const n of [600,601]){const margin=await page.locator('.panel[data-page="'+n+'"] .page-art').evaluate(node=>[node.style.left,node.style.right]);assert.deepEqual(margin,['6%','6%'],'odd/even artwork is centered');}
  const state = {language:'en',dark:false,activeKey:null,bookmarkedKeys:[]};
  await page.evaluate(() => {window.originalArt=document.querySelector('#stage .page-art>svg');});
  await page.evaluate(state => window.activatePage(601,state), state);
  await settled();
  await page.evaluate(state => window.activatePage(600,state), state);
  await settled();
  assert.equal(await page.evaluate(() => document.querySelector('#stage .page-art>svg') === window.originalArt), true, 'cached source reuses the prepared SVG DOM');
  for (const n of [603,604]) {
    await page.evaluate(info => window.cachePage(info), descriptor(n));
    await page.evaluate(({n,state}) => window.activatePage(n,state), {n,state});
  }
  await settled();
  assert.equal(await page.locator('#stage .panel').count(),1,'rapid transitions clean up old pages');
  assert.equal(await page.locator('.panel').count(),5,'pool stays bounded through eviction');
  assert.equal(await page.locator('#stage .ayahPolygon').count(),15);
  const palettes = [
    ['green','#214D3B','#17382B','#FAF7EF','#17382B','#DBAB68'],
    ['maroon','#5B2938','#401C28','#FAF7EF','#4A2330','#DBAB68'],
    ['blue','#18334A','#14293C','#FAF7EF','#18334A','#DBAB68'],
    ['black','#292C2F','#191B1D','#FAF7EF','#24272A','#DBAB68'],
    ['brown','#67482F','#493321','#FAF7EF','#4E3726','#DBAB68'],
  ];
  for (const n of [599,604]) {
    await page.evaluate(info => window.cachePage(info),descriptor(n));
    for (const [id,background,deep,lightPaper,ink,accent] of palettes) {
      const theme={id,background,deep,lightPaper,ink,pale:'#E5EDF2',accent};
      for (const dark of [false,true]) {
        await page.evaluate(({n,theme,dark})=>window.activatePage(n,{language:'en',dark,theme,activeKey:null,bookmarkedKeys:[]},false),{n,theme,dark});
        const heading=await page.locator('#stage .page-art').evaluate(art=>{
          const svg=art.querySelector(':scope>svg'), content=svg.querySelector('.mushaf-content');
          const title=content.querySelector('path');
          const frame=svg.querySelector(':scope>g[aria-hidden="true"]>svg path');
          const frames=[...svg.querySelectorAll(':scope>g[aria-hidden="true"]>svg')];
          return {artFilter:getComputedStyle(art).filter,night:art.classList.contains('night'),glyphFilter:getComputedStyle(content).filter,glyphFill:getComputedStyle(title).fill,frameFill:getComputedStyle(frame).fill,frameCount:frames.length};
        });
        assert.equal(heading.artFilter,'none',id+' page art stays unfiltered on '+(dark?'night':'light')+' page '+n);
        assert.equal(heading.night,dark,id+' night state is applied');
        assert.equal(heading.glyphFilter,dark?'invert(1)':'none',id+' source calligraphy receives a local contrast treatment');
        assert.equal(heading.glyphFill,'rgb(35, 31, 32)','source glyph fill remains authored');
        assert.equal(heading.frameFill,cssRgb(dark?deep:lightPaper),'heading banner keeps the page paper color');
        assert.equal(heading.frameCount,n===599?2:3,'all source surah headings are framed on page '+n);
        const numbers=await page.locator('#stage .ayah-mark>g:not(.ayah-mark-ornament) path').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).fill));
        assert.ok(numbers.length>0,'source ayah numerals exist');
        assert.ok(numbers.every(fill=>fill===cssRgb(dark?lightPaper:ink)),id+' ayah numerals stay visible in both modes');
        if(id==='green'&&!dark){
          const alignments=await page.locator('#stage .page-art').evaluate(art=>{
            const svg=art.querySelector(':scope>svg'), source=svg.querySelector('.mushaf-content path'), data=source.getAttribute('d');
            const tokens=[...data.matchAll(/[a-df-zA-DF-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)].map(m=>({value:m[0],start:m.index,end:m.index+m[0].length,command:/^[a-df-zA-DF-Z]$/.test(m[0])}));
            const moves=[];let x=0,y=0,sx=0,sy=0;
            for(let i=0;i<tokens.length;){if(!tokens[i].command){i++;continue;}const t=tokens[i++],cmd=t.value,lower=cmd.toLowerCase(),relative=cmd===lower;let j=i;while(j<tokens.length&&!tokens[j].command)j++;const nums=tokens.slice(i,j);const vals=nums.map(v=>Number(v.value));
              const pair=(a,b)=>[relative?x+a:a,relative?y+b:b];
              if(lower==='m'&&vals.length>=2){const [nx,ny]=pair(vals[0],vals[1]);moves.push({start:t.start,after:nums[1].end,x:nx,y:ny});x=nx;y=ny;sx=x;sy=y;for(let k=2;k+1<vals.length;k+=2){const p=pair(vals[k],vals[k+1]);x=p[0];y=p[1];}}
              else if(lower==='l'||lower==='t'){for(let k=0;k+1<vals.length;k+=2){const p=pair(vals[k],vals[k+1]);x=p[0];y=p[1];}}
              else if(lower==='c'){for(let k=0;k+5<vals.length;k+=6){const p=pair(vals[k+4],vals[k+5]);x=p[0];y=p[1];}}
              else if(lower==='s'||lower==='q'){for(let k=0;k+3<vals.length;k+=4){const p=pair(vals[k+2],vals[k+3]);x=p[0];y=p[1];}}
              else if(lower==='a'){for(let k=0;k+6<vals.length;k+=7){const p=pair(vals[k+5],vals[k+6]);x=p[0];y=p[1];}}
              else if(lower==='h'){for(const v of vals)x=relative?x+v:v;}
              else if(lower==='v'){for(const v of vals)y=relative?y+v:v;}
              else if(lower==='z'){x=sx;y=sy;}
              i=j;
            }
            const parent=source.parentElement, result=[];
            for(let i=0;i<moves.length;i++){const move=moves[i],next=moves[i+1],d='M'+move.x+' '+move.y+data.slice(move.after,next?.start??data.length);const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);parent.appendChild(p);const r=p.getBoundingClientRect();result.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom});p.remove();}
            const frames=[...svg.querySelectorAll(':scope>g[aria-hidden="true"]>svg')];
            return frames.map(frame=>{const r=frame.getBoundingClientRect(), candidates=result.filter(b=>{const cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2;return cx>r.left+r.width*.25&&cx<r.right-r.width*.25&&cy>=r.top-2&&cy<=r.bottom+2&&b.right>b.left&&b.bottom>b.top&&b.bottom-b.top<=15;});const bounds={left:Math.min(...candidates.map(b=>b.left)),right:Math.max(...candidates.map(b=>b.right)),top:Math.min(...candidates.map(b=>b.top)),bottom:Math.max(...candidates.map(b=>b.bottom))};return {count:candidates.length,frame:{top:r.top,bottom:r.bottom,center:(r.top+r.bottom)/2},glyph:{...bounds,center:(bounds.top+bounds.bottom)/2}};});
          });
          assert.ok(alignments.every(a=>a.count>0),n+' source title glyph contours are found inside each heading frame');
          assert.ok(alignments.every(a=>Math.abs(a.glyph.center-a.frame.center)<=3),n+' source title glyph bounds are vertically centered in the banner within 3 screen pixels');
          assert.ok(alignments.every(a=>a.glyph.top>=a.frame.top-2&&a.glyph.bottom<=a.frame.bottom+2),n+' source title glyph bounds fit inside the banner within 2 screen pixels');
        }
        const ratio=await page.locator('#stage .page-art').evaluate((art,dark)=>{
          const rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255);
          const lum=c=>c.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
          const glyph=rgb(getComputedStyle(art.querySelector('.mushaf-content path')).fill).map(x=>dark?1-x:x);
          const paper=rgb(getComputedStyle(art.querySelector(':scope>svg>g[aria-hidden="true"]>svg path')).fill);
          const a=lum(glyph),b=lum(paper);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        },dark);
        assert.ok(ratio>=7,id+' title/banner contrast is at least 7:1 ('+ratio.toFixed(1)+':1)');
        if (process.env.MUSHAF_QA_SCREENSHOTS && id==='blue') await page.screenshot({path:process.env.MUSHAF_QA_SCREENSHOTS+'/page-'+n+'-'+(dark?'night':'light')+'.png'});
      }
    }
  }
  await page.evaluate(() => window.updateState({language:'ar',dark:true,activeKey:'112:1'}));
  assert.equal(await page.locator('#stage .page-art').evaluate(n => getComputedStyle(n).filter),'none');
  assert.equal(await page.locator('#stage .page-number').evaluate(n=>getComputedStyle(n).color),'rgb(250, 247, 239)');
  await page.locator('#stage .ayahPolygon[surah="112"][ayah="1"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#verse-menu').isVisible(),true);
  await page.getByRole('button',{name:'التفسير',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.bridgeEvents.at(-1).type),'tafsir');
  assert.equal(await page.evaluate(()=>window.bridgeEvents.at(-1).key),'112:1');
  await page.locator('#stage .ayahPolygon[surah="112"][ayah="1"]').focus();
  await page.keyboard.press('Enter');
  await page.evaluate(()=>window.updateState({bookmarkedKeys:['112:1']}));
  assert.equal(await page.getByRole('button',{name:'إشارة مرجعية',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'ابدأ التكرار هنا',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.bridgeEvents.at(-1).type),'loopstart');
  assert.equal(await page.evaluate(()=>window.bridgeEvents.at(-1).key),'112:1');
  await page.evaluate(()=>window.updateState({loopPickMode:'end',loopStartKey:'112:1'}));
  assert.equal(await page.locator('#stage .ayahPolygon.loopstart').count(),1);
  await page.locator('#stage .ayahPolygon[surah="112"][ayah="2"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>window.bridgeEvents.at(-1).type),'looppick');
  assert.equal(await page.evaluate(()=>window.bridgeEvents.at(-1).key),'112:2');
  assert.equal(await page.locator('#verse-menu').isVisible(),false,'direct selection does not reopen the menu');
  await page.evaluate(()=>window.updateState({loopPickMode:null,loopEndKey:'112:2'}));
  assert.equal(await page.locator('#stage .ayahPolygon.loopend').count(),1);
  await page.evaluate(()=>window.zoomPage(2));
  assert.equal(await page.locator('#sheet').evaluate(n=>n.getBoundingClientRect().width),780);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390,'book zoom scrolls inside the reader, preserving fixed menu coordinates');
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>window.zoomPage(1));
  assert.equal(await page.locator('#sheet').evaluate(n=>n.getBoundingClientRect().width),320);
  // The drag follows the finger on both axes and commits only beyond halfway.
  await page.setViewportSize({width:390,height:606});
  await page.evaluate(()=>window.zoomPage(1));
  await page.evaluate(info=>window.cachePage(info),descriptor(300));
  await page.evaluate(()=>window.activatePage(300,{language:'ar',dark:true,activeKey:null,loopPickMode:null},false));
  for(const n of [299,301,298,302])await page.evaluate(info=>window.cachePage(info),descriptor(n));
  const touch=async(kind,x,y)=>page.evaluate(({kind,x,y})=>{
    if(kind==='touchstart')window.gestureTarget=document.querySelector('#stage .page-art');
    const target=window.gestureTarget;
    const t=new Touch({identifier:1,target,clientX:x,clientY:y});
    target.dispatchEvent(new TouchEvent(kind,{bubbles:true,cancelable:true,touches:kind==='touchend'||kind==='touchcancel'?[]:[t],changedTouches:[t]}));
  },{kind,x,y});
  await touch('touchstart',180,500);await touch('touchmove',180,470);
  await page.waitForTimeout(30);
  assert.ok(await page.locator('#stage .panel[data-page="300"]').evaluate(n=>n.getBoundingClientRect().top)<-20,'page follows held vertical drag');
  await page.waitForTimeout(180);
  await touch('touchend',180,470);await settled();
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'300','a sub-threshold drag returns to the current page');
  await touch('touchstart',180,550);await touch('touchmove',180,120);await touch('touchend',180,120);
  assert.equal(await page.evaluate(()=>window.bridgeEvents.filter(e=>e.type==='swipe').at(-1).page),300,'bridge records original page');
  await page.evaluate(()=>window.activatePage(301,{language:'ar',dark:true}));
  await settled();
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'301','more than half up turns to next page');
  await touch('touchstart',50,300);await touch('touchmove',320,300);await touch('touchend',320,300);await settled();
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'302','horizontal drag remains available');
  await touch('touchstart',320,300);await touch('touchmove',50,300);await touch('touchcancel',50,300);await settled();
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'302','cancelled gesture cannot change the page');
  await touch('touchstart',180,80);await touch('touchmove',180,500);await touch('touchend',180,500);await settled();
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'301','more than half down turns to previous page');
  assert.equal(await page.locator('#stage .ayahPolygon').count(),pages[300].verseKeys.length,'drag preserves the complete printed page');
  // Real browser input exercises Android-style gesture arbitration, unlike
  // dispatching TouchEvents directly into the document.
  const input = await page.context().newCDPSession(page);
  const flick = async (x,y,dx,dy,duration=160,settleMs=250) => {
    const timestamp=Date.now()/1000;
    await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}],timestamp});
    for(let i=1;i<=4;i++){
      await page.waitForTimeout(duration/4);
      await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/4,y:y+dy*i/4}],timestamp:timestamp+duration*i/4000});
    }
    await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:timestamp+duration/1000+0.005});
    await page.waitForTimeout(settleMs);
    if(settleMs>=200)await settled();
  };
  await flick(140,310,100,0);
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'302','a short horizontal flick turns the page');
  await flick(240,310,-100,0);
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'301','a short reverse flick returns one page');
  await flick(180,380,0,-120);
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'302','a short upward flick turns the page');
  await flick(180,250,0,120);
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'301','a short downward flick returns one page');
  await flick(140,310,18,0);
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'301','small finger movement does not turn the page');
  await flick(140,310,40,0,800);
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'301','a slow sub-threshold drag still returns to the current page');
  for(let i=0;i<6;i++)await flick(i%2?260:140,310,i%2?-120:120,0,100,20);
  await settled();
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'301','repeated forward/reverse flicks settle on the expected page');
  assert.equal(await page.locator('#stage .panel').count(),1,'interrupted animations leave one complete page');
  assert.equal(await page.locator('#stage .panel').evaluate(n=>Math.round(n.getBoundingClientRect().left)),0,'repeated flicks never leave the page shifted');
  await page.evaluate(()=>window.zoomPage(2));
  await flick(240,310,-120,0);
  assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'301','zoomed swipes pan instead of turning pages');
  assert.ok(await page.locator('#reader-viewport').evaluate(n=>n.scrollLeft)>0,'zoomed reading retains native panning');
  await page.evaluate(()=>window.zoomPage(1));
  // Mirror the native neighbor preparation order. FIFO eviction used to drop
  // page 58 after turning to 59, permanently blocking the reverse gesture.
  await page.evaluate(info=>window.cachePage(info),descriptor(58));
  await page.evaluate(()=>window.activatePage(58,{},false));
  for(const n of [57,59,56,60])await page.evaluate(info=>window.cachePage(info),descriptor(n));
  for(let i=0;i<4;i++){
    await flick(140,310,100,0);
    const staleTurn=await page.evaluate(()=>window.bridgeEvents.filter(e=>e.type==='swipe').at(-1).turn);
    for(const n of [58,60,57,61])await page.evaluate(info=>window.cachePage(info),descriptor(n));
    assert.ok(await page.evaluate(()=>cache.has(58)),'native preloading keeps the immediately previous page available');
    await flick(240,310,-100,0);
    await page.evaluate(turn=>window.activatePage(59,{},true,turn),staleTurn);
    assert.equal(await page.locator('#stage .panel').getAttribute('data-page'),'58','native neighbor refresh permits repeated 58/59 page turns');
    assert.equal(await page.locator('#stage .panel').count(),1,'a delayed native acknowledgement cannot roll back a newer turn');
    for(const n of [57,59,56,60])await page.evaluate(info=>window.cachePage(info),descriptor(n));
    assert.equal(await page.locator('.panel').count(),5,'neighbor refresh keeps the DOM pool bounded');
  }
  await page.setViewportSize({width:320,height:568});
  for (const n of [1,2]) {
    await page.evaluate(info=>window.cachePage(info),descriptor(n));
    await page.evaluate(({n,state})=>window.activatePage(n,state,false),{n,state:{...state,theme:{background:'#5B2938',deep:'#401C28',ink:'#4A2330',lightPaper:'#FAF7EF',pale:'#F1E6E9',accent:'#DBAB68'}}});
    assert.equal(await page.locator('#stage .opening-frame').count(),1);
    assert.equal(await page.locator('#stage .ayahPolygon').count(),n===1?7:5);
    const bounds=await page.locator('#stage .page-art>svg').evaluate(svg=>({view:svg.getAttribute('viewBox'),ratio:svg.getAttribute('preserveAspectRatio'),polys:[...svg.querySelectorAll('.ayahPolygon')].map(node=>{const r=node.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})}));
    assert.equal(bounds.ratio,'xMidYMid meet');
    assert.ok(Number(bounds.view.split(' ')[3])<310,'opening pages crop empty canvas, preserving source artwork');
    assert.ok(bounds.polys.every(([l,t,r,b])=>l>=0&&t>=0&&r<=320&&b<=568),'every opening-page verse fits');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()),'#5B2938','theme recolors controls and original geometric frame');
    await page.evaluate(()=>window.updateState({dark:true}));
    assert.equal(await page.locator('#stage .page-number').evaluate(n=>getComputedStyle(n).color),'rgb(250, 247, 239)');
  }
  for (const language of ['fr','de','ur','ckb','zh-Hans','hi']) {
    const ui=mushafLabels(language);
    await page.evaluate(state=>window.updateState(state),{language,ui});
    await page.locator('#stage .ayahPolygon').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('button',{name:ui.menu[3],exact:true}).isVisible(),true,language+' localized ayah menu');
    assert.equal(await page.locator('#verse-menu').evaluate(node=>getComputedStyle(node).direction),ui.rtl?'rtl':'ltr');
    const bounds=await page.locator('#verse-menu').evaluate(node=>{const r=node.getBoundingClientRect();return[r.left,r.right]});
    assert.ok(bounds[0]>=0&&bounds[1]<=320,language+' menu stays inside viewport');
    await page.keyboard.press('Escape');
  }
  // One book panel owns both leaves, including their gesture and zoom state.
  const tablet=await browser.newPage({viewport:{width:1280,height:800}});
  tablet.on('pageerror',e=>errors.push(e.message));
  const spreadDescriptor=n=>({...descriptor(n),companion:descriptor(n+1)});
  const tabletHtml=buildMushafDocument({...spreadDescriptor(57),pageStep:2,language:'ar',dark:false,activeKey:null},descriptor(57).svg,readFileSync(new URL('../assets/quran/AmiriQuran.ttf',import.meta.url)).toString('base64'));
  await tablet.setContent(tabletHtml.replace('<script>','<script>window.bridgeEvents=[];window.ReactNativeWebView={postMessage:value=>window.bridgeEvents.push(JSON.parse(value))};'));
  await tablet.waitForFunction(()=>window.bridgeEvents.some(e=>e.type==='ready'));
  const tabletSettled=()=>tablet.waitForFunction(()=>{
    const stage=document.querySelector('#stage');
    return stage.children.length===1&&getComputedStyle(stage.firstElementChild).transform==='none';
  });
  const assertSpread=async(anchor)=>{
    await tabletSettled();
    assert.equal(await tablet.locator('#stage>.spread').getAttribute('data-page'),String(anchor));
    assert.deepEqual(await tablet.locator('#stage>.spread>.leaf').evaluateAll(leaves=>leaves.map(leaf=>Number(leaf.dataset.page))),[anchor,anchor+1],'both leaves remain consecutive');
    const boxes=await tablet.locator('#stage>.spread>.leaf').evaluateAll(leaves=>leaves.map(leaf=>{const r=leaf.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width,height:r.height};}));
    assert.equal(boxes[0].left,boxes[1].right,'odd leaf is on the right of the even leaf');
    assert.equal(boxes[0].top,boxes[1].top);
    assert.equal(boxes[0].width,boxes[1].width);
    assert.equal(boxes[0].height,boxes[1].height);
  };
  for(const n of [55,59,53,61])await tablet.evaluate(info=>window.cachePage(info),spreadDescriptor(n));
  await assertSpread(57);
  assert.equal(await tablet.locator('#stage .ayahPolygon').count(),pages[56].verseKeys.length+pages[57].verseKeys.length,'the book contains the complete source verses of both pages');
  const tabletInput=await tablet.context().newCDPSession(tablet);
  const tabletSwipe=async(x,dx,settleMs=250)=>{
    await tabletInput.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:400}]});
    for(let i=1;i<=4;i++){
      await tablet.waitForTimeout(25);
      await tabletInput.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/4,y:400}]});
    }
    await tabletInput.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await tablet.waitForTimeout(settleMs);
    if(settleMs>=200)await tabletSettled();
  };
  await tabletSwipe(800,100);
  await assertSpread(59);
  assert.equal(await tablet.evaluate(()=>window.bridgeEvents.filter(e=>e.type==='swipe').at(-1).delta),1,'tablet bridge sends one spread step');
  const staleTabletTurn=await tablet.evaluate(()=>window.bridgeEvents.filter(e=>e.type==='swipe').at(-1).turn);
  for(const n of [57,61,55,63])await tablet.evaluate(info=>window.cachePage(info),spreadDescriptor(n));
  await tabletSwipe(400,-100);
  await tablet.evaluate(turn=>window.activatePage(59,{},true,turn),staleTabletTurn);
  await assertSpread(57);
  assert.equal(await tablet.evaluate(()=>cache.size),5,'spread cache remains bounded while retaining both leaves');

  // Interrupt animation while repeatedly alternating gestures between leaves.
  for(let i=0;i<8;i++)await tabletSwipe(i%2?400:800,i%2?-100:100,20);
  await assertSpread(57);
  assert.equal(await tablet.locator('#stage>.spread').evaluate(n=>Math.round(n.getBoundingClientRect().left)),0,'rapid opposite-leaf swipes never leave the book shifted');

  // Two fingers trying opposite directions must not turn each leaf separately.
  const swipeCount=await tablet.evaluate(()=>window.bridgeEvents.filter(e=>e.type==='swipe').length);
  await tabletInput.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:10,x:850,y:400}]});
  await tabletInput.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:10,x:880,y:400}]});
  await tabletInput.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:10,x:880,y:400},{id:11,x:400,y:400}]});
  await tabletInput.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:10,x:980,y:400},{id:11,x:300,y:400}]});
  await tabletInput.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await assertSpread(57);
  assert.equal(await tablet.evaluate(()=>window.bridgeEvents.filter(e=>e.type==='swipe').length),swipeCount,'opposing multitouch gestures cancel the shared turn');
  // Those fingers may also activate the browser's permitted pinch zoom.
  // Restore its scale before Playwright's desktop pointer/keyboard actions.
  await tabletInput.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});

  // Verse actions retain the actual ayah on either leaf of the shared document.
  for(const leaf of [57,58]){
    const verse=tablet.locator('#stage .leaf[data-page="'+leaf+'"] .ayahPolygon').first();
    const key=await verse.evaluate(n=>n.getAttribute('surah')+':'+n.getAttribute('ayah'));
    await verse.focus();await tablet.keyboard.press('Enter');
    await tablet.getByRole('button',{name:'التفسير',exact:true}).click();
    assert.equal(await tablet.evaluate(()=>window.bridgeEvents.at(-1).key),key,'verse actions preserve the selected leaf ayah');
  }

  await tablet.evaluate(()=>window.zoomPage(2));
  assert.equal(await tablet.locator('#sheet').evaluate(n=>n.getBoundingClientRect().width),2560);
  assert.deepEqual(await tablet.locator('#stage>.spread>.leaf').evaluateAll(leaves=>leaves.map(n=>n.getBoundingClientRect().width)),[1280,1280],'zoom scales both pages together');
  await tabletSwipe(800,-100);
  assert.equal(await tablet.locator('#stage>.spread').getAttribute('data-page'),'57','zoomed gestures on the right leaf pan the whole book');
  await tabletSwipe(400,-100);
  assert.equal(await tablet.locator('#stage>.spread').getAttribute('data-page'),'57','zoomed gestures on the left leaf pan the whole book');
  assert.ok(await tablet.locator('#reader-viewport').evaluate(n=>n.scrollLeft)>0,'spread zoom preserves native horizontal panning');
  await tablet.evaluate(()=>window.zoomPage(16/22));
  assert.ok(await tablet.locator('#sheet').evaluate(n=>n.getBoundingClientRect().width)<1280,'smaller text sizes visibly shrink the whole book');

  for(const anchor of [1,603]){
    await tablet.evaluate(()=>window.zoomPage(1));
    await tablet.evaluate(info=>window.cachePage(info),spreadDescriptor(anchor));
    await tablet.evaluate(anchor=>window.activatePage(anchor,{},false),anchor);
    await assertSpread(anchor);
    const before=await tablet.evaluate(()=>window.bridgeEvents.filter(e=>e.type==='swipe').length);
    await tabletSwipe(anchor===1?400:800,anchor===1?-100:100);
    await assertSpread(anchor);
    assert.equal(await tablet.evaluate(()=>window.bridgeEvents.filter(e=>e.type==='swipe').length),before,'outward gestures at book ends cannot turn beyond the Quran');
    assert.equal(await tablet.locator('#stage .ayahPolygon').count(),pages[anchor-1].verseKeys.length+pages[anchor].verseKeys.length,'boundary spread preserves both complete source pages');
  }
  if(process.env.MUSHAF_QA_SCREENSHOTS)await tablet.screenshot({path:process.env.MUSHAF_QA_SCREENSHOTS+'/landscape-spread-603-604.png'});
  await tablet.close();
  assert.deepEqual(errors,[]);
  console.log('Mushaf browser QA passed: startup, prepared DOM reuse, bounded eviction, rapid transitions, real four-direction flicks, slow/cancelled drags, repeated flicks, zoom panning, theme/language, tafsir action, bookmark state, centered pages, ayah loop selection, resize, opening pages, unified landscape spreads, opposite-leaf gestures, multitouch cancellation, shared book zoom and first/last spread boundaries.');
} finally { await browser.close(); }
