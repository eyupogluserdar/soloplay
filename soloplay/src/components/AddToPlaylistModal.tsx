import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/theme';
import { usePlayerStore } from '../store/usePlayerStore';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const AddToPlaylistModal = ({
  visible,
  track,
  onClose,
}: {
  visible: boolean;
  track: any;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const playlists = usePlayerStore(state => state.playlists);
  const addTrack = usePlayerStore(state => state.addTrack);

  const customPlaylists = playlists.filter(p => p.name !== 'YouTube İndirilenler' && p.name !== 'Videolarım');

  const handleAdd = (playlistId: string) => {
    if (!track) return;
    
    // Aynı parçanın listede olup olmadığını kontrol edelim
    const targetPlaylist = playlists.find(p => p.id === playlistId);
    if (targetPlaylist && targetPlaylist.tracks.some(t => t.uri === track.uri)) {
      alert('Bu parça zaten bu listede mevcut!');
      onClose();
      return;
    }

    addTrack(playlistId, {
      id: track.id || Date.now().toString(),
      uri: track.uri,
      name: track.name || track.title || track.trackName || 'Bilinmeyen Parça',
      artist: track.artist,
      artwork: track.artwork,
    });
    alert('Listeye eklendi!');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Listeye Ekle</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView style={{ minHeight: 150, maxHeight: 400 }}>
            {customPlaylists.map(p => (
              <TouchableOpacity key={p.id} style={styles.item} onPress={() => handleAdd(p.id)}>
                <Ionicons name="list" size={24} color={colors.primary} />
                <Text style={styles.itemText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
            {customPlaylists.length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                Henüz bir çalma listesi oluşturmadınız.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  content: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { ...typography.title, fontSize: 18 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  itemText: { color: colors.text, fontSize: 16, marginLeft: 15, fontWeight: '600' }
});
