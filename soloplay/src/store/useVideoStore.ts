import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VideoItem {
  id: string;
  title: string;
  uri: string;
  thumbnail?: string;
  duration?: string;
  author?: string;
  addedAt: number;
}

export interface VideoCategory {
  id: string;
  name: string;
  videos: VideoItem[];
}

export interface ActiveVideoDownload {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  progress?: number;
}

interface VideoState {
  categories: VideoCategory[];
  activeDownloads: Record<string, ActiveVideoDownload>;
  activeVideo: VideoItem | null;
  
  // Actions
  setActiveVideo: (video: VideoItem | null) => void;
  addCategory: (name: string) => string;
  removeCategory: (id: string) => void;
  addVideoToCategory: (categoryId: string, video: VideoItem) => void;
  removeVideoFromCategory: (categoryId: string, videoId: string) => void;
  
  addActiveDownload: (download: ActiveVideoDownload) => void;
  updateActiveDownloadProgress: (id: string, progress: number) => void;
  removeActiveDownload: (id: string) => void;

  loadInitialState: () => Promise<void>;
}

const STORAGE_KEY = '@soloplay_videos';

export const useVideoStore = create<VideoState>((set, get) => ({
  categories: [],
  activeDownloads: {},
  activeVideo: null,

  setActiveVideo: (video) => set({ activeVideo: video }),

  addCategory: (name: string) => {
    const newId = 'vid_cat_' + Date.now();
    set((state) => {
      const newState = { categories: [...state.categories, { id: newId, name, videos: [] }] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
    return newId;
  },

  removeCategory: (id: string) => {
    set((state) => {
      const newCategories = state.categories.filter(c => c.id !== id);
      const newState = { categories: newCategories };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  },

  addVideoToCategory: (categoryId: string, video: VideoItem) => {
    set((state) => {
      let updatedCategories = state.categories.map(c => 
        c.id === categoryId ? { ...c, videos: [...c.videos, video] } : c
      );
      
      if (!updatedCategories.find(c => c.id === categoryId)) {
        updatedCategories.push({
          id: categoryId,
          name: 'İndirilen Videolar',
          videos: [video]
        });
      }
      
      const newState = { categories: updatedCategories };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  },

  removeVideoFromCategory: (categoryId: string, videoId: string) => {
    set((state) => {
      const newCategories = state.categories.map(c => 
        c.id === categoryId ? { ...c, videos: c.videos.filter(v => v.id !== videoId) } : c
      );
      const newState = { categories: newCategories };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
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

  loadInitialState: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({ categories: parsed.categories || [] });
      } else {
        const defaultId = 'vid_cat_default';
        set({ categories: [{ id: defaultId, name: 'İndirilen Videolar', videos: [] }] });
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: [{ id: defaultId, name: 'İndirilen Videolar', videos: [] }] }));
      }
    } catch (e) {
      console.error("Failed to load videos:", e);
    }
  }
}));
