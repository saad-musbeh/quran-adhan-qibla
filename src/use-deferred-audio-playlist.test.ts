import assert from 'node:assert/strict';
import test from 'node:test';
import type {AudioPlaylist,AudioPlaylistStatus} from 'expo-audio';
import {HookHarness} from './test-support/react-hooks.ts';
import {EMPTY_PLAYLIST_STATUS,useDeferredAudioPlaylist} from './use-deferred-audio-playlist.ts';

test('reading and settings allocate no player; first playback creates one and stop releases it',async()=>{
  let created=0,released=0,removed=0;
  let publish:((status:AudioPlaylistStatus)=>void)|undefined;
  const create=()=>{
    created++;
    return {currentStatus:{...EMPTY_PLAYLIST_STATUS,id:`player-${created}`},addListener:(_event:string,listener:(status:AudioPlaylistStatus)=>void)=>{publish=listener;return {remove:()=>{removed++;publish=undefined;}};},release:()=>{released++;}} as unknown as AudioPlaylist;
  };
  let result!:ReturnType<typeof useDeferredAudioPlaylist<AudioPlaylist>>;
  const harness=new HookHarness(()=>{result=useDeferredAudioPlaylist(create);});
  await harness.mount();await harness.render();assert.equal(created,0);assert.equal(result.playlist,null);
  await harness.change(()=>{assert.equal(result.ensurePlaylist(),result.ensurePlaylist());});
  assert.equal(created,1);assert.ok(result.playlist);
  await harness.change(()=>publish?.({...EMPTY_PLAYLIST_STATUS,id:'player-1',trackCount:1,currentTime:12,playing:true}));
  assert.equal(result.playerStatus.currentTime,12);assert.equal(result.playerStatus.playing,true);
  await harness.change(()=>result.releasePlaylist());assert.equal(released,1);assert.equal(removed,1);assert.equal(result.playlist,null);assert.equal(result.playerStatus.playing,false);
  await harness.change(()=>result.ensurePlaylist());assert.equal(created,2,'playback can restart after Stop');
  await harness.unmount();assert.equal(released,2);assert.equal(removed,2);
});
