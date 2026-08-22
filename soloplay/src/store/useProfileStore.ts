import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileState {
  isProfileComplete: boolean;
  userName: string;
  userAge: string;
  reportStrengths: string;
  reportImprovements: string;
  aiComment: string;
  
  completeProfile: (
    name: string, 
    age: string, 
    strengths: string, 
    improvements: string, 
    comment: string
  ) => void;
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      isProfileComplete: false,
      userName: '',
      userAge: '',
      reportStrengths: '',
      reportImprovements: '',
      aiComment: '',
      
      completeProfile: (name, age, strengths, improvements, comment) => set({
        isProfileComplete: true,
        userName: name,
        userAge: age,
        reportStrengths: strengths,
        reportImprovements: improvements,
        aiComment: comment
      }),
      
      resetProfile: () => set({
        isProfileComplete: false,
        userName: '',
        userAge: '',
        reportStrengths: '',
        reportImprovements: '',
        aiComment: ''
      })
    }),
    {
      name: 'soloplay-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
