import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PlaybackMemory {
  trackUri: string;
  trackName: string;
  positionMillis: number;
  timestamp: number;
}

export interface Track {
  uri: string;
  name: string;
  durationMillis?: number;
  id?: string;
  artist?: string;
  artwork?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  category?: string;
}


export interface RecentTrack {
  trackUri: string;
  trackName: string;
  playlistId: string;
  artwork?: string;
  timestamp: number;
  playCount: number;
}

export interface ActiveDownload {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  progress?: number;
}

interface PlayerState {
  playlists: Playlist[];
  currentPlaylistId: string | null;
  memory: Record<string, PlaybackMemory>; // Keyed by Playlist ID
  recentTracks: RecentTrack[];
  
  // Actions
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  renamePlaylist: (id: string, newName: string) => void;
  addTrack: (playlistId: string, track: Track) => void;
  removeTrack: (playlistId: string, trackUri: string) => void;
  updateMemory: (playlistId: string, trackUri: string, trackName: string, positionMillis: number, timestamp?: number) => void;
  removeMemory: (playlistId: string) => void;
  addRecentTrack: (playlistId: string, trackUri: string, trackName: string, artwork?: string) => void;
  removeRecentTrack: (trackUri: string) => void;
  updateTrackDuration: (playlistId: string, trackUri: string, durationMillis: number) => void;
  setCurrentPlaylist: (playlistId: string | null) => void;
  loadInitialState: () => Promise<void>;

  // Download state
  activeDownloads: Record<string, ActiveDownload>;
  addActiveDownload: (download: ActiveDownload) => void;
  updateActiveDownloadProgress: (id: string, progress: number) => void;
  removeActiveDownload: (id: string) => void;

  // Playback state (frequent updates)
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  isShuffleMode: boolean;
  isRepeatMode: boolean;
  isMicro: boolean; // Küçültülmüş player durumu
  hasCheckedRecovery: boolean; // Akıllı Veri Kurtarma kontrol edildi mi?
  setIsPlaying: (isPlaying: boolean) => void;
  setPositionMillis: (positionMillis: number) => void;
  setDurationMillis: (durationMillis: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setIsMicro: (isMicro: boolean) => void;
  setHasCheckedRecovery: (val: boolean) => void;
}

const STORAGE_KEY = '@soloplay_memory';

export const usePlayerStore = create<PlayerState>((set, get) => ({
  playlists: [],
  currentPlaylistId: null,
  memory: {},
  recentTracks: [],
  activeDownloads: {},
  
  isPlaying: false,
  positionMillis: 0,
  durationMillis: 0,
  isShuffleMode: false,
  isRepeatMode: false,
  isMicro: false,
  hasCheckedRecovery: false,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPositionMillis: (positionMillis) => set({ positionMillis }),
  setDurationMillis: (durationMillis) => set({ durationMillis }),
  setIsMicro: (isMicro) => set({ isMicro }),
  setHasCheckedRecovery: (val) => {
    set({ hasCheckedRecovery: val });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), hasCheckedRecovery: val }));
  },
  addActiveDownload: (download) => set(state => ({ activeDownloads: { ...state.activeDownloads, [download.id]: download } })),
  updateActiveDownloadProgress: (id: string, progress: number) => set(state => {
    if (!state.activeDownloads[id]) return state;
    return {
      activeDownloads: {
        ...state.activeDownloads,
        [id]: { ...state.activeDownloads[id], progress }
      }
    };
  }),
  removeActiveDownload: (id: string) => set(state => {
    const newDownloads = { ...state.activeDownloads };
    delete newDownloads[id];
    return { activeDownloads: newDownloads };
  }),
  toggleShuffle: () => {
    const newState = !get().isShuffleMode;
    set({ isShuffleMode: newState });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), isShuffleMode: newState }));
  },
  toggleRepeat: () => {
    const newState = !get().isRepeatMode;
    set({ isRepeatMode: newState });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), isRepeatMode: newState }));
  },

  addPlaylist: (playlist) => {
    set((state) => {
      const exists = state.playlists.some(p => p.id === playlist.id);
      if (exists) return state;
      const newState = { playlists: [...state.playlists, playlist] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
      return newState;
    });
  },

  removePlaylist: (id) => {
    set((state) => {
      const newPlaylists = state.playlists.filter(p => p.id !== id);
      const newMemory = { ...state.memory };
      delete newMemory[id];
      const newState = { playlists: newPlaylists, memory: newMemory };
      
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
      return newState;
    });
  },

  renamePlaylist: (id, newName) => {
    set((state) => {
      const newPlaylists = state.playlists.map(p => 
        p.id === id ? { ...p, name: newName } : p
      );
      const newState = { playlists: newPlaylists };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
      return newState;
    });
  },

  addTrack: (playlistId, track) => {
    set((state) => {
      const newPlaylists = state.playlists.map(p => 
        p.id === playlistId ? { ...p, tracks: [...p.tracks, track] } : p
      );
      const newState = { playlists: newPlaylists };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
      return newState;
    });
  },

  removeTrack: (playlistId, trackUri) => {
    set((state) => {
      const newPlaylists = state.playlists.map(p => 
        p.id === playlistId ? { ...p, tracks: p.tracks.filter(t => t.uri !== trackUri) } : p
      );
      
      const newRecentTracks = (state.recentTracks || []).filter(t => t.trackUri !== trackUri);
      
      const newState = { playlists: newPlaylists, recentTracks: newRecentTracks };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
      return newState;
    });
  },

  removeMemory: (playlistId) => {
    set((state) => {
      const newMemory = { ...state.memory };
      delete newMemory[playlistId];
      const newState = { memory: newMemory };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
      return newState;
    });
  },

  setCurrentPlaylist: (id) => {
    set({ currentPlaylistId: id });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), currentPlaylistId: id }));
  },

  updateMemory: (playlistId, trackUri, trackName, positionMillis, timestamp = Date.now()) => {
    set((state) => {
      const newState = {
        memory: {
          ...state.memory,
          [playlistId]: { trackUri, trackName, positionMillis, timestamp }
        }
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
      return newState;
    });
  },

  addRecentTrack: (playlistId, trackUri, trackName, artwork) => {
    set((state) => {
      const existingIdx = state.recentTracks.findIndex(t => t.trackUri === trackUri);
      let newRecent = [...state.recentTracks];
      const now = Date.now();
      
      if (existingIdx >= 0) {
        newRecent[existingIdx] = {
          ...newRecent[existingIdx],
          timestamp: now,
          playCount: newRecent[existingIdx].playCount + 1,
          artwork: artwork || newRecent[existingIdx].artwork
        };
      } else {
        newRecent.push({
          trackUri,
          trackName,
          playlistId,
          artwork,
          timestamp: now,
          playCount: 1
        });
      }
      
      // Sort: Every play acts like an extra 24 hours of recency.
      newRecent.sort((a, b) => {
        const scoreA = a.timestamp + (a.playCount * 86400000);
        const scoreB = b.timestamp + (b.playCount * 86400000);
        return scoreB - scoreA;
      });
      
      // Limit to 20
      if (newRecent.length > 20) {
        newRecent = newRecent.slice(0, 20);
      }
      
      const newState = { recentTracks: newRecent };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
      return newState;
    });
  },

  removeRecentTrack: (trackUri) => {
    set((state) => {
      const newRecent = state.recentTracks.filter(t => t.trackUri !== trackUri);
      const newState = { recentTracks: newRecent };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
      return newState;
    });
  },

  updateTrackDuration: (playlistId, trackUri, durationMillis) => {
    set((state) => {
      const newPlaylists = state.playlists.map(p => {
        if (p.id === playlistId) {
          return {
            ...p,
            tracks: p.tracks.map(t => t.uri === trackUri ? { ...t, durationMillis } : t)
          };
        }
        return p;
      });
      const newState = { playlists: newPlaylists };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...newState }));
      return newState;
    });
  },

  loadInitialState: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          playlists: parsed.playlists || [],
          currentPlaylistId: parsed.currentPlaylistId || null,
          memory: parsed.memory || {},
          recentTracks: parsed.recentTracks || [],
          isShuffleMode: parsed.isShuffleMode || false,
          isRepeatMode: parsed.isRepeatMode || false,
          hasCheckedRecovery: parsed.hasCheckedRecovery || false,
        });
      }
    } catch (e) {
      console.error("Failed to load memory:", e);
    }
  }
}));
