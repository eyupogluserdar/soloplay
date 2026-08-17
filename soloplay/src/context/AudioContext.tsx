import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import TrackPlayer, { Event, State, useTrackPlayerEvents, RepeatMode } from 'react-native-track-player';
import { usePlayerStore } from '../store/usePlayerStore';
import { setupPlayer } from '../services/TrackPlayerService';

interface AudioContextType {
  playTrack: (uri: string, name: string, playlistId: string, startPositionMillis?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (positionMillis: number) => Promise<void>;
  isPlaying: boolean;
  currentTrackName: string | null;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  currentPlaylistId: string | null;
  currentTrackArtwork: string | null;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackName, setCurrentTrackName] = useState<string | null>(null);
  const [currentTrackArtwork, setCurrentTrackArtwork] = useState<string | null>(null);
  const [currentPlaylistIdState, setCurrentPlaylistIdState] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const updateMemory = usePlayerStore((state) => state.updateMemory);
  const setCurrentPlaylist = usePlayerStore((state) => state.setCurrentPlaylist);
  
  const currentPlaylistIdRef = useRef<string | null>(null);
  const currentTrackUriRef = useRef<string | null>(null);
  
  const isRepeatMode = usePlayerStore(state => state.isRepeatMode);

  useEffect(() => {
    if (isPlayerReady) {
      TrackPlayer.setRepeatMode(isRepeatMode ? RepeatMode.Track : RepeatMode.Queue).catch(console.error);
    }
  }, [isRepeatMode, isPlayerReady]);

  useEffect(() => {
    setupPlayer().then((isSetup) => {
      setIsPlayerReady(isSetup);
    });
  }, []);

  // Use a ref to track interval for saving memory
  const memorySaveInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      memorySaveInterval.current = setInterval(async () => {
        if (currentPlaylistIdRef.current && currentTrackUriRef.current && currentTrackName) {
          const progress = await TrackPlayer.getProgress();
          // Update store position for UI
          usePlayerStore.getState().setPositionMillis(progress.position * 1000);
          usePlayerStore.getState().setDurationMillis(progress.duration * 1000);
          
          // Auto-save memory every ~5 seconds
          if (Math.floor(progress.position) % 5 === 0) {
            updateMemory(
              currentPlaylistIdRef.current,
              currentTrackUriRef.current,
              currentTrackName,
              progress.position * 1000
            );
          }
        }
      }, 1000);
    } else {
      if (memorySaveInterval.current) clearInterval(memorySaveInterval.current);
    }

    return () => {
      if (memorySaveInterval.current) clearInterval(memorySaveInterval.current);
    };
  }, [isPlaying, currentTrackName]);

  useTrackPlayerEvents([Event.PlaybackState, Event.PlaybackActiveTrackChanged, Event.PlaybackError], async (event) => {
    if (event.type === Event.PlaybackError) {
      console.error("TrackPlayer PlaybackError:", event.message, event.code);
    }
    
    if (event.type === Event.PlaybackState) {
      const playing = event.state === State.Playing;
      setIsPlaying(playing);
      usePlayerStore.getState().setIsPlaying(playing);
      
      if (!playing && currentPlaylistIdRef.current && currentTrackUriRef.current && currentTrackName) {
        // Save memory on pause/stop
        const progress = await TrackPlayer.getProgress();
        updateMemory(
          currentPlaylistIdRef.current,
          currentTrackUriRef.current,
          currentTrackName,
          progress.position * 1000
        );
      }
    }
    
    if (event.type === Event.PlaybackActiveTrackChanged) {
      if (event.track) {
        setCurrentTrackName(event.track.title || null);
        setCurrentTrackArtwork(event.track.artwork || null);
        currentTrackUriRef.current = event.track.url;
        
        // Add to global recent tracks
        if (currentPlaylistIdRef.current && event.track.url && event.track.title) {
          usePlayerStore.getState().addRecentTrack(
            currentPlaylistIdRef.current,
            event.track.url,
            event.track.title,
            event.track.artwork
          );
        }
        
        // When track changes automatically, we need to update memory for the new track
        const progress = await TrackPlayer.getProgress();
        usePlayerStore.getState().setPositionMillis(progress.position * 1000);
        usePlayerStore.getState().setDurationMillis(progress.duration * 1000);
      }
    }
  });

  const playTrack = async (uri: string, name: string, playlistId: string, startPositionMillis: number = 0) => {
    if (!isPlayerReady) {
      console.log("Player not ready, attempting setup...");
      const ready = await setupPlayer();
      if (!ready) {
        console.error("playTrack aborted because player failed to setup!");
        return;
      }
      setIsPlayerReady(true);
    }
    
    try {
      currentPlaylistIdRef.current = playlistId;
      currentTrackUriRef.current = uri;
      setCurrentTrackName(name);
      setCurrentPlaylistIdState(playlistId);
      setCurrentPlaylist(playlistId);

      const store = usePlayerStore.getState();
      const playlists = store.playlists;
      const currentPlaylist = playlists.find(p => p.id === playlistId);
      
      if (!currentPlaylist) return;

      // Map tracks for TrackPlayer
      let trackPlayerQueue = currentPlaylist.tracks.map(t => ({
        id: t.uri,
        url: t.uri,
        title: t.name,
        artist: t.artist || 'SoloPlay', // Default artist
        artwork: t.artwork,
      }));

      let trackIndex = trackPlayerQueue.findIndex(t => t.id === uri);

      if (store.isShuffleMode) {
        // Remove the current track from queue, shuffle the rest, and put current track at the beginning
        const currentTrack = trackPlayerQueue[trackIndex];
        const rest = trackPlayerQueue.filter((_, i) => i !== trackIndex);
        rest.sort(() => Math.random() - 0.5);
        trackPlayerQueue = [currentTrack, ...rest];
        trackIndex = 0; // It is now at the beginning
      }

      let rebuildQueue = true;
      try {
        const currentQueue = await TrackPlayer.getQueue();
        // If the queue lengths match and we are playing the same playlist, we likely don't need to rebuild.
        // We can verify by checking a few track IDs to ensure order matches (important for shuffle toggles)
        if (
          currentQueue.length > 0 && 
          currentQueue.length === trackPlayerQueue.length &&
          currentQueue[0]?.id === trackPlayerQueue[0]?.id &&
          currentQueue[currentQueue.length - 1]?.id === trackPlayerQueue[trackPlayerQueue.length - 1]?.id
        ) {
          rebuildQueue = false;
        }
      } catch (e) {}

      if (rebuildQueue) {
        await TrackPlayer.reset();
        
        // Prevent UI freeze by loading only a small chunk initially
        // We add from the clicked track to the end first
        const afterCurrent = trackPlayerQueue.slice(trackIndex);
        
        // Take just the next 5 tracks to make it instantly responsive
        const initialChunk = afterCurrent.slice(0, 5);
        await TrackPlayer.add(initialChunk);
        
        // We skip to 0 because the clicked track is currently at index 0
        await TrackPlayer.skip(0);
        
        // Load the rest of the queue in the background
        setTimeout(async () => {
          try {
            // Add the remaining tracks that come after the initial chunk
            const restAfter = afterCurrent.slice(5);
            if (restAfter.length > 0) {
              await TrackPlayer.add(restAfter);
            }
            
            // Add the tracks that come BEFORE the clicked track, inserted at index 0!
            // This perfectly reconstructs the original array order and pushes the playing track to its correct index (trackIndex).
            const beforeCurrent = trackPlayerQueue.slice(0, trackIndex);
            if (beforeCurrent.length > 0) {
              await TrackPlayer.add(beforeCurrent, 0);
            }
          } catch (e) {
            console.log("Background queue load error", e);
          }
        }, 500);
      } else {
        // If queue is already intact, just skip to it!
        const currentTrackIndex = await TrackPlayer.getCurrentTrack();
        if (currentTrackIndex !== trackIndex) {
          await TrackPlayer.skip(trackIndex);
        }
      }
      
      await TrackPlayer.setRepeatMode(store.isRepeatMode ? RepeatMode.Track : RepeatMode.Queue);
      
      if (startPositionMillis > 0) {
        await TrackPlayer.seekTo(startPositionMillis / 1000);
      }
      
      await TrackPlayer.play();
    } catch (e) {
      console.error("Failed to play track:", e);
    }
  };

  const pause = async () => {
    if (!isPlayerReady) return;
    await TrackPlayer.pause();
  };

  const resume = async () => {
    if (!isPlayerReady) return;
    await TrackPlayer.play();
  };

  const stop = async () => {
    if (!isPlayerReady) return;
    await TrackPlayer.stop();
    setIsPlaying(false);
    setCurrentTrackName(null);
    setCurrentPlaylistIdState(null);
    currentPlaylistIdRef.current = null;
    currentTrackUriRef.current = null;
  };

  const seek = async (positionMillis: number) => {
    if (!isPlayerReady) return;
    await TrackPlayer.seekTo(positionMillis / 1000);
    usePlayerStore.getState().setPositionMillis(positionMillis);
  };

  const playNext = async () => {
    if (!isPlayerReady) return;
    try {
      await TrackPlayer.skipToNext();
    } catch (e) {
      console.log("No next track available, looping to start");
      try { await TrackPlayer.skip(0); } catch (err) {}
    }
  };

  const playPrevious = async () => {
    if (!isPlayerReady) return;
    try {
      await TrackPlayer.skipToPrevious();
    } catch (e) {
      try {
        const queue = await TrackPlayer.getQueue();
        if (queue.length > 0) {
          await TrackPlayer.skip(queue.length - 1);
        }
      } catch (err) {}
    }
  };

  return (
    <AudioContext.Provider
      value={{
        playTrack,
        pause,
        resume,
        stop,
        seek,
        playNext,
        playPrevious,
        isPlaying,
        currentTrackName,
        currentTrackArtwork,
        currentPlaylistId: currentPlaylistIdState
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio must be used within AudioProvider");
  return context;
};
