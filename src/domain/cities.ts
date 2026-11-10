import { localeFor, type Language } from './languages.ts';
import { bilingual, message } from '../localization.ts';

export type City = { id:number; name:string; arabicName?:string|null; asciiName?:string|null; countryCode:string; latitude:number; longitude:number; timeZone?:string|null };
export type Country = { code:string; name:string; arabicName:string; cityCount:number };
export type PrayerLocation = { source:string; latitude:number; longitude:number; label?:string };
declare const require:(path:string)=>unknown;
export const countries = require('../data/countries.json') as Country[];
const countryByCode = new Map(countries.map(country=>[country.code,country]));
export const EARTH_RADIUS_KM = 6371.0088;
export const NEARBY_CITY_KM = 50;

export function normalizeCitySearch(value:string):string {
  return value.normalize('NFD').replace(/[\u0300-\u036f\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase();
}
export function cityLabel(city:City,language:Language):string { return language==='ar'?city.arabicName??city.name:city.name; }
export function countryLabel(country:Country,language:Language):string { return language==='ar'?country.arabicName:message(language,country.name); }
export function placeLabel(city:City,language:Language):string { const country=countryByCode.get(city.countryCode);return `${country?countryLabel(country,language):city.countryCode} · ${cityLabel(city,language)}`; }
export function validCityCoordinates(latitude:number,longitude:number):boolean { return Number.isFinite(latitude)&&Math.abs(latitude)<=90&&Number.isFinite(longitude)&&Math.abs(longitude)<=180; }
export function formatLocationLabel(location:PrayerLocation,language:Language,city:City|null):string {
  if(location.source==='city'&&city)return placeLabel(city,language);
  if(location.label?.trim())return location.label.trim();
  if(city&&location.source!=='city')return bilingual(language,'بالقرب من {place}','Near {place}',{place:placeLabel(city,language)});
  const source=location.source==='device'?bilingual(language,'موقع الجهاز','Device location'):location.source==='manual'?bilingual(language,'إحداثيات يدوية','Manual coordinates'):location.source==='map'?bilingual(language,'نقطة على الخريطة','Map point'):bilingual(language,'الموقع','Location');
  if(!validCityCoordinates(location.latitude,location.longitude))return source;
  const number=new Intl.NumberFormat(localeFor(language),{useGrouping:false,minimumFractionDigits:4,maximumFractionDigits:4});
  return `${source} · ${number.format(location.latitude)}, ${number.format(location.longitude)}`;
}

export interface CityDatabase {
  getAllAsync<T>(sql:string,...params:(string|number)[]):Promise<T[]>;
  getFirstAsync<T>(sql:string,...params:(string|number)[]):Promise<T|null>;
}
const columns='id,name,arabicName,asciiName,countryCode,latitude,longitude,timeZone';
export type CitySearchResult = { cities:City[]; total:number };
/** Only requested rows cross the native bridge. The full catalogue stays on disk. */
export class CityCatalogue {
  private database:CityDatabase;
  constructor(database:CityDatabase) { this.database=database; }
  async search(query:string,countryCode?:string,limit=8):Promise<CitySearchResult> {
    const term=normalizeCitySearch(query.trim());
    if(!term&&!countryCode)return {cities:[],total:0};
    const country=countryCode?.toUpperCase();
    const where=[...(country?['countryCode = ?']:[]),...(term?['instr(searchNames, ?) > 0']:[])].join(' AND ');
    const args:(string|number)[]=[...(country?[country]:[]),...(term?[term]:[])];
    const count=await this.database.getFirstAsync<{total:number}>(`SELECT count(*) AS total FROM cities WHERE ${where}`,...args);
    const rank=term?'CASE WHEN instr(searchNames, ?) > 0 THEN 0 WHEN instr(searchNames, ?) > 0 THEN 1 ELSE 2 END, ':'';
    const cities=await this.database.getAllAsync<City>(`SELECT ${columns} FROM cities WHERE ${where} ORDER BY ${rank}ordinal LIMIT ?`,...args,...(term?[`\u001f${term}\u001f`,`\u001f${term}`]:[]),Math.max(1,Math.floor(limit)));
    return {cities,total:count?.total??0};
  }
  async cityFor(location:PrayerLocation):Promise<City|null> {
    const {latitude,longitude}=location;
    if(!validCityCoordinates(latitude,longitude))return null;
    if(location.source==='city')return this.database.getFirstAsync<City>(`SELECT ${columns} FROM cities WHERE latitude = ? AND longitude = ? ORDER BY ordinal LIMIT 1`,latitude,longitude);
    if(location.label?.trim())return null;
    const rad=Math.PI/180, radius=NEARBY_CITY_KM/EARTH_RADIUS_KM,latRadius=radius/rad;
    const lonRadius=Math.abs(latitude)+latRadius>=90?180:Math.asin(Math.min(1,Math.sin(radius)/Math.cos(latitude*rad)))/rad;
    let nearest:City|null=null,distance=NEARBY_CITY_KM,offset=0;
    // Bound the native result window even at the pole or in dense urban regions.
    for(;;){
      const rows=await this.database.getAllAsync<City>(`SELECT ${columns} FROM cities WHERE latitude BETWEEN ? AND ? AND (abs(longitude - ?) <= ? OR abs(longitude - ?) >= ?) ORDER BY latitude,ordinal LIMIT 128 OFFSET ?`,Math.max(-90,latitude-latRadius),Math.min(90,latitude+latRadius),longitude,lonRadius,longitude,360-lonRadius,offset);
      for(const city of rows){const a=Math.sin((city.latitude-latitude)*rad/2)**2+Math.cos(latitude*rad)*Math.cos(city.latitude*rad)*Math.sin((city.longitude-longitude)*rad/2)**2;const km=2*EARTH_RADIUS_KM*Math.asin(Math.sqrt(Math.min(1,Math.max(0,a))));if(km<=distance){distance=km;nearest=city;}}
      if(rows.length<128)return nearest;
      offset+=rows.length;
    }
  }
}
