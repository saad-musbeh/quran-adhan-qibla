import {Asset} from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import {decodeMushafPage} from './domain/mushaf-compression';

// Current leaf plus its next leaf. Decoded artwork never accumulates across books.
const decodedPages=new Map<number,Promise<string>>();
let metadataFont:Promise<string>|undefined;
async function readAsset(module:number,base64=false){
  const asset=await Asset.fromModule(module).downloadAsync();
  if(!asset.localUri)throw new Error('Bundled Mushaf artwork unavailable');
  return FileSystem.readAsStringAsync(asset.localUri,{encoding:base64?FileSystem.EncodingType.Base64:FileSystem.EncodingType.UTF8});
}
export function preloadMushafPage(module:number):Promise<string>{
  let pending=decodedPages.get(module);
  if(!pending){pending=readAsset(module,true).then(encoded=>decodeMushafPage(Uint8Array.from(atob(encoded),character=>character.charCodeAt(0))));const request=pending;pending.catch(()=>{if(decodedPages.get(module)===request)decodedPages.delete(module);});}
  decodedPages.delete(module);decodedPages.set(module,pending);
  while(decodedPages.size>2)decodedPages.delete(decodedPages.keys().next().value!);
  return pending;
}
export function preloadMushafResources(module:number):Promise<{svg:string;font:string}>{
  if(!metadataFont){metadataFont=readAsset(require('../assets/quran/AmiriQuran.ttf'),true);metadataFont.catch(()=>{metadataFont=undefined;});}
  return Promise.all([preloadMushafPage(module),metadataFont]).then(([svg,font])=>({svg,font}));
}
export function releaseMushafResources(){decodedPages.clear();metadataFont=undefined;}
