import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import {isValidElement} from 'react';
import ts from 'typescript';
import type {parse as NativeParse,JsxAST} from 'react-native-svg';
import {prepareNativeArtwork} from './mushaf-native-artwork.ts';
import {decodeMushafPage} from './mushaf-compression.ts';

// Run the installed SVG parser without constructing platform views. Its output
// is real React elements; native rendering is checked separately on Android.
const require=createRequire(import.meta.url);
const parserSource=readFileSync(new URL('../../node_modules/react-native-svg/src/xml.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(parserSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
const tags=Object.fromEntries(['svg','g','path','defs','use','rect','circle','ellipse','linearGradient','radialGradient','stop','clipPath','mask','text','tspan','line','polygon','polyline'].map(tag=>[tag,tag]));
const output={exports:{} as {parse:typeof NativeParse}};
new Function('require','module','exports',compiled)((name:string)=>name==='./xmlTags'?{tags}:name==='./utils/fetchData'?{}:require(name),output,output.exports);
const parse=output.exports.parse;
function paths(ast:JsxAST|null):string[]{
  const result:string[]=[];
  function visit(node:unknown){
    if(Array.isArray(node)){node.forEach(visit);return;}
    if(isValidElement<{d?:string;children?:unknown}>(node)){if(node.type==='path'&&node.props.d)result.push(createHash('sha256').update(node.props.d).digest('hex'));visit(node.props.children);}
  }
  visit(ast?.children);return result;
}
test('native preparation preserves every original path on all 606 sheets, in light and dark',()=>{
  for(let page=1;page<=606;page++){
    const source=decodeMushafPage(readFileSync(new URL(`../../assets/mushaf/pages/${String(page).padStart(3,'0')}.svg.zst`,import.meta.url)));
    const expected=paths(parse(source)).sort();
    for(const dark of [false,true]){
      const prepared=prepareNativeArtwork(source,page,dark,dark?'#FAF7EF':'#18334A',parse);
      const actual=[...paths(prepared.ast),...paths(prepared.title),...prepared.polygons.map(p=>createHash('sha256').update(p.d).digest('hex'))].sort();
      assert.deepEqual(actual,expected,`page ${page}, dark=${dark}: no glyph, marker or hit path can be lost or redrawn`);
      assert.equal(Boolean(prepared.title),page<=2);
    }
  }
});
