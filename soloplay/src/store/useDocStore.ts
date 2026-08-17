import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DocCategory {
  id: string;
  name: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  type: 'ocr';
  imageUri?: string;
  categoryId?: string;
}

interface DocStore {
  documents: Document[];
  categories: DocCategory[];
  addDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  getRecentDocuments: (limit: number) => Document[];
  addCategory: (name: string) => string;
  deleteCategory: (id: string) => void;
  renameCategory: (id: string, newName: string) => void;
}

export const useDocStore = create<DocStore>()(
  persist(
    (set, get) => ({
      documents: [],
      categories: [],
      addDocument: (doc) => {
        const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        const now = Date.now();
        const newDoc: Document = {
          ...doc,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          documents: [newDoc, ...state.documents],
        }));
        return id;
      },
      updateDocument: (id, updates) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id ? { ...doc, ...updates, updatedAt: Date.now() } : doc
          ),
        }));
      },
      deleteDocument: (id) => {
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== id),
        }));
      },
      getRecentDocuments: (limit) => {
        const docs = [...get().documents];
        docs.sort((a, b) => b.updatedAt - a.updatedAt);
        return docs.slice(0, limit);
      },
      addCategory: (name) => {
        const id = Math.random().toString(36).substr(2, 9);
        set((state) => ({
          categories: [...state.categories, { id, name }]
        }));
        return id;
      },
      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
          // Optionally, unassign documents from this category
          documents: state.documents.map(doc => doc.categoryId === id ? { ...doc, categoryId: undefined } : doc)
        }));
      },
      renameCategory: (id, newName) => {
        set((state) => ({
          categories: state.categories.map((cat) => cat.id === id ? { ...cat, name: newName } : cat)
        }));
      },
    }),
    {
      name: 'soloplay-doc-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
