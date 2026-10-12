import { View } from 'react-native';

/** Four staggered lines and dots, matching the supplied range-control symbol. */
export function VerseRangeIcon({ size = 24, color = '#18334A' }: { size?: number; color?: string }) {
  const dot = size * .16, thickness = size * .1;
  const rows = [
    {dot:0,lines:[[.2,.8]]},
    {dot:.44,lines:[[0,.38],[.64,.36]]},
    {dot:.84,lines:[[0,.78]]},
    {dot:0,lines:[[.2,.8]]},
  ];
  return <View accessible={false} style={{width:size,height:size}}>
    {rows.map((row,index)=><View key={index} style={{position:'absolute',top:index*size*.25,width:size,height:dot}}>
      <View style={{position:'absolute',left:row.dot*size,width:dot,height:dot,borderRadius:dot/2,backgroundColor:color}}/>
      {row.lines.map(([left,width],line)=><View key={line} style={{position:'absolute',left:left*size,top:(dot-thickness)/2,width:width*size,height:thickness,borderRadius:thickness/2,backgroundColor:color}}/>)}
    </View>)}
  </View>;
}
