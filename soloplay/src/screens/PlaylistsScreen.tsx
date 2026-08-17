import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAudio } from '../context/AudioContext';
import { MiniPlayer } from '../components/MiniPlayer';
import { AnimatedRing } from '../components/AnimatedRing';
import { colors, typography } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

export const PlaylistsScreen = ({ onSelectPlaylist, onOpenPlayer, onBack }: { 
  onSelectPlaylist: (id: string, name: string, uri: string) => void;
  onOpenPlayer: (playlistId: string, playlistName: string) => void;
  onBack: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const activePlaylistIdFromStore = usePlayerStore(state => state.currentPlaylistId);
  const { currentPlaylistId: activePlaylistIdFromAudio, isPlaying, currentTrackName, pause, resume, seek, playNext, playPrevious } = useAudio();
  const playlists = usePlayerStore(state => state.playlists);
  const addPlaylist = usePlayerStore(state => state.addPlaylist);
  const removePlaylist = usePlayerStore(state => state.removePlaylist);
  const renamePlaylist = usePlayerStore(state => state.renamePlaylist);

  const activePlaylistId = activePlaylistIdFromAudio || activePlaylistIdFromStore;
  const loadInitialState = usePlayerStore(state => state.loadInitialState);
  const [isPicking, setIsPicking] = useState(false);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    loadInitialState();
  }, []);

  const handlePickFiles = async () => {
    setIsPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const tracks = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name || 'Bilinmeyen Parça'
        }));
        
        const newId = Date.now().toString();
        const newName = `Çalma Listesi ${playlists.length + 1}`;
        
        addPlaylist({
          id: newId,
          name: newName,
          tracks: tracks
        });


      }
    } catch (err) {
      console.log('User cancelled or error:', err);
    } finally {
      setIsPicking(false);
    }
  };

  const openRenameModal = (id: string, currentName: string) => {
    setEditingPlaylistId(id);
    setEditingName(currentName);
  };

  const saveRename = () => {
    if (editingPlaylistId && editingName.trim()) {
      renamePlaylist(editingPlaylistId, editingName.trim());
    }
    setEditingPlaylistId(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={{ padding: 10, marginLeft: -10 }}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={typography.header}>Çalma Listeleri</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handlePickFiles} disabled={isPicking}>
        {isPicking ? (
           <ActivityIndicator color={colors.background} />
        ) : (
           <>
             <Ionicons name="add-circle" size={24} color={colors.background} />
             <Text style={styles.addButtonText}>Müzik Dosyalarını Seç</Text>
           </>
        )}
      </TouchableOpacity>
      <Text style={styles.subtext}>Seçtiğiniz dosyalar yeni bir çalma listesi olarak kaydedilir.</Text>

      <Text style={[typography.title, { marginTop: 30, marginBottom: 15 }]}>Çalma Listelerim</Text>

      {playlists.length === 0 ? (
        <Text style={styles.emptyText}>Henüz çalma listesi oluşturmadınız.</Text>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: Math.max(100, insets.bottom + 90) }}
          renderItem={({ item }) => {
            const isActive = item.id === activePlaylistId;
            const isPlayingThis = item.id === activePlaylistIdFromAudio && isPlaying;
            return (
            <TouchableOpacity 
              style={[styles.playlistCard, isActive && styles.activePlaylistCard]} 
              onPress={() => onSelectPlaylist(item.id, item.name, item.id)}
            >
              <AnimatedRing size={36} isPlaying={isPlayingThis}>
                <Ionicons name={isActive ? "play-circle" : "musical-notes"} size={24} color={isActive ? colors.primary : colors.textSecondary} />
              </AnimatedRing>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, isActive && { color: colors.primary }]}>{item.name}</Text>
                <Text style={styles.cardCount}>{item.tracks.length} Parça</Text>
              </View>
              <TouchableOpacity onPress={() => openRenameModal(item.id, item.name)} style={{ padding: 10 }}>
                <Ionicons name="pencil" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removePlaylist(item.id)} style={{ padding: 10, marginRight: -10 }}>
                <Ionicons name="trash-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}}
        />
      )}

      {activePlaylistIdFromAudio && currentTrackName && (
        <MiniPlayer 
          safeAreaBottom={insets.bottom}
          onPress={() => {
            const p = playlists.find(p => p.id === activePlaylistIdFromAudio);
            if (p) onOpenPlayer(p.id, p.name);
          }}
        />
      )}

      <Modal
        visible={!!editingPlaylistId}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingPlaylistId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Listeyi Yeniden Adlandır</Text>
            <TextInput
              style={styles.modalInput}
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Yeni İsim"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setEditingPlaylistId(null)}>
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={saveRename}>
                <Text style={[styles.modalButtonText, { color: colors.background }]}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  miniPlayerProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    ...typography.title,
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  addButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  playlistCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  activePlaylistCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 15,
  },
  cardTitle: {
    ...typography.title,
    fontSize: 16,
    marginBottom: 4,
  },
  cardCount: {
    color: colors.textSecondary,
    fontSize: 12,
  }
});
