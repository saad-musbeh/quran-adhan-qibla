import { Pressable } from './Pressable';
import { Text } from '../text-size';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { bilingual, isRTL, translations, type Language } from '../i18n';
import type { Tab } from '../domain/navigation';
import { useReaderStyles } from '../quran-theme-context';

export function MainMenu({language,onChoose,onLocation,onSettings}: {
  language:Language;onChoose:(tab:Tab)=>void;onLocation:()=>void;onSettings:()=>void;
}) {
  const {colors,styles}=useReaderStyles(baseStyles),rtl=isRTL(language),t=translations[language];
  const window=useWindowDimensions();
  const [width,setWidth]=useState(window.width);
  const columns=width>=720?3:width>=520?2:1;
  const cardWidth=(Math.min(width,1100)-48-(columns-1)*16)/columns;
  const sections: {id:Tab;title:string;icon:React.ComponentProps<typeof Ionicons>['name']}[]=[
    {id:'quran',title:t.quran,icon:'book-outline'},
    {id:'adhan',title:t.adhan,icon:'time-outline'},
    {id:'qibla',title:t.qibla,icon:'compass-outline'},
  ];
  return <ScrollView testID="main-menu" onLayout={event=>setWidth(event.nativeEvent.layout.width)} contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={[styles.title,rtl&&styles.rtl]}>{bilingual(language,'القائمة الرئيسية','Main menu')}</Text>
    <View style={[styles.grid,rtl&&styles.reverse]}>{sections.map(section=><Pressable key={section.id} testID={`menu-${section.id}`} accessibilityRole="button" accessibilityLabel={section.title} onPress={()=>onChoose(section.id)} style={[styles.card,{width:Math.max(160,cardWidth)}]}>
      <View style={styles.cardFrame}><Ionicons name={section.icon} size={44} color={colors.accent}/><Text style={styles.cardTitle}>{section.title}</Text></View>
    </Pressable>)}</View>
    <View style={[styles.actions,rtl&&styles.reverse]}>
      <Pressable accessibilityRole="button" onPress={onLocation} style={styles.action}><Ionicons name="location-outline" size={22} color={colors.accent}/><Text style={styles.actionText}>{t.locationTitle}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onSettings} style={styles.action}><Ionicons name="settings-outline" size={22} color={colors.accent}/><Text style={styles.actionText}>{t.settings}</Text></Pressable>
    </View>
  </ScrollView>;
}
const baseStyles=StyleSheet.create({
  content:{flexGrow:1,width:'100%',maxWidth:1100,alignSelf:'center',padding:24,gap:24,justifyContent:'center'},
  title:{fontSize:28,fontWeight:'700',color:'#FAF7EF',textAlign:'center'},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:16},reverse:{flexDirection:'row-reverse'},
  card:{minHeight:190,padding:12,borderRadius:22,borderWidth:1,borderColor:'#DBAB68',backgroundColor:'#15342E'},
  cardFrame:{flex:1,minHeight:164,padding:18,gap:12,alignItems:'center',justifyContent:'center',borderRadius:14,borderWidth:1,borderColor:'#DBAB68'},
  cardTitle:{fontSize:24,fontWeight:'700',color:'#FAF7EF',textAlign:'center'},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:12,justifyContent:'center'},action:{minHeight:48,paddingHorizontal:18,paddingVertical:10,gap:8,flexDirection:'row',alignItems:'center',borderRadius:14,borderWidth:1,borderColor:'#DBAB68'},actionText:{fontSize:15,color:'#FAF7EF'},rtl:{writingDirection:'rtl'},
});
