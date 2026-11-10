export type Point=readonly [number,number];
export type VersePolygon={key:string;d:string;parts:Point[][];top:number};
/** The pinned edition's hit regions consist solely of absolute M/L/Z polygons. */
export function sourceVersePolygons(svg:string):VersePolygon[]{
  return [...svg.matchAll(/<path\b[^>]*class="ayahPolygon"[^>]*>/g)].map(([tag])=>{
    const attr=(name:string)=>tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1]??'';
    const d=attr('d');
    const parts=[...d.matchAll(/M([^M]+)/g)].map(([,part])=>{const values=(part.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);return Array.from({length:values.length/2},(_,i)=>[values[i*2],values[i*2+1]] as Point);});
    return {key:`${attr('surah')}:${attr('ayah')}`,d,parts,top:Math.min(...parts.flat().map(p=>p[1]))};
  });
}
export function pointInVerse(x:number,y:number,polygon:VersePolygon):boolean{
  return polygon.parts.some(points=>{let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }return inside;});
}
export function sourcePoint(x:number,y:number,width:number,height:number,viewBox:string):Point {
  const [vx,vy,vw,vh]=viewBox.split(/\s+/).map(Number);const scale=Math.min(width/vw,height/vh);
  return [(x-(width-vw*scale)/2)/scale+vx,(y-(height-vh*scale)/2)/scale+vy];
}
export function verseFocusRect(polygon:VersePolygon,viewBox:string,box:{x:number;y:number;width:number;height:number},leaf:{width:number;height:number}){
  const [vx,vy,vw,vh]=viewBox.split(/\s+/).map(Number),scale=Math.min(box.width/vw,box.height/vh),rootScale=Math.min(leaf.width/360,leaf.height/600);
  const points=polygon.parts.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const left=(leaf.width-360*rootScale)/2+(box.x+(box.width-vw*scale)/2+(Math.min(...xs)-vx)*scale)*rootScale;
  const top=(leaf.height-600*rootScale)/2+(box.y+(box.height-vh*scale)/2+(Math.min(...ys)-vy)*scale)*rootScale;
  return {left,top,width:Math.max(1,(Math.max(...xs)-Math.min(...xs))*scale*rootScale),height:Math.max(1,(Math.max(...ys)-Math.min(...ys))*scale*rootScale)};
}
