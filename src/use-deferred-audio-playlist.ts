import {useCallback,useEffect,useRef,useState} from 'react';
import type {AudioPlaylist,AudioPlaylistStatus} from 'expo-audio';

export const EMPTY_PLAYLIST_STATUS:AudioPlaylistStatus={id:'idle',currentIndex:0,trackCount:0,currentTime:0,duration:0,playing:false,isBuffering:false,isLoaded:false,playbackRate:1,muted:false,volume:1,loop:'none',didJustFinish:false};
type PlaylistResource=Pick<AudioPlaylist,'currentStatus'|'addListener'|'release'>;
/** Opening menus and reading never create a decoder, playback thread or native queue. */
export function useDeferredAudioPlaylist<T extends PlaylistResource>(factory:()=>T){
  const create=useRef(factory);create.current=factory;
  const current=useRef<T|null>(null);
  const [playlist,setPlaylist]=useState<T|null>(null),[playerStatus,setStatus]=useState(EMPTY_PLAYLIST_STATUS);
  const ensurePlaylist=useCallback(()=>{
    if(!current.current){current.current=create.current();setPlaylist(current.current);setStatus(current.current.currentStatus);}
    return current.current;
  },[]);
  const releasePlaylist=useCallback(()=>{
    const previous=current.current;current.current=null;setPlaylist(null);setStatus(EMPTY_PLAYLIST_STATUS);previous?.release();
  },[]);
  const peekPlaylist=useCallback(()=>current.current,[]);
  useEffect(()=>{
    if(!playlist)return;
    setStatus(playlist.currentStatus);
    const subscription=playlist.addListener('playlistStatusUpdate',setStatus);
    return()=>subscription.remove();
  },[playlist]);
  useEffect(()=>()=>{current.current?.release();current.current=null;},[]);
  return {playlist,playerStatus,ensurePlaylist,releasePlaylist,peekPlaylist};
}
