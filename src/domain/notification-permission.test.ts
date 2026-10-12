import assert from 'node:assert/strict';
import test from 'node:test';
import { allowsPrayerNotifications, prayerSoundMuted } from './notification-permission.ts';

test('iOS permissions use granular authorization and identify quiet alerts', () => {
  assert.equal(allowsPrayerNotifications({status:'granted',ios:{status:1}},'ios'),false);
  assert.equal(allowsPrayerNotifications({status:'undetermined',ios:{status:2}},'ios'),true);
  assert.equal(allowsPrayerNotifications({status:'undetermined',ios:{status:3}},'ios'),true);
  assert.equal(prayerSoundMuted({status:'granted',ios:{status:3}},'ios',true),true);
  assert.equal(prayerSoundMuted({status:'granted',ios:{status:2,allowsSound:false}},'ios',true),true);
  assert.equal(prayerSoundMuted({status:'granted',ios:{status:2,allowsSound:false}},'ios',false),false);
  assert.equal(allowsPrayerNotifications({status:'granted'},'android'),true);
  assert.equal(allowsPrayerNotifications({status:'denied'},'android'),false);
});
