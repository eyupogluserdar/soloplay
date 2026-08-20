import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { usePlayerStore } from '../store/usePlayerStore';
import type { Track } from '../store/usePlayerStore';
import { CardOverlay } from '../components/CardOverlay';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { PromptModal } from '../components/PromptModal';
import * as DocumentPicker from 'expo-document-picker';
import { SearchResults } from '../components/SearchResults';
import { TextInput } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;

interface MediaCategoryProps {
  categoryTitle: string;
  onBack: () => void;
  onNavigateToPlaylist?: (id: string, name: string) => void;
  onOpenPlayer?: (playlistId: string, playlistName: string) => void;
}

export const MediaCategoryScreen = ({ categoryTitle, onBack, onNavigateToPlaylist, onOpenPlayer }: MediaCategoryProps) => {
  const insets = useSafeAreaInsets();
  const { playTrack } = useAudio();
  const playlists = usePlayerStore(state => state.playlists);
  const memory = usePlayerStore(state => state.memory);
  const addTrack = usePlayerStore(state => state.addTrack);
  const removeTrack = usePlayerStore(state => state.removeTrack);
  const recentTracks = usePlayerStore(state => state.recentTracks || []);
  const removeRecentTrack = usePlayerStore(state => state.removeRecentTrack);
  const addPlaylist = usePlayerStore(state => state.addPlaylist);

  const isMusic = categoryTitle === 'Müziklerim';
  const categoryPlaylists = playlists.filter(p => 
    p.name !== 'YouTube İndirilenler' && 
    p.name !== 'Videolarım' &&
    (isMusic ? (p.category === 'Müziklerim' || !p.category) : p.category === categoryTitle)
  );


  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [addToPlaylistVisible, setAddToPlaylistVisible] = useState(false);
  const [selectedTrackForAdd, setSelectedTrackForAdd] = useState<any>(null);

  const [isPicking, setIsPicking] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptAction, setPromptAction] = useState<'createEmpty' | 'createWithFiles'>('createEmpty');
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);

  const getDynamicColor = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 50%, 20%)`;
  };

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
      console.log(err);
    } finally {
      setIsPicking(false);
    }
  };

  const handlePromptSubmit = (name: string) => {
    setPromptVisible(false);
    const customCount = categoryPlaylists.length;
    const defaultPrefix = isMusic ? 'Müzik Listem' : `${categoryTitle} Listem`;
    const finalName = name.trim() || `${defaultPrefix} ${customCount + 1}`;
    
    if (promptAction === 'createWithFiles') {
      addPlaylist({ id: Date.now().toString(), name: finalName, tracks: pendingFiles, category: categoryTitle });
      alert(`${pendingFiles.length} içerik eklendi ve "${finalName}" oluşturuldu.`);
      setPendingFiles([]);
    } else {
      addPlaylist({ id: Date.now().toString(), name: finalName, tracks: [], category: categoryTitle });
      alert(`"${finalName}" oluşturuldu.`);
    }
  };

  const ytPlaylist = playlists.find(p => p.name === 'YouTube İndirilenler');
  const otherPlaylists = playlists.filter(p => p.name !== 'YouTube İndirilenler' && p.name !== 'Videolarım');
  const recentDownloads = ytPlaylist?.tracks ? ytPlaylist.tracks.slice().reverse().slice(0, 15) : [];

  const recentPlayed = recentTracks.map(track => {
    const playlist = playlists.find(p => p.id === track.playlistId);
    return {
      ...track,
      playlistName: playlist ? playlist.name : 'Bilinmeyen Liste'
    };
  });

  const handlePlayTrack = async (track: Track, playlistId: string, playlistName: string) => {
    if (onOpenPlayer) onOpenPlayer(playlistId, playlistName);
    await playTrack(track.uri, track.name || '', playlistId);
  };

  const handlePlayMemory = async (memoryItem: any) => {
    const mem = memory[memoryItem.playlistId];
    const pos = (mem && mem.trackUri === memoryItem.trackUri) ? mem.positionMillis : 0;
    
    if (onOpenPlayer) onOpenPlayer(memoryItem.playlistId, memoryItem.playlistName);
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

  const renderDummyShelf = (title: string, items: any[]) => (
    <View style={styles.section}>
      {renderSectionHeader(title)}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
        {items.map((dummy, idx) => (
          <TouchableOpacity key={idx.toString()} style={styles.card} activeOpacity={0.8}>
            {dummy.artwork ? (
              <Image source={{ uri: dummy.artwork }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(dummy.title) }]}>
                <Ionicons name={dummy.icon || 'play-circle-outline'} size={40} color={colors.textSecondary} />
              </View>
            )}
            <Text style={styles.cardTitle} numberOfLines={1}>{dummy.title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{dummy.sub}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const getDummyContent = (category: string) => {
    switch (category) {
      case 'Radyo Dinle':
        return [
          {
            title: 'Popüler İstasyonlar',
            items: [
              { title: 'Kral FM', sub: 'Damar & Arabesk', artwork: 'https://images.unsplash.com/photo-1598555239564-9a99723ecdb9?w=500&q=80' },
              { title: 'Metro FM', sub: 'Hit Müzik', artwork: 'https://images.unsplash.com/photo-1516280440502-a2f00a5a3a2e?w=500&q=80' },
              { title: 'Joy Türk', sub: 'Türkçe Yavaş', artwork: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=500&q=80' },
              { title: 'Süper FM', sub: 'Pop & Hareketli', artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80' },
            ]
          },
          {
            title: 'Bölgesel Radyolar',
            items: [
              { title: 'Karadeniz FM', sub: 'Yöresel Müzik', artwork: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=500&q=80' },
              { title: 'Ege FM', sub: 'Ege Havaları', artwork: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80' },
            ]
          }
        ];
      case 'TV İzle':
        return [
          {
            title: 'Haber & Belgesel',
            items: [
              { title: 'NTV', sub: 'Haberin Merkezi', artwork: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=500&q=80' },
              { title: 'TRT Belgesel', sub: 'Doğa & Tarih', artwork: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=500&q=80' },
              { title: 'CNN Türk', sub: 'Son Dakika', artwork: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&q=80' },
            ]
          },
          {
            title: 'Eğlence',
            items: [
              { title: 'TV8', sub: 'Yarışma & Eğlence', artwork: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=500&q=80' },
              { title: 'Star TV', sub: 'Diziler', artwork: 'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?w=500&q=80' },
            ]
          }
        ];
      case 'Podcastler':
        return [
          {
            title: 'Sizin İçin Seçilenler',
            items: [
              { title: 'Fularsız Entellik', sub: 'Kültür & Felsefe', artwork: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&q=80' },
              { title: 'Ortamlarda Satılacak', sub: 'İlginç Bilgiler', artwork: 'https://images.unsplash.com/photo-1558021212-51b6ecfa0db9?w=500&q=80' },
              { title: 'Zihnin Kodları', sub: 'Kişisel Gelişim', artwork: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=500&q=80' },
            ]
          }
        ];
      default:
        return [
          {
            title: 'Keşfet',
            items: [
              { title: 'Global Top 50', sub: 'En Çok Dinlenenler', artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80' },
              { title: 'Türkçe Pop', sub: 'Yeni Çıkanlar', artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80' },
              { title: 'Akustik', sub: 'Sakin & Yavaş', artwork: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500&q=80' },
              { title: 'Rap & Hip-Hop', sub: 'Enerjik', artwork: 'https://images.unsplash.com/photo-1493225457124-a1a2a5956011?w=500&q=80' },
            ]
          }
        ];
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        {!isSearchActive ? (
          <>
            <TouchableOpacity onPress={onBack} style={{ padding: 10, marginLeft: -10, marginRight: 10 }}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Text style={styles.logoTextSolo}>{categoryTitle}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerIconButton} onPress={() => setIsSearchActive(true)}>
                <Ionicons name="search" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconButton} onPress={() => { setPromptAction('createEmpty'); setPromptVisible(true); }}>
                <Ionicons name="folder-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconButton} onPress={handlePickFiles} disabled={isPicking}>
                {isPicking ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="add" size={28} color={colors.primary} />}
              </TouchableOpacity>
            </View>
          </>
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
          onNavigateToPlaylist={onNavigateToPlaylist || (() => {})}
          onClose={() => setIsSearchActive(false)}
        />
      ) : (
      <ScrollView 
        contentContainerStyle={{ paddingBottom: Math.max(120, insets.bottom + 90) }}
        showsVerticalScrollIndicator={false}
      >
        {categoryPlaylists.length > 0 || (isMusic && (recentPlayed.length > 0 || recentDownloads.length > 0)) ? (
          <>
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

            {/* YouTube İndirmelerim */}
            {recentDownloads.length > 0 && ytPlaylist && (
              <View style={styles.section}>
                {renderSectionHeader('YouTube İndirmelerim', () => onNavigateToPlaylist && onNavigateToPlaylist(ytPlaylist.id, ytPlaylist.name))}
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
                      onPress={() => handlePlayTrack(track, ytPlaylist.id, ytPlaylist.name)}
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
                              Alert.alert('Emin misiniz?', `Bu parça "${ytPlaylist.name}" listesinden silinecek.`, [
                                { text: 'İptal', style: 'cancel' },
                                { text: 'Sil', style: 'destructive', onPress: () => removeTrack(ytPlaylist.id, track.uri) }
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

            {/* Category Playlists */}
            {categoryPlaylists.map((playlist) => {
              return (
                <View key={`sec_${playlist.id}`} style={styles.section}>
                  {renderSectionHeader(playlist.name, () => onNavigateToPlaylist && onNavigateToPlaylist(playlist.id, playlist.name))}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.horizontalScrollContent}
                    decelerationRate="fast"
                    snapToInterval={CARD_WIDTH + 15}
                  >
                    {/* Yükle Butonu Kutusu */}
                    <TouchableOpacity 
                      style={styles.card} 
                      onPress={() => handlePickFilesForPlaylist(playlist.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: '#1DD75F' }]}>
                        <Ionicons name="add" size={40} color="#000" />
                      </View>
                      <Text style={styles.cardTitle} numberOfLines={1}>Yükle</Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>Telefondan Ekle</Text>
                    </TouchableOpacity>

                    {/* İçerikler */}
                    {playlist.tracks?.slice().reverse().slice(0, 15).map((track, idx) => {
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
                </View>
              );
            })}
          </>
        ) : (
          <>
            {getDummyContent(categoryTitle).map((section, idx) => (
              <React.Fragment key={`dummy_sec_${idx}`}>
                {renderDummyShelf(section.title, section.items)}
              </React.Fragment>
            ))}
          </>
        )}
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
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoTextSolo: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { ...typography.title, fontSize: 20, color: colors.text },
  horizontalScrollContent: { paddingHorizontal: 20, gap: 15 },
  card: { width: CARD_WIDTH },
  cardImage: { width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 16, marginBottom: 10, backgroundColor: colors.surface },
  placeholderImage: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { color: colors.textSecondary, fontSize: 12 },
});
