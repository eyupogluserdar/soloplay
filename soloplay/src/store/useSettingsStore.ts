import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  safDirectoryUri: string | null;
  hasAskedSafPermission: boolean;
  setSafDirectoryUri: (uri: string | null) => void;
  setHasAskedSafPermission: (asked: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      safDirectoryUri: null,
      hasAskedSafPermission: false,
      setSafDirectoryUri: (uri) => set({ safDirectoryUri: uri }),
      setHasAskedSafPermission: (asked) => set({ hasAskedSafPermission: asked }),
    }),
    {
      name: 'soloplay-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
