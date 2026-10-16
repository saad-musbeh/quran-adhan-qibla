import assert from 'node:assert/strict';
import test from 'node:test';
import { devotionalSchedule, DEVOTIONAL_NAMESPACE, isDevotionalNotification, normalizeDevotionalPreferences, parseClock, salawatMinutes } from './devotional-reminders.ts';

test('daily time entry accepts Arabic and Persian digits, rejecting impossible times',()=>{
  assert.equal(parseClock('٠٧:٣٠'),450);assert.equal(parseClock('۲۳:۵۹'),1439);
  for(const invalid of ['24:00','12:60','7','12:','12:001','-1:00',null,123])assert.equal(parseClock(invalid),null);
});

test('fresh reminders are off, use chosen times, and speak by default',()=>{
  const prefs=normalizeDevotionalPreferences(undefined);
  assert.equal(prefs.salawat.enabled,false);assert.equal(prefs.morning.enabled,false);assert.equal(prefs.evening.enabled,false);
  assert.equal(prefs.salawat.mode,'times');assert.equal(prefs.salawat.style,'spoken');
  assert.deepEqual(devotionalSchedule(prefs),[]);
});

test('hidden testing options cannot leave a silent style or experimental schedule active',()=>{
  const saved={salawat:{enabled:true,times:['٩:٠٠','09:00','23:59','25:00'],style:'silent',mode:'prayers'},testing:{styles:false,schedules:false}};
  const prefs=normalizeDevotionalPreferences(saved);
  assert.equal(prefs.salawat.style,'spoken');assert.equal(prefs.salawat.mode,'times');
  assert.deepEqual(salawatMinutes(prefs.salawat),[540,1439]);
  assert.deepEqual(devotionalSchedule(prefs),[{kind:'salawat',minute:540},{kind:'salawat',minute:1439}]);
});

test('intervals stay inside the chosen daytime window without truncating an over-capacity schedule',()=>{
  const prefs=normalizeDevotionalPreferences({testing:{schedules:true},salawat:{enabled:true,mode:'interval',start:'09:00',end:'21:00',intervalMinutes:120}});
  assert.deepEqual(salawatMinutes(prefs.salawat),[540,660,780,900,1020,1140,1260]);
  assert.deepEqual(salawatMinutes({...prefs.salawat,start:'23:00',end:'09:00'}),[]);
  assert.deepEqual(salawatMinutes({...prefs.salawat,start:'00:00',end:'23:00',intervalMinutes:60}),[]);
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
