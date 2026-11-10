import {Asset} from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import {openDatabaseAsync} from 'expo-sqlite';
import {CITY_DATABASE_ASSET,CITY_DATABASE_NAME} from './data/city-database-asset';
import {CityCatalogue,formatLocationLabel,type PrayerLocation} from './domain/cities';
import type {Language} from './i18n';

let pending:Promise<CityCatalogue>|undefined;
export function cityCatalogue():Promise<CityCatalogue> {
  if(!pending){
    pending=(async()=>{
      const folder=`${FileSystem.documentDirectory}SQLite/`;
      const path=`${folder}${CITY_DATABASE_NAME}`;
      if(!(await FileSystem.getInfoAsync(path)).exists){
        const asset=await Asset.fromModule(CITY_DATABASE_ASSET).downloadAsync();
        if(!asset.localUri)throw new Error('Bundled city catalogue unavailable');
        await FileSystem.makeDirectoryAsync(folder,{intermediates:true});
        const temporary=`${path}.part`;
        await FileSystem.copyAsync({from:asset.localUri,to:temporary});
        await FileSystem.moveAsync({from:temporary,to:path});
      }
      const database=await openDatabaseAsync(CITY_DATABASE_NAME);
      await database.execAsync('PRAGMA cache_size=-512; PRAGMA mmap_size=0; PRAGMA temp_store=FILE; PRAGMA query_only=ON;');
      return new CityCatalogue(database);
    })();
    pending.catch(()=>{pending=undefined;});
  }
  return pending;
}
export async function prayerLocationLabel(location:PrayerLocation,language:Language):Promise<string> {
  return formatLocationLabel(location,language,await (await cityCatalogue()).cityFor(location));
}
