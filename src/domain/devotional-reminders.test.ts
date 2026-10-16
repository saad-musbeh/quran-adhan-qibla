import assert from 'node:assert/strict';
import test from 'node:test';
import { devotionalSchedule, DEVOTIONAL_NAMESPACE, isDevotionalNotification, normalizeDevotionalPreferences, parseClock, salawatMinutes, prayerNotificationLimit, SALAWAT_PHRASES } from './devotional-reminders.ts';

test('daily time entry accepts Arabic and Persian digits, rejecting impossible times',()=>{
  assert.equal(parseClock('٠٧:٣٠'),450);assert.equal(parseClock('۲۳:۵۹'),1439);
  for(const invalid of ['24:00','12:60','7','12:','12:001','-1:00',null,123])assert.equal(parseClock(invalid),null);
});

test('fresh reminders are off with the reference daytime interval and spoken phrase',()=>{
  const prefs=normalizeDevotionalPreferences(undefined);
  assert.equal(prefs.salawat.enabled,false);assert.equal(prefs.morning.enabled,false);assert.equal(prefs.evening.enabled,false);
  assert.equal(prefs.salawat.mode,'interval');assert.equal(prefs.salawat.style,'spoken');
  assert.equal(prefs.salawat.start,'08:00');assert.equal(prefs.salawat.end,'20:00');assert.equal(prefs.salawat.intervalMinutes,30);assert.equal(prefs.salawat.phrase,'rasul');
  assert.deepEqual(devotionalSchedule(prefs),[]);
});

test('normal sound and interval settings persist while prayer-linked schedules stay experimental',()=>{
  const saved={salawat:{enabled:true,times:['٩:٠٠','09:00','23:59','25:00'],style:'silent',mode:'prayers'},testing:{styles:false,schedules:false}};
  const prefs=normalizeDevotionalPreferences(saved);
  assert.equal(prefs.salawat.style,'silent');assert.equal(prefs.salawat.mode,'interval');
  const times=normalizeDevotionalPreferences({...saved,salawat:{...saved.salawat,mode:'times'}});
  assert.equal(times.salawat.mode,'times');
  assert.deepEqual(salawatMinutes(times.salawat),[540,1439]);
  assert.deepEqual(devotionalSchedule(times),[{kind:'salawat',minute:540},{kind:'salawat',minute:1439}]);
});

test('intervals stay inside the chosen daytime window without truncating an over-capacity schedule',()=>{
  const prefs=normalizeDevotionalPreferences({testing:{schedules:true},salawat:{enabled:true,mode:'interval',start:'09:00',end:'21:00',intervalMinutes:120}});
  assert.deepEqual(salawatMinutes(prefs.salawat),[540,660,780,900,1020,1140,1260]);
  assert.deepEqual(salawatMinutes({...prefs.salawat,start:'23:00',end:'09:00'}),[]);
  assert.deepEqual(salawatMinutes({...prefs.salawat,start:'00:00',end:'23:00',intervalMinutes:20}),[]);
});

test('prayer-linked tests reserve notification capacity and retain morning/evening daily reminders',()=>{
  const prefs=normalizeDevotionalPreferences({testing:{schedules:true},salawat:{enabled:true,mode:'prayers'},morning:{enabled:true,time:'07:30'},evening:{enabled:true,time:'18:30'}});
  const prayers=Array.from({length:40},(_,i)=>({at:new Date(2026,9,16,12+i),prayer:'dhuhr' as const}));
  const alerts=devotionalSchedule(prefs,prayers.reverse());
  assert.equal(alerts.length,18);assert.deepEqual(alerts.slice(0,2),[{kind:'morning',minute:450},{kind:'evening',minute:1110}]);
  assert.ok('at'in alerts[2]);assert.equal(alerts[2].at.getTime(),new Date(2026,9,16,12).getTime());
  assert.equal(devotionalSchedule(prefs,[]).length,2);
});

test('devotional ownership never includes prayer alerts or other applications',()=>{
  assert.equal(isDevotionalNotification({content:{data:{namespace:DEVOTIONAL_NAMESPACE}}}),true);
  assert.equal(isDevotionalNotification({content:{data:{namespace:'quran-adhan-qibla.prayer.v1'}}}),false);
  assert.equal(isDevotionalNotification({}),false);
});

test('the reference 8 AM to 8 PM schedule includes both boundaries and supports 20 and 30 minutes',()=>{
  const prefs=normalizeDevotionalPreferences({salawat:{enabled:true}});
  for(const intervalMinutes of [20,30]){
    const minutes=salawatMinutes({...prefs.salawat,intervalMinutes});
    assert.equal(minutes[0],480);assert.equal(minutes.at(-1),1200);
    assert.equal(minutes.length,720/intervalMinutes+1);
    assert.ok(minutes.every((minute,index)=>index===0||minute-minutes[index-1]===intervalMinutes));
  }
  assert.deepEqual(salawatMinutes({...prefs.salawat,intervalMinutes:0}),[]);
});

test('shorter windows preserve a full iOS budget for Adhan; dense windows reserve the next prayers and two tests',()=>{
  for(const intervalMinutes of [20,30,60,120,180]){
    for(const enabled of [false,true]){
      const prefs=normalizeDevotionalPreferences({salawat:{enabled,intervalMinutes,start:'00:00',end:'23:30'},morning:{enabled:true},evening:{enabled:true}});
      const daily=devotionalSchedule(prefs).length;
      assert.ok(daily+prayerNotificationLimit(prefs)+2<=64);
      assert.ok(prayerNotificationLimit(prefs)>=12);
      if(intervalMinutes>=120)assert.equal(prayerNotificationLimit(prefs),40);
    }
  }
  const dense=normalizeDevotionalPreferences({salawat:{enabled:true,start:'00:00',end:'23:30',intervalMinutes:30},morning:{enabled:true},evening:{enabled:true}});
  assert.equal(salawatMinutes(dense.salawat).length,48);assert.equal(prayerNotificationLimit(dense),12);
  const defaultWindow=normalizeDevotionalPreferences({salawat:{enabled:true}});
  assert.equal(devotionalSchedule(defaultWindow).length,25);assert.equal(prayerNotificationLimit(defaultWindow),37);
});

test('phrase choices survive saving; old preferences retain chosen times and get the default phrase',()=>{
  for(const phrase of SALAWAT_PHRASES){
    const prefs=normalizeDevotionalPreferences({salawat:{phrase:phrase.id,mode:'interval',style:'silent'},testing:{schedules:false,styles:false}});
    assert.equal(prefs.salawat.phrase,phrase.id);assert.equal(prefs.salawat.mode,'interval');assert.equal(prefs.salawat.style,'silent');
    assert.deepEqual(normalizeDevotionalPreferences(JSON.parse(JSON.stringify(prefs))),prefs);
  }
  const old=normalizeDevotionalPreferences({salawat:{enabled:true,mode:'times',times:['10:30']}});
  assert.equal(old.salawat.phrase,'rasul');assert.equal(old.salawat.mode,'times');assert.deepEqual(salawatMinutes(old.salawat),[630]);
  assert.equal(normalizeDevotionalPreferences({salawat:{phrase:'unknown'}}).salawat.phrase,'rasul');
});
