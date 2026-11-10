import type {Language} from '../i18n';
import type {QuranTheme} from '../domain/quran-theme';
import type {Verse} from '../domain/quran';
export type MushafPageProps={
  theme?:QuranTheme;
  page:number;asset:number;verses:readonly Verse[];surahNames:string;juzName:string;
  language:Language;dark:boolean;activeKey:string|null;zoom?:number;pageStep?:1|2;
  onTap:()=>void;onPlayVerse:(key:string)=>void;onPageSwipe:(delta:number,page:number)=>void;
  loopPickMode?:'start'|'end'|null;loopStartKey?:string|null;loopEndKey?:string|null;onLoopStart?:(key:string)=>void;onLoopEnd?:(key:string)=>void;onLoopPick?:(key:string)=>void;
  onTafsirVerse?:(key:string)=>void;onBookmarkVerse?:(key:string)=>void;bookmarkedKeys?:readonly string[];
};
