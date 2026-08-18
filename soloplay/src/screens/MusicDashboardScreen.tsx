import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { colors, typography } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { usePlayerStore } from '../store/usePlayerStore';
import type { Track, Playlist } from '../store/usePlayerStore';
import { MiniPlayer } from '../components/MiniPlayer';
import { PromptModal } from '../components/PromptModal';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { CardOverlay } from '../components/CardOverlay';
import { promptManualRestore } from '../utils/fileStorage';

const { width } = Dimensions.get('window');
// Ekrana yaklaşık 2.5 kutu sığacak genişlik
const CARD_WIDTH = width * 0.38;

interface DashboardProps {
  onNavigate: (screen: string) => void;
  onNavigateToPlaylist: (id: string, name: string) => void;
  onOpenPlayer: (playlistId: string, playlistName: string) => void;
  onBack: () => void;
}

export const MusicDashboardScreen = ({ onNavigate, onNavigateToPlaylist, onOpenPlayer, onBack }: DashboardProps) => {
  const insets = useSafeAreaInsets();
  const { currentPlaylistId: activePlaylistIdFromAudio, currentTrackName, playTrack } = useAudio();
  const playlists = usePlayerStore(state => state.playlists);
  const addPlaylist = usePlayerStore(state => state.addPlaylist);
  const memory = usePlayerStore(state => state.memory);
  const removePlaylist = usePlayerStore(state => state.removePlaylist);
  const [isPicking, setIsPicking] = useState(false);
  
  // Prompt Modal States
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptAction, setPromptAction] = useState<'createEmpty' | 'createWithFiles'>('createEmpty');
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);
  
  const [addToPlaylistVisible, setAddToPlaylistVisible] = useState(false);
  const [selectedTrackForAdd, setSelectedTrackForAdd] = useState<any>(null);

  // Overlay Menu State
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

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
        setPendingFiles(tracks);
        setPromptAction('createWithFiles');
        setPromptVisible(true);
      }
    } catch (err) {
      console.log('User cancelled or error:', err);
    } finally {
      setIsPicking(false);
    }
  };
  
  const handlePromptSubmit = (name: string) => {
    setPromptVisible(false);
    const customCount = playlists.filter(p => p.name !== 'YouTube İndirilenler' && p.name !== 'Videolarım').length;
    const finalName = name.trim() || `Müzik Listem ${customCount + 1}`;
    
    if (promptAction === 'createWithFiles') {
      addPlaylist({
        id: Date.now().toString(),
        name: finalName,
        tracks: pendingFiles
      });
      alert(`${pendingFiles.length} parça eklendi ve "${finalName}" oluşturuldu.`);
      setPendingFiles([]);
    } else {
      addPlaylist({
        id: Date.now().toString(),
        name: finalName,
        tracks: []
      });
      alert(`"${finalName}" oluşturuldu.`);
    }
  };
  
  const openAddToPlaylist = (track: any) => {
    setSelectedTrackForAdd(track);
    setAddToPlaylistVisible(true);
  };
  
  const removeMemory = usePlayerStore(state => state.removeMemory);

  const getDynamicColor = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 50%, 20%)`; // Koyu ama renkli arka plan
  };

  // Veri Hazırlığı
  const ytPlaylist = playlists.find(p => p.name === 'YouTube İndirilenler');
  const otherPlaylists = playlists.filter(p => p.name !== 'YouTube İndirilenler' && p.name !== 'Videolarım');

  const recentDownloads = ytPlaylist?.tracks ? ytPlaylist.tracks.slice().reverse().slice(0, 15) : [];
  const recentTracks = usePlayerStore(state => state.recentTracks || []);
  const removeRecentTrack = usePlayerStore(state => state.removeRecentTrack);
  const removeTrack = usePlayerStore(state => state.removeTrack);

  const recentPlayed = recentTracks.map(track => {
    const playlist = playlists.find(p => p.id === track.playlistId);
    return {
      ...track,
      playlistName: playlist ? playlist.name : 'Bilinmeyen Liste'
    };
  });

  const handlePlayTrack = async (track: Track, playlistId: string, playlistName: string) => {
    onOpenPlayer(playlistId, playlistName);
    await playTrack(track.uri, track.name || '', playlistId);
  };

  const handlePlayMemory = async (memoryItem: any) => {
    // We get the saved position from the memory object (for Kaldığın Yerden Devam Et)
    const mem = memory[memoryItem.playlistId];
    const pos = (mem && mem.trackUri === memoryItem.trackUri) ? mem.positionMillis : 0;
    
    onOpenPlayer(memoryItem.playlistId, memoryItem.playlistName);
    await playTrack(memoryItem.trackUri, memoryItem.trackName, memoryItem.playlistId, pos);
  };

  const renderSectionHeader = (title: string, onPress?: () => void) => (
    <TouchableOpacity 
      style={styles.sectionHeader}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={onBack} style={{ padding: 10, marginLeft: -10, marginRight: 10 }}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={styles.logoTextSolo}>Müziklerim</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={promptManualRestore}
          >
            <Ionicons name="sync-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={() => onNavigate('YoutubeDownloader')}
          >
            <Ionicons name="search" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={handlePickFiles} 
            disabled={isPicking}
          >
            {isPicking ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="add" size={28} color={colors.primary} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: Math.max(120, insets.bottom + 90) }}
        showsVerticalScrollIndicator={false}
      >
        {/* YouTube İndirmelerim */}
        {recentDownloads.length > 0 && (
          <View style={styles.section}>
            {renderSectionHeader('YouTube İndirmelerim', () => onNavigateToPlaylist(ytPlaylist!.id, ytPlaylist!.name))}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.horizontalScrollContent}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + 15}
            >
              {recentDownloads.map((track, idx) => {
                const cardId = `dl_${track.uri}_${idx}`;
                return (
                <TouchableOpacity 
                  key={cardId} 
                  style={[styles.card, activeCardId === cardId && { zIndex: 10, elevation: 10 }]}
                  onPress={() => handlePlayTrack(track, ytPlaylist!.id, ytPlaylist!.name)}
                  onLongPress={() => setActiveCardId(cardId)}
                  disabled={activeCardId === cardId}
                >
                  {track.artwork ? (
                    <Image source={{ uri: track.artwork }} style={styles.cardImage} />
                  ) : (
                    <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(track.name) }]}>
                      <Ionicons name="musical-notes" size={32} color={colors.textSecondary} />
                    </View>
                  )}
                  <CardOverlay
                    visible={activeCardId === cardId}
                    onClose={() => setActiveCardId(null)}
                    options={[
                      { icon: 'folder', color: '#1DD75F', onPress: () => { setSelectedTrackForAdd(track); setAddToPlaylistVisible(true); } },
                      { icon: 'trash', color: '#ff4444', onPress: () => {
                          Alert.alert('Emin misiniz?', `Bu parça "${ytPlaylist!.name}" listesinden silinecek.`, [
                            { text: 'İptal', style: 'cancel' },
                            { text: 'Sil', style: 'destructive', onPress: () => removeTrack(ytPlaylist!.id, track.uri) }
                          ]);
                      }}
                    ]}
                  />
                  <Text style={styles.cardTitle} numberOfLines={1}>{track.name}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>{track.artist || 'Bilinmeyen'}</Text>
                </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Güncel Dinledikleriniz */}
        {recentPlayed.length > 0 && (
          <View style={styles.section}>
            {renderSectionHeader('Güncel Dinledikleriniz')}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.horizontalScrollContent}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + 15}
            >
              {recentPlayed.map((item, idx) => {
                const cardId = `rp_${item.trackUri}_${idx}`;
                return (
                <TouchableOpacity 
                  key={cardId} 
                  style={[styles.card, activeCardId === cardId && { zIndex: 10, elevation: 10 }]}
                  onPress={() => handlePlayMemory(item)}
                  onLongPress={() => setActiveCardId(cardId)}
                  disabled={activeCardId === cardId}
                >
                  {item.artwork ? (
                    <Image source={{ uri: item.artwork }} style={styles.cardImage} />
                  ) : (
                    <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(item.trackName) }]}>
                      <Ionicons name="play-circle" size={32} color={colors.textSecondary} />
                    </View>
                  )}
                  <CardOverlay
                    visible={activeCardId === cardId}
                    onClose={() => setActiveCardId(null)}
                    options={[
                      { icon: 'folder', color: '#1DD75F', onPress: () => { setSelectedTrackForAdd(item); setAddToPlaylistVisible(true); } },
                      { icon: 'trash', color: '#ff4444', onPress: () => removeRecentTrack(item.trackUri) }
                    ]}
                  />
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.trackName}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>{item.playlistName}</Text>
                </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}


        {otherPlaylists.map((playlist) => {
          const isEmpty = !playlist.tracks || playlist.tracks.length === 0;
          
          return (
            <View key={`sec_${playlist.id}`} style={styles.section}>
              {renderSectionHeader(playlist.name, () => onNavigateToPlaylist(playlist.id, playlist.name))}
              
              {isEmpty ? (
                <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                    Bu klasör şu an boş. Şarkı eklemek için parçaların üzerine basılı tutun.
                  </Text>
                </View>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.horizontalScrollContent}
                  decelerationRate="fast"
                  snapToInterval={CARD_WIDTH + 15}
                >
                  {playlist.tracks.slice().reverse().slice(0, 15).map((track, idx) => {
                    const cardId = `pl_${playlist.id}_${track.uri}_${idx}`;
                    return (
                    <TouchableOpacity 
                      key={cardId} 
                      style={[styles.card, activeCardId === cardId && { zIndex: 10, elevation: 10 }]}
                      onPress={() => handlePlayTrack(track, playlist.id, playlist.name)}
                      onLongPress={() => setActiveCardId(cardId)}
                      disabled={activeCardId === cardId}
                    >
                      {track.artwork ? (
                        <Image source={{ uri: track.artwork }} style={styles.cardImage} />
                      ) : (
                        <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(track.name) }]}>
                          <Ionicons name="musical-notes" size={32} color={colors.textSecondary} />
                        </View>
                      )}
                      <CardOverlay
                        visible={activeCardId === cardId}
                        onClose={() => setActiveCardId(null)}
                        options={[
                          { icon: 'folder', color: '#1DD75F', onPress: () => { setSelectedTrackForAdd(track); setAddToPlaylistVisible(true); } },
                          { icon: 'trash', color: '#ff4444', onPress: () => {
                              Alert.alert('Emin misiniz?', `Bu parça "${playlist.name}" listesinden silinecek.`, [
                                { text: 'İptal', style: 'cancel' },
                                { text: 'Sil', style: 'destructive', onPress: () => removeTrack(playlist.id, track.uri) }
                              ]);
                          }}
                        ]}
                      />
                      <Text style={styles.cardTitle} numberOfLines={1}>{track.name}</Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{track.artist || 'Bilinmeyen'}</Text>
                    </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          );
        })}
      </ScrollView>

      <PromptModal
        visible={promptVisible}
        title={promptAction === 'createEmpty' ? 'Yeni Liste Oluştur' : 'Müzikler Seçildi'}
        placeholder="Liste adı girin (Örn: Pop Müzikler)"
        onCancel={() => setPromptVisible(false)}
        onSubmit={handlePromptSubmit}
      />

      <AddToPlaylistModal
        visible={addToPlaylistVisible}
        track={selectedTrackForAdd}
        onClose={() => setAddToPlaylistVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17, // Tam yuvarlak
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  logoTextSolo: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  logoTextPlay: {
    color: colors.primary,
  },
  toolsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingRight: 16,
    paddingLeft: 6,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  toolIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  toolText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 20,
    color: colors.text,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    gap: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  playlistImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  playlistCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
