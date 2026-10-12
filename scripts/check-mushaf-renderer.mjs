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
  await page.addInitScript(() => {});
  const html = buildMushafDocument({...descriptor(600),language:'en',dark:false,activeKey:null}, descriptor(600).svg, readFileSync(new URL('../assets/quran/AmiriQuran.ttf', import.meta.url)).toString('base64'));
  await page.setContent(html.replace('<script>', '<script>window.bridgeEvents=[];window.ReactNativeWebView={postMessage:value=>window.bridgeEvents.push(JSON.parse(value))};'));
  await page.waitForFunction(() => window.bridgeEvents.some(e => e.type==='ready'));
  assert.equal(await page.locator('#stage .ayahPolygon').count(), pages[599].verseKeys.length);
  for (const n of [599,601,598,602]) await page.evaluate(info => window.cachePage(info), descriptor(n));
  assert.equal(await page.locator('.panel').count(), 5);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390,'prepared pages cannot expand the RTL viewport');
  for(const n of [600,601]){const margin=await page.locator('.panel[data-page="'+n+'"] .page-art').evaluate(node=>[node.style.left,node.style.right]);assert.deepEqual(margin,['12.75%','12.75%'],'odd/even artwork is centered');}
  const state = {language:'en',dark:false,activeKey:null,bookmarkedKeys:[]};
  await page.evaluate(() => {window.originalArt=document.querySelector('#stage .page-art>svg');});
  await page.evaluate(state => window.activatePage(601,state), state);
  await page.waitForTimeout(250);
  await page.evaluate(state => window.activatePage(600,state), state);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => document.querySelector('#stage .page-art>svg') === window.originalArt), true, 'cached source reuses the prepared SVG DOM');
  for (const n of [603,604]) {
    await page.evaluate(info => window.cachePage(info), descriptor(n));
    await page.evaluate(({n,state}) => window.activatePage(n,state), {n,state});
  }
  await page.waitForTimeout(250);
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
  assert.deepEqual(errors,[]);
  console.log('Mushaf browser QA passed: startup, prepared DOM reuse, bounded eviction, rapid transitions, theme/language, tafsir action, bookmark state, centered pages, ayah loop selection, zoom, resize, opening pages and persisted theme rendering.');
} finally { await browser.close(); }
