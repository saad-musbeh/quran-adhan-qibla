import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {decodeMushafPage} from './mushaf-compression.ts';
import {sourceVersePolygons,sourcePoint,pointInVerse} from './mushaf-native.ts';
const source=(page:number)=>decodeMushafPage(readFileSync(new URL(`../../assets/mushaf/pages/${String(page).padStart(3,'0')}.svg.zst`,import.meta.url)));
test('native hit regions retain each sourced verse and every multi-line subpath',()=>{
  const pages=JSON.parse(readFileSync(new URL('../data/mushaf-pages.json',import.meta.url),'utf8')) as {verseKeys:string[]}[];
  for(const page of [1,2,3,60,293,599,600,604]){
    const polygons=sourceVersePolygons(source(page));
    assert.deepEqual(polygons.map(p=>p.key),pages[page-1].verseKeys);
    for(const polygon of polygons){assert.ok(polygon.parts.length>0);assert.ok(polygon.parts.every(part=>part.length>=3&&part.every(point=>point.every(Number.isFinite))));}
  }
  assert.deepEqual(sourceVersePolygons(source(605)),[]);
  assert.deepEqual(sourceVersePolygons(source(606)),[]);
});
test('hit tests distinguish neighboring verses and separated parts of the same verse',()=>{
  const polygons=sourceVersePolygons(source(1));
  assert.equal(polygons.find(p=>pointInVerse(100,30,p))?.key,'1:1');
  assert.equal(polygons.find(p=>pointInVerse(60,60,p))?.key,'1:2');
  assert.equal(polygons.find(p=>pointInVerse(15,180,p)),undefined,'a concave polygon does not fill its bounding rectangle');
  const split=sourceVersePolygons(source(3)).find(p=>p.parts.length>1)!;
  for(const part of split.parts){const x=(Math.min(...part.map(p=>p[0]))+Math.max(...part.map(p=>p[0])))/2,y=(Math.min(...part.map(p=>p[1]))+Math.max(...part.map(p=>p[1])))/2;assert.ok(pointInVerse(x,y,split));}
});
test('viewBox conversion accounts for zoom, aspect-ratio gutters and nonzero opening crops',()=>{
  assert.deepEqual(sourcePoint(100,200,345,550,'0 0 345 550'),[100,200]);
  assert.deepEqual(sourcePoint(200,400,690,1100,'0 0 345 550'),[100,200]);
  assert.deepEqual(sourcePoint(100,275,345,600,'0 0 345 550'),[100,250]);
  assert.deepEqual(sourcePoint(120,150,200,300,'10 20 100 100'),[70,70]);
});
