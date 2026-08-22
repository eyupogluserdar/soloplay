import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileState {
  isProfileComplete: boolean;
  userName: string;
  userAge: string;
  birthDate: string;
  zodiacSign: string;
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
  updateDetailedProfile: (birthDate: string, zodiacSign: string, hobbies: string) => void;
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      isProfileComplete: false,
      userName: '',
      userAge: '',
      birthDate: '',
      zodiacSign: '',
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

      updateDetailedProfile: (birthDate, zodiacSign, hobbies) => set((state) => ({
        birthDate,
        zodiacSign,
        reportStrengths: hobbies // we can reuse reportStrengths for hobbies to avoid breaking existing UI, or just append it
      })),
      
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
