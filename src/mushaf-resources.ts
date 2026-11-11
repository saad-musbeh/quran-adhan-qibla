import {Asset} from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import {File} from 'expo-file-system';
import {decodeMushafPage} from './domain/mushaf-compression';
import {MushafPageCache} from './domain/mushaf-cache';

const decodedPages=new MushafPageCache(async module=>{
  const asset=await Asset.fromModule(module).downloadAsync();
  if(!asset.localUri)throw new Error('Bundled Mushaf artwork unavailable');
  // Binary reads avoid the base64 string and atob copy for every page.
  return decodeMushafPage(await new File(asset.localUri).bytes());
});
let metadataFont:Promise<string>|undefined;
async function readAsset(module:number,base64=false){
  const asset=await Asset.fromModule(module).downloadAsync();
  if(!asset.localUri)throw new Error('Bundled Mushaf artwork unavailable');
  return FileSystem.readAsStringAsync(asset.localUri,{encoding:base64?FileSystem.EncodingType.Base64:FileSystem.EncodingType.UTF8});
}
export function preloadMushafPage(module:number):Promise<string>{
  return decodedPages.load(module);
}
export function consumeMushafPage(module:number){return decodedPages.consume(module);}
export function preloadMushafResources(module:number):Promise<{svg:string;font:string}>{
  if(!metadataFont){metadataFont=readAsset(require('../assets/quran/AmiriQuran.ttf'),true);metadataFont.catch(()=>{metadataFont=undefined;});}
  return Promise.all([consumeMushafPage(module),metadataFont]).then(([svg,font])=>({svg,font}));
}
export function releaseMushafResources(){decodedPages.clear();metadataFont=undefined;}
