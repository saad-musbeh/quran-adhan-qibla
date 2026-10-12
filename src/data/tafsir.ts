export type TafsirBook = {id:string; title:string; publisher:string; version:string; url:string; apiKey:string};
export const TAFSIR_BOOKS: readonly TafsirBook[] = [
  {id:'moyassar', title:'التفسير الميسر', publisher:'مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة', version:'V1.0.0 (2017-02-15)', url:'https://quranenc.com/ar/browse/arabic_moyassar', apiKey:'arabic_moyassar'},
  {id:'mokhtasar', title:'المختصر في تفسير القرآن الكريم', publisher:'مركز تفسير للدراسات القرآنية', version:'V1.0.0 (2017-02-15)', url:'https://quranenc.com/ar/browse/arabic_mokhtasar', apiKey:'arabic_mokhtasar'},
];
