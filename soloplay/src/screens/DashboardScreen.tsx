import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { usePlayerStore } from '../store/usePlayerStore';
import type { Track } from '../store/usePlayerStore';
import { useDocStore } from '../store/useDocStore';
import { CardOverlay } from '../components/CardOverlay';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { AddToDocCategoryModal } from '../components/AddToDocCategoryModal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;

interface DashboardProps {
  onNavigate: (screen: string) => void;
  onNavigateToPlaylist: (id: string, name: string) => void;
  onOpenPlayer: (playlistId: string, playlistName: string) => void;
}

export const DashboardScreen = ({ onNavigate, onNavigateToPlaylist, onOpenPlayer }: DashboardProps) => {
  const insets = useSafeAreaInsets();
  const { playTrack } = useAudio();
  const playlists = usePlayerStore(state => state.playlists);
  const memory = usePlayerStore(state => state.memory);
  const recentTracks = usePlayerStore(state => state.recentTracks || []);
  const documents = useDocStore(state => state.documents);
  const categories = useDocStore(state => state.categories);
  const getRecentDocuments = useDocStore(state => state.getRecentDocuments);
  const deleteDocument = useDocStore(state => state.deleteDocument);
  const removeRecentTrack = usePlayerStore(state => state.removeRecentTrack);
  const recentDocuments = getRecentDocuments(5);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  
  const [addToPlaylistVisible, setAddToPlaylistVisible] = useState(false);
  const [selectedTrackForAdd, setSelectedTrackForAdd] = useState<any>(null);
  
  const [addToCategoryVisible, setAddToCategoryVisible] = useState(false);
  const [selectedDocForAdd, setSelectedDocForAdd] = useState<any>(null);

  const getDynamicColor = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 50%, 20%)`; 
  };

  const ytPlaylist = playlists.find(p => p.name === 'YouTube İndirilenler');
  const recentDownloads = ytPlaylist?.tracks ? ytPlaylist.tracks.slice().reverse().slice(0, 15) : [];

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
    const mem = memory[memoryItem.playlistId];
    const pos = (mem && mem.trackUri === memoryItem.trackUri) ? mem.positionMillis : 0;
    onOpenPlayer(memoryItem.playlistId, memoryItem.playlistName);
    await playTrack(memoryItem.trackUri, memoryItem.trackName, memoryItem.playlistId, pos);
  };

  const renderSectionHeader = (title: string, onPress?: () => void, isMainTitle: boolean = false) => (
    <TouchableOpacity 
      style={isMainTitle ? styles.mainSectionHeader : styles.subSectionHeader}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Text style={isMainTitle ? styles.mainSectionTitle : styles.subSectionTitle}>{title}</Text>
      {onPress && <Ionicons name="chevron-forward" size={isMainTitle ? 24 : 18} color={isMainTitle ? colors.text : colors.textSecondary} />}
    </TouchableOpacity>
  );

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        {!isSearchActive ? (
          <>
            <View style={styles.logoContainer}>
              <View style={[styles.logoIconContainer, { marginRight: 10 }]}>
                <Ionicons name="play" size={18} color={colors.background} style={{ marginLeft: 3 }} />
              </View>
              <Text style={styles.logoTextSolo}>Solo<Text style={styles.logoTextPlay}>Play</Text></Text>
            </View>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => setIsSearchActive(true)} style={styles.headerIconButton}>
              <Ionicons name="search" size={24} color={colors.primary} />
            </TouchableOpacity>
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
        <ScrollView 
          contentContainerStyle={{ paddingBottom: Math.max(120, insets.bottom + 90), paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {(() => {
            const q = searchQuery.toLowerCase();
            
            // 1. Playlists
            const matchedPlaylists = playlists.filter(p => p.name && p.name.toLowerCase().includes(q)).map(p => ({ type: 'playlist', data: p }));

            // 2. Tracks
            const matchedTracks: any[] = [];
            playlists.forEach(p => {
              p.tracks?.forEach(t => {
                const trackName = t.name ? t.name.toLowerCase() : '';
                const trackArtist = t.artist ? t.artist.toLowerCase() : '';
                if (trackName.includes(q) || trackArtist.includes(q)) {
                  if (!matchedTracks.some(mt => mt.data.uri === t.uri)) {
                    matchedTracks.push({ type: 'track', data: t, playlistId: p.id, playlistName: p.name });
                  }
                }
              });
            });

            // 3. Categories
            const matchedCategories = categories ? categories.filter(c => c.name && c.name.toLowerCase().includes(q)).map(c => ({ type: 'category', data: c })) : [];

            // 4. Documents
            const matchedDocs = documents ? documents.filter(d => d.title && d.title.toLowerCase().includes(q)).map(d => ({ type: 'doc', data: d })) : [];
            
            const results = [...matchedPlaylists, ...matchedTracks, ...matchedCategories, ...matchedDocs];

            if (results.length === 0) {
              return (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Ionicons name="search" size={48} color={colors.textSecondary} style={{ marginBottom: 15 }} />
                  <Text style={styles.emptyText}>"{searchQuery}" için sonuç bulunamadı.</Text>
                </View>
              );
            }

            return results.map((item, idx) => {
              if (item.type === 'playlist') {
                return (
                  <TouchableOpacity 
                    key={`sp_${idx}`} 
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                    onPress={() => {
                      setIsSearchActive(false);
                      onNavigateToPlaylist(item.data.id, item.data.name);
                    }}
                  >
                    <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: getDynamicColor(item.data.name || 'default'), justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="folder" size={24} color={colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{item.data.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>Liste • {item.data.tracks?.length || 0} Medya</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              } else if (item.type === 'track') {
                return (
                  <TouchableOpacity 
                    key={`st_${idx}`} 
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                    onPress={() => {
                      handlePlayTrack(item.data, item.playlistId, item.playlistName);
                    }}
                  >
                    {item.data.artwork ? (
                      <Image source={{ uri: item.data.artwork }} style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: colors.surface }} />
                    ) : (
                      <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: getDynamicColor(item.data.name || 'default'), justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="musical-notes" size={24} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 15 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{item.data.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{item.playlistName} • {item.data.artist || 'Müzik'}</Text>
                    </View>
                    <Ionicons name="play-circle" size={28} color={colors.primary} />
                  </TouchableOpacity>
                );
              } else if (item.type === 'category') {
                return (
                  <TouchableOpacity 
                    key={`sc_${idx}`} 
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                    onPress={() => {
                      setIsSearchActive(false);
                      onNavigate('Documents');
                    }}
                  >
                    <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: getDynamicColor(item.data.name), justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="folder-open" size={24} color={colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{item.data.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>Klasör</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              } else {
                return (
                  <TouchableOpacity 
                    key={`sd_${idx}`} 
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                    onPress={() => {
                      onNavigate('Documents');
                    }}
                  >
                    {item.data.imageUri ? (
                      <Image source={{ uri: item.data.imageUri }} style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: colors.surface }} />
                    ) : (
                      <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: getDynamicColor(item.data.title), justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="document-text" size={24} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 15 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{item.data.title}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>OCR Belgesi</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              }
            });
          })()}
        </ScrollView>
      ) : (
        <ScrollView 
          contentContainerStyle={{ paddingBottom: Math.max(120, insets.bottom + 90) }}
          showsVerticalScrollIndicator={false}
        >
          {/* Ana Müziklerim Bölümü */}
          <View style={styles.mainSection}>
            {renderSectionHeader('Medya', () => onNavigate('MusicDashboard'), true)}
            
            {recentDownloads.length > 0 && (
              <View style={styles.subSection}>
                {renderSectionHeader('YouTube Müziklerim', () => onNavigateToPlaylist(ytPlaylist!.id, ytPlaylist!.name))}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
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
                      {track.artwork ? <Image source={{ uri: track.artwork }} style={styles.cardImage} /> : (
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
                                { text: 'Sil', style: 'destructive', onPress: () => usePlayerStore.getState().removeTrack(ytPlaylist!.id, track.uri) }
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

            {recentPlayed.length > 0 && (
              <View style={styles.subSection}>
                {renderSectionHeader('Sık Dinlenenler')}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
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
                      {item.artwork ? <Image source={{ uri: item.artwork }} style={styles.cardImage} /> : (
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
            
            {recentDownloads.length === 0 && recentPlayed.length === 0 && (
              <View style={styles.subSection}>
                {renderSectionHeader('Önerilenler')}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
                  {[
                    { id: 'm1', title: 'Pop Mix 2026', sub: 'Harika bir başlangıç', icon: 'musical-notes', artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80' },
                    { id: 'm2', title: 'Akustik Dinleti', sub: 'Rahatlatıcı', icon: 'musical-notes', artwork: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=500&q=80' },
                    { id: 'm3', title: 'Podcast: Teknoloji', sub: 'Geleceğe Bakış', icon: 'mic', artwork: 'https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=500&q=80' },
                    { id: 'm4', title: 'Odaklanma', sub: 'Derin Çalışma', icon: 'headset', artwork: 'https://images.unsplash.com/photo-1558021212-51b6ecfa0db9?w=500&q=80' }
                  ].map((dummy, idx) => (
                    <TouchableOpacity key={dummy.id} style={styles.card} activeOpacity={1}>
                      {dummy.artwork ? (
                          <Image source={{ uri: dummy.artwork }} style={styles.cardImage} />
                      ) : (
                          <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(dummy.title) }]}>
                              <Ionicons name={dummy.icon as any} size={32} color={colors.textSecondary} />
                          </View>
                      )}
                      <Text style={styles.cardTitle} numberOfLines={1}>{dummy.title}</Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{dummy.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.mainSection}>
            {renderSectionHeader('OCR Taranan Belgeler', () => onNavigate('Documents'), true)}
            <View style={styles.subSection}>
              {recentDocuments.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
                  {recentDocuments.map((doc) => (
                    <TouchableOpacity 
                      key={doc.id} 
                      style={[styles.card, activeCardId === doc.id && { zIndex: 10, elevation: 10 }]} 
                      onPress={() => onNavigate('Documents')} 
                      onLongPress={() => setActiveCardId(doc.id)}
                      activeOpacity={0.7}
                      disabled={activeCardId === doc.id}
                    >
                      {doc.imageUri ? (
                          <Image source={{ uri: doc.imageUri }} style={styles.cardImage} />
                      ) : (
                          <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(doc.id) }]}>
                          <Ionicons name="document-text" size={32} color="rgba(255,255,255,0.7)" />
                          </View>
                      )}
                      <CardOverlay
                        visible={activeCardId === doc.id}
                        onClose={() => setActiveCardId(null)}
                        options={[
                          { icon: 'folder', color: '#1DD75F', onPress: () => { setSelectedDocForAdd(doc); setAddToCategoryVisible(true); } },
                          { icon: 'trash', color: '#ff4444', onPress: () => {
                              Alert.alert('Emin misiniz?', `"${doc.title}" belgesini silmek istediğinize emin misiniz?`, [
                                { text: 'İptal', style: 'cancel' },
                                { text: 'Sil', style: 'destructive', onPress: () => deleteDocument(doc.id) }
                              ]);
                          }}
                        ]}
                      />
                      <Text style={styles.cardTitle} numberOfLines={1}>{doc.title}</Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{new Date(doc.updatedAt).toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
                  {[
                    { id: 'd1', title: 'Kira Sözleşmesi', sub: 'Örnek Belge', icon: 'document-text', artworkLocal: require('../../assets/dummy_contract.jpg') },
                    { id: 'd2', title: 'Market Fişi', sub: 'Örnek Fiş', icon: 'receipt', artworkLocal: require('../../assets/dummy_receipt.jpg') },
                    { id: 'add', title: 'Belge Tara', sub: 'Yeni Ekle', icon: 'scan', artworkLocal: require('../../assets/dummy_scan_ui.jpg') }
                  ].map((dummy, idx) => (
                    <TouchableOpacity key={dummy.id} style={styles.card} onPress={() => onNavigate('Scan')} activeOpacity={0.8}>
                      {dummy.artworkLocal ? (
                          <Image source={dummy.artworkLocal} style={styles.cardImage} />
                      ) : (dummy as any).artwork ? (
                          <Image source={{ uri: (dummy as any).artwork }} style={styles.cardImage} />
                      ) : (
                          <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: dummy.id === 'add' ? '#1DD75F' : getDynamicColor(dummy.title) }]}>
                              <Ionicons name={dummy.icon as any} size={32} color={dummy.id === 'add' ? '#000' : colors.textSecondary} />
                          </View>
                      )}
                      <Text style={styles.cardTitle} numberOfLines={1}>{dummy.title}</Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{dummy.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      <AddToPlaylistModal
        visible={addToPlaylistVisible}
        track={selectedTrackForAdd}
        onClose={() => setAddToPlaylistVisible(false)}
      />

      <AddToDocCategoryModal
        visible={addToCategoryVisible}
        document={selectedDocForAdd}
        onClose={() => setAddToCategoryVisible(false)}
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
    borderRadius: 17,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
  mainSection: {
    marginBottom: 40,
  },
  mainSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  mainSectionTitle: {
    ...typography.title,
    fontSize: 24,
    color: colors.text,
    marginRight: 5,
  },
  subSection: {
    marginBottom: 25,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  subSectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    gap: 15,
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
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  }
});
