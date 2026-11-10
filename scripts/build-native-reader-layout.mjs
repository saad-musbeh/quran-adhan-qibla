// Optional regeneration: PLAYWRIGHT_MODULE=/path/to/playwright node --experimental-strip-types scripts/build-native-reader-layout.mjs
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {decodeMushafPage} from '../src/domain/mushaf-compression.ts';
import {buildMushafDocument} from '../src/components/mushaf-document.ts';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const result={};
try{
  for(const n of [1,2]){
    const page=await browser.newPage({viewport:{width:390,height:606}});
    const source=decodeMushafPage(readFileSync(new URL(`../assets/mushaf/pages/00${n}.svg.zst`,import.meta.url)));
    const html=buildMushafDocument({page:n,language:'ar',dark:false,activeKey:null,verses:[],juzName:'',surahNames:''},source,'');
    await page.setContent(html.replace('<script>','<script>window.ReactNativeWebView={postMessage:()=>{}};'));
    result[n]=await page.evaluate(()=>({artViewBox:document.querySelector('#stage .page-art>svg').getAttribute('viewBox'),titleViewBox:document.querySelector('#stage .opening-title>svg').getAttribute('viewBox')}));
    await page.close();
  }
}finally{await browser.close();}
writeFileSync(new URL('../src/data/mushaf-opening-layout.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
