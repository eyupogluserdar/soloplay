import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { colors, typography } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { getDummyContent } from '../utils/dummyData';
import { SearchResults } from '../components/SearchResults';
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
  onNavigateToCategory?: (title: string) => void;
}

export const MusicDashboardScreen = ({ onNavigate, onNavigateToPlaylist, onOpenPlayer, onBack, onNavigateToCategory }: DashboardProps) => {
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

  const addTrack = usePlayerStore(state => state.addTrack);

  const handlePickFilesForPlaylist = async (playlistId: string) => {
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
        
        tracks.forEach(track => {
          addTrack(playlistId, track as any);
        });
        alert(`${tracks.length} parça eklendi.`);
      }
    } catch (err) {
      console.log('User cancelled or error:', err);
    }
  };

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

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        {!isSearchActive ? (
          <>
            <TouchableOpacity onPress={onBack} style={{ padding: 10, marginLeft: -10, marginRight: 10 }}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Text style={styles.logoTextSolo}>Medya</Text>
            </View>
            <View style={{ flex: 1 }} />
            
          <TouchableOpacity style={styles.headerIconButton} onPress={() => setIsSearchActive(true)}><Ionicons name="search" size={24} color={colors.primary} /></TouchableOpacity></>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary, borderRadius: 20, paddingHorizontal: 15, height: 40 }}>
            <Ionicons name="search" size={20} color={colors.primary} />
            <TextInput
              style={{ flex: 1, color: colors.text, marginLeft: 10 }}
              placeholder="Ara..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setIsSearchActive(false); setSearchQuery(''); }}>
              <Ionicons name="close" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isSearchActive && searchQuery.trim().length > 0 ? (
        <SearchResults 
          searchQuery={searchQuery}
          insets={insets}
          onNavigateToPlaylist={onNavigateToPlaylist}
          onClose={() => setIsSearchActive(false)}
        />
      ) : (
        <ScrollView 
          contentContainerStyle={{ paddingBottom: Math.max(120, insets.bottom + 90) }}
          showsVerticalScrollIndicator={false}
        >
                    {['Müziklerim', 'Radyo Dinle', 'TV İzle', 'Podcastler'].map((category) => {
            const firstDummySection = getDummyContent(category)[0];
            return (
              <View key={category} style={styles.section}>
                <TouchableOpacity 
                  style={styles.sectionHeader}
                  onPress={() => onNavigateToCategory && onNavigateToCategory(category)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionTitle}>{category}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
                  {firstDummySection.items.map((item: any, idx: number) => (
                    <TouchableOpacity 
                      key={`${category}_${idx}`} 
                      style={styles.card} 
                      activeOpacity={0.8}
                      onPress={() => onNavigateToCategory && onNavigateToCategory(category)}
                    >
                      {item.artwork ? (
                          <Image source={{ uri: item.artwork }} style={styles.cardImage} />
                      ) : (
                          <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(item.title) }]}>
                              <Ionicons name="play-circle-outline" size={32} color={colors.textSecondary} />
                          </View>
                      )}
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{item.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}

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
