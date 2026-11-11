import {memo,useEffect,useMemo,useRef,useState} from 'react';
import {AccessibilityInfo,ActivityIndicator,Animated,PanResponder,Pressable as NativePressable,ScrollView,StyleSheet,View} from 'react-native';
import Svg,{G,Path,parse,type JsxAST} from 'react-native-svg';
import {Pressable} from './Pressable';
import {Text} from '../text-size';
import {bilingual} from '../i18n';
import {getQuranTheme} from '../domain/quran-theme';
import {sourcePoint,pointInVerse,verseFocusRect,type VersePolygon} from '../domain/mushaf-native';
import {mushafPageTurnTarget} from '../domain/mushaf-page-turns';
import {mushafPreloadLeaves} from '../domain/mushaf-preload';
import {printedPageVerses,chapterNames,juzArabic} from '../domain/quran-reader';
import {MUSHAF_PAGE_ASSETS} from '../data/mushaf-assets';
import {MUSHAF_PAGE_COUNT,LAST_READER_PAGE} from '../data/mushaf';
import {preloadMushafPage,releaseMushafResources} from '../mushaf-resources';
import {OPENING_FRAME} from './mushaf-decoration/opening-frame';
import {SURAH_BANNER} from './mushaf-decoration/surah-banner';
import type {MushafPageProps as Props} from './mushaf-props';
import {prepareNativeArtwork} from '../domain/mushaf-native-artwork';

type LeafGeometry={page:number;polygons:VersePolygon[];viewBox:string};
type SvgBox={x:number;y:number;width:number;height:number};
const TITLE_BOX:SvgBox={x:100.8,y:82.2,width:158.4,height:38.4};
const FRAME_BOX:SvgBox={x:10.8,y:24,width:338.4,height:552};
function fitTransform(viewBox:string,box:SvgBox,stretch=false){
  const [x,y,width,height]=viewBox.split(/\s+/).map(Number);
  let sx=box.width/width,sy=box.height/height;
  if(!stretch)sx=sy=Math.min(sx,sy);
  const tx=box.x+(box.width-width*sx)/2,ty=box.y+(box.height-height*sy)/2;
  return `translate(${tx} ${ty}) scale(${sx} ${sy}) translate(${-x} ${-y})`;
}
const Artwork=memo(function Artwork({ast,box,stretch=false}:{ast:JsxAST;box:SvgBox;stretch?:boolean}){return <G transform={fitTransform(String(ast.props.viewBox),box,stretch)}>{ast.children}</G>;});

function NativeLeaf({page,props,onGeometry,onHold,onPress}:{page:number;props:Props;onGeometry:(value:LeafGeometry)=>void;onHold:(key:string)=>void;onPress:(key:string)=>void}){
  const theme=props.theme??getQuranTheme('blue'),ink=props.dark?theme.lightPaper:theme.ink,paper=props.dark?theme.deep:theme.lightPaper;
  const [source,setSource]=useState<{page:number;svg:string}|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
  const [leafSize,setLeafSize]=useState({width:0,height:0}),[screenReader,setScreenReader]=useState(false);
  useEffect(()=>{let alive=true;void AccessibilityInfo.isScreenReaderEnabled().then(value=>{if(alive)setScreenReader(value);}).catch(()=>undefined);const subscription=AccessibilityInfo.addEventListener('screenReaderChanged',setScreenReader);return()=>{alive=false;subscription.remove();};},[]);
  useEffect(()=>{let alive=true;setError(false);void preloadMushafPage(MUSHAF_PAGE_ASSETS[page]).then(svg=>{if(alive)setSource({page,svg});}).catch(()=>{if(alive)setError(true);});return()=>{alive=false;};},[page,attempt]);
  const ready=source?.page===page?source.svg:null;
  const artwork=useMemo(()=>ready?prepareNativeArtwork(ready,page,props.dark,ink,parse):null,[ready,page,props.dark,ink]);
  useEffect(()=>{if(artwork)onGeometry({page,polygons:artwork.polygons,viewBox:artwork.viewBox});},[artwork,page,onGeometry]);
  const opening=page<=2,khatm=page>MUSHAF_PAGE_COUNT;
  const artBox=useMemo<SvgBox>(()=>({x:opening?57.6:21.6,y:opening?144:khatm?36:54,width:opening?244.8:316.8,height:opening?312:khatm?528:504}),[opening,khatm]);
  const vars:Record<string,string>={'--paper':paper,'--ink':ink,'--primary':theme.background,'--accent':theme.accent,'--illum-green':props.dark?'#254B46':'#286248','--illum-rose':props.dark?'#B56F82':'#C9516A','--illum-leaf':props.dark?'#67927D':'#A4AD75','--illum-gold':props.dark?'#B4915D':'#C69A50','--illum-scroll':props.dark?'#ADC8BF':'#E8DEC0','--illum-outline':props.dark?'#93ABA1':'#374E43'};
  const frame=useMemo(()=>OPENING_FRAME.replaceAll('#FAF7EF',paper).replace(/var\(([^)]+)\)/g,(_,name:string)=>vars[name]??paper),[paper,props.dark,ink,theme]);
  const banner=useMemo(()=>SURAH_BANNER.replaceAll('#18334A',theme.background).replaceAll('#DBAB68',theme.accent).replaceAll('#FAF7EF',paper),[theme,paper]);
  const frameAst=useMemo(()=>opening?parse(frame):null,[opening,frame]);
  const bannerAst=useMemo(()=>!opening&&!khatm?parse(banner):null,[opening,khatm,banner]);
  const verses=useMemo(()=>printedPageVerses(page),[page]);
  const activeKeys=new Set([props.activeKey,props.loopStartKey,props.loopEndKey]);
  const action=(key:string)=>onPress(key);
  return <View testID={`native-mushaf-page-${page}`} style={[styles.leaf,{backgroundColor:paper}]} onLayout={event=>setLeafSize(event.nativeEvent.layout)}>
    <View style={[styles.metadata,opening&&{top:0},khatm&&{justifyContent:'center'}]} pointerEvents="none">
      {!khatm&&<Text style={{color:ink,fontFamily:'AmiriQuran',paddingHorizontal:4,fontSize:opening?10:12}}>{juzArabic(verses[0]?.juz??1)}</Text>}
      <Text style={{color:ink,fontFamily:'AmiriQuran',paddingHorizontal:4,fontSize:khatm?18:opening?10:12}}>{khatm?bilingual(props.language,'دعاء ختم القرآن','Khatm dua'):chapterNames(verses)}</Text>
    </View>
    {artwork?<Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 360 600" accessibilityElementsHidden={screenReader} importantForAccessibility={screenReader?'no-hide-descendants':'auto'}>
      {/* One native drawing surface per leaf, including decoration and hit regions. */}
      <G pointerEvents="none">
        {frameAst&&<Artwork ast={frameAst} box={FRAME_BOX} stretch/>}
        {artwork.title&&<Artwork ast={artwork.title} box={TITLE_BOX}/>}
        {bannerAst&&<G transform={fitTransform(artwork.viewBox,artBox)}>
          {artwork.polygons.filter(p=>p.key.endsWith(':1')).map(p=><Artwork key={p.key} ast={bannerAst} box={{x:1,y:p.top-(p.key.startsWith('9:')?35:67.5),width:341,height:35}} stretch/>)}
        </G>}
        <Artwork ast={artwork.ast} box={artBox}/>
      </G>
      <G transform={fitTransform(artwork.viewBox,artBox)}>
        {artwork.polygons.map(p=><Path key={p.key} d={p.d} fill={p.key===props.loopStartKey?'#6194BB':p.key===props.loopEndKey?'#BD8744':theme.accent} fillOpacity={activeKeys.has(p.key)?0.35:props.bookmarkedKeys?.includes(p.key)?0.12:0} accessible {...{accessibilityRole:'button'}} accessibilityLabel={verses.find(v=>`${v.surah}:${v.number}`===p.key)?.text} onPress={()=>action(p.key)} onLongPress={()=>onHold(p.key)}/>)}
      </G>
    </Svg>:<View style={styles.loading}>{error?<Pressable accessibilityRole="button" onPress={()=>setAttempt(value=>value+1)}><Text style={{color:ink}}>{bilingual(props.language,'تعذر فتح الصفحة. إعادة المحاولة','Could not open this page. Retry')}</Text></Pressable>:<ActivityIndicator color={theme.accent}/>}</View>}
    {screenReader&&artwork&&artwork.polygons.map(p=><NativePressable key={p.key} accessibilityRole="button" accessibilityLabel={verses.find(v=>`${v.surah}:${v.number}`===p.key)?.text} onPress={()=>props.loopPickMode?onPress(p.key):onHold(p.key)} onLongPress={()=>onHold(p.key)} style={[{position:'absolute'},verseFocusRect(p,artwork.viewBox,artBox,leafSize)]}/>)}
    <Text pointerEvents="none" style={[styles.pageNumber,{color:ink,fontFamily:'AmiriQuran',fontSize:16}]}>{khatm?`${page===605?'١':'٢'} / ٢`:String(page).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)])}</Text>
  </View>;
}

/** Native vectors share the app process; opening a page never starts Chromium. */
export function MushafPageView(props:Props){
  const latest=useRef(props);latest.current=props;
  const previousPage=useRef(props.page),direction=useRef(1);
  useEffect(()=>{
    if(props.page!==previousPage.current)direction.current=props.page>previousPage.current?1:-1;
    previousPage.current=props.page;
    let alive=true;
    // Visible leaves load first; never mount offscreen vectors to preload them.
    const timer=setTimeout(()=>{void (async()=>{
      for(const page of mushafPreloadLeaves(props.page,props.pageStep===2,direction.current)){
        if(!alive)return;
        try{await preloadMushafPage(MUSHAF_PAGE_ASSETS[page]);}catch{/* Visible leaves own retry UI. */}
      }
    })();},150);
    return()=>{alive=false;clearTimeout(timer);};
  },[props.page,props.pageStep]);
  const [size,setSize]=useState({width:0,height:0}),[selected,setSelected]=useState<string|null>(null);
  const root=useRef<View>(null),origin=useRef({x:0,y:0}),scroll=useRef({x:0,y:0});
  const reduceMotion=useRef(false);
  useEffect(()=>{let alive=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive)reduceMotion.current=value;}).catch(()=>undefined);const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{reduceMotion.current=value;});return()=>{alive=false;subscription.remove();};},[]);
  const geometries=useRef(new Map<number,LeafGeometry>()),timer=useRef<ReturnType<typeof setTimeout>|null>(null),held=useRef(false),start=useRef({x:0,y:0}),translation=useRef(new Animated.ValueXY()).current;
  const zoom=props.zoom??1,theme=props.theme??getQuranTheme('blue'),paper=props.dark?theme.deep:theme.lightPaper;
  const pages=props.pageStep===2&&props.page<MUSHAF_PAGE_COUNT?[props.page,props.page+1]:[props.page];
  const bounds=useRef({size,zoom,pages});bounds.current={size,zoom,pages};
  const onGeometry=useMemo(()=>(value:LeafGeometry)=>{geometries.current.set(value.page,value);for(const n of geometries.current.keys())if(!bounds.current.pages.includes(n))geometries.current.delete(n);},[]);
  const clearHold=()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=null;};
  useEffect(()=>()=>{clearHold();releaseMushafResources();},[]);
  useEffect(()=>{setSelected(null);translation.setValue({x:0,y:0});},[props.page,props.pageStep]);
  const press=(key:string)=>{if(latest.current.loopPickMode)latest.current.onLoopPick?.(key);else latest.current.onTap();};
  const hit=(x:number,y:number)=>{
    const {size,zoom,pages}=bounds.current,w=size.width*zoom/pages.length,h=size.height*zoom;
    const index=pages.length===2?(x>=w?0:1):0,leaf=geometries.current.get(pages[index]);if(!leaf)return null;
    const lx=x-(pages.length===2&&index===0?w:0),opening=leaf.page<=2,khatm=leaf.page>604;
    const left=opening ? .16 : .06,top=opening ? .24 : khatm ? .06 : .09,artHeight=opening ? .52 : khatm ? .88 : .84;
    const [sx,sy]=sourcePoint(lx-w*left,y-h*top,w*(1-2*left),h*artHeight,leaf.viewBox);
    return leaf.polygons.find(p=>pointInVerse(sx,sy,p))?.key??null;
  };
  const hitRef=useRef(hit);hitRef.current=hit;
  const pan=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>bounds.current.zoom<=1,
    onMoveShouldSetPanResponderCapture:(_,g)=>{
      if(bounds.current.zoom<=1)return Math.abs(g.dx)+Math.abs(g.dy)>12;
      // Enlarged pages pan through ScrollView; page turns remain on its outer edges.
      const x=start.current.x-scroll.current.x,width=bounds.current.size.width;
      const edge=(x<24&&scroll.current.x<=1)||(x>width-24&&scroll.current.x>=width*(bounds.current.zoom-1)-1);
      return edge&&Math.abs(g.dx)>35&&Math.abs(g.dx)>Math.abs(g.dy)*1.5;
    },
    onPanResponderGrant:(_,gesture)=>{start.current={x:gesture.x0-origin.current.x+scroll.current.x,y:gesture.y0-origin.current.y+scroll.current.y};held.current=false;const key=hitRef.current(start.current.x,start.current.y);if(key&&!latest.current.loopPickMode)timer.current=setTimeout(()=>{held.current=true;setSelected(key);},500);},
    onPanResponderMove:(_,g)=>{if(Math.abs(g.dx)+Math.abs(g.dy)>10)clearHold();if(bounds.current.zoom<=1)translation.setValue({x:g.dx*.65,y:g.dy*.65});},
    onPanResponderRelease:(_,g)=>{
      clearHold();const vertical=Math.abs(g.dy)>Math.abs(g.dx),distance=vertical?g.dy:g.dx;
      const threshold=Math.max(45,(vertical?bounds.current.size.height:bounds.current.size.width)*.16);
      if(Math.abs(distance)>threshold){const delta=vertical?(distance<0?1:-1):(distance>0?1:-1);const target=mushafPageTurnTarget(latest.current.page,delta,latest.current.pageStep===2);if(target>=1&&target<=LAST_READER_PAGE){setSelected(null);latest.current.onPageSwipe(delta,target);}}
      else if(!held.current&&Math.abs(g.dx)+Math.abs(g.dy)<12){const key=hitRef.current(start.current.x,start.current.y);if(key&&latest.current.loopPickMode)latest.current.onLoopPick?.(key);else latest.current.onTap();}
      if(reduceMotion.current)translation.setValue({x:0,y:0});
      else Animated.spring(translation,{toValue:{x:0,y:0},useNativeDriver:true,overshootClamping:true}).start();
    },
    onPanResponderTerminate:()=>{clearHold();translation.setValue({x:0,y:0});},
  }),[]);
  const menu=[
    [bilingual(props.language,'تشغيل','Play'),props.onPlayVerse],
    [bilingual(props.language,'التفسير','Tafsir'),props.onTafsirVerse],
    [bilingual(props.language,'إشارة مرجعية','Bookmark'),props.onBookmarkVerse],
    [bilingual(props.language,'ابدأ التكرار هنا','Start loop here'),props.onLoopStart],
    [bilingual(props.language,'أنهِ التكرار هنا','End loop here'),props.onLoopEnd],
  ] as const;
  return <View ref={root} testID="mushaf-page" style={[styles.root,{backgroundColor:paper}]} onLayout={e=>{setSize(e.nativeEvent.layout);root.current?.measureInWindow((x,y)=>{origin.current={x,y};});}}>
    <ScrollView horizontal scrollEnabled={zoom>1} bounces={false} showsHorizontalScrollIndicator={false} onScroll={e=>{scroll.current.x=e.nativeEvent.contentOffset.x;}} scrollEventThrottle={32}>
      <ScrollView scrollEnabled={zoom>1} bounces={false} showsVerticalScrollIndicator={false} style={{width:size.width*zoom,height:size.height}} onScroll={e=>{scroll.current.y=e.nativeEvent.contentOffset.y;}} scrollEventThrottle={32}>
        <Animated.View {...pan.panHandlers} onTouchStart={e=>{start.current={x:e.nativeEvent.pageX-origin.current.x+scroll.current.x,y:e.nativeEvent.pageY-origin.current.y+scroll.current.y};}} style={{width:size.width*zoom,height:size.height*zoom,flexDirection:'row-reverse',transform:translation.getTranslateTransform()}}>
          {pages.map(page=><NativeLeaf key={page} page={page} props={props} onGeometry={onGeometry} onHold={setSelected} onPress={press}/>)}
        </Animated.View>
      </ScrollView>
    </ScrollView>
    {selected&&<View style={[styles.menu,{backgroundColor:theme.lightPaper,borderColor:theme.border}]}>
      {menu.filter(([,action])=>action).map(([label,action])=><Pressable key={label} accessibilityRole="button" disabled={action===props.onLoopEnd&&!props.loopStartKey} onPress={()=>{setSelected(null);action?.(selected);}} style={[styles.menuButton,{backgroundColor:theme.pale}]}><Text style={{color:theme.ink,textAlign:'center'}}>{label}</Text></Pressable>)}
      <Pressable accessibilityRole="button" onPress={()=>setSelected(null)} style={styles.menuButton}><Text style={{color:theme.ink}}>{bilingual(props.language,'إغلاق','Close')}</Text></Pressable>
    </View>}
  </View>;
}
const styles=StyleSheet.create({root:{flex:1,minHeight:0,overflow:'hidden',borderRadius:6},leaf:{flex:1,height:'100%',overflow:'hidden'},metadata:{position:'absolute',zIndex:1,top:'2%',left:'6%',right:'6%',flexDirection:'row-reverse',justifyContent:'space-between',gap:8},loading:{flex:1,justifyContent:'center',alignItems:'center'},pageNumber:{position:'absolute',bottom:'2%',left:0,right:0,textAlign:'center'},menu:{position:'absolute',bottom:8,left:8,right:8,padding:8,borderWidth:1,borderRadius:12,flexDirection:'row',flexWrap:'wrap',gap:8},menuButton:{flexGrow:1,flexBasis:'30%',minHeight:48,alignItems:'center',justifyContent:'center',padding:8,borderRadius:8}});
