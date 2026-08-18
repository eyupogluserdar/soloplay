import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { usePlayerStore } from '../store/usePlayerStore';
import type { Track } from '../store/usePlayerStore';
import { useDocStore } from '../store/useDocStore';
import { useVideoStore } from '../store/useVideoStore';
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
  const videoCategories = useVideoStore(state => state.categories);
  const downloadedVideos = React.useMemo(() => videoCategories.flatMap(c => c.videos), [videoCategories]);
  const playlists = usePlayerStore(state => state.playlists);
  const memory = usePlayerStore(state => state.memory);
  const recentTracks = usePlayerStore(state => state.recentTracks || []);
  const documents = useDocStore(state => state.documents);
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoIconContainer, { marginRight: 10 }]}>
            <Ionicons name="play" size={18} color={colors.background} style={{ marginLeft: 3 }} />
          </View>
          <Text style={styles.logoTextSolo}>Solo<Text style={styles.logoTextPlay}>Play</Text></Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: Math.max(120, insets.bottom + 90) }}
        showsVerticalScrollIndicator={false}
      >



        {/* Ana Müziklerim Bölümü */}
        <View style={styles.mainSection}>
          {renderSectionHeader('Müziklerim', () => onNavigate('MusicDashboard'), true)}
          
          {recentDownloads.length > 0 && (
            <View style={styles.subSection}>
              {renderSectionHeader('YouTube Müziklerim', () => onNavigateToPlaylist(ytPlaylist!.id, ytPlaylist!.name))}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
                {recentDownloads.map((track, idx) => (
                  <TouchableOpacity 
                    key={`dl_${track.uri}_${idx}`} 
                    style={[styles.card, activeCardId === track.uri && { zIndex: 10, elevation: 10 }]} 
                    onPress={() => handlePlayTrack(track, ytPlaylist!.id, ytPlaylist!.name)}
                    onLongPress={() => setActiveCardId(track.uri)}
                    disabled={activeCardId === track.uri}
                  >
                    {track.artwork ? <Image source={{ uri: track.artwork }} style={styles.cardImage} /> : (
                      <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(track.name) }]}>
                        <Ionicons name="musical-notes" size={32} color={colors.textSecondary} />
                      </View>
                    )}
                    <CardOverlay
                      visible={activeCardId === track.uri}
                      onClose={() => setActiveCardId(null)}
                      options={[
                        { icon: 'folder', color: '#1DD75F', onPress: () => { setSelectedTrackForAdd(track); setAddToPlaylistVisible(true); } }
                      ]}
                    />
                    <Text style={styles.cardTitle} numberOfLines={1}>{track.name}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{track.artist || 'Bilinmeyen'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {recentPlayed.length > 0 && (
            <View style={styles.subSection}>
              {renderSectionHeader('Sık Dinlenenler')}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
                {recentPlayed.map((item, idx) => (
                  <TouchableOpacity 
                    key={`rp_${item.trackUri}_${idx}`} 
                    style={[styles.card, activeCardId === item.trackUri && { zIndex: 10, elevation: 10 }]} 
                    onPress={() => handlePlayMemory(item)}
                    onLongPress={() => setActiveCardId(item.trackUri)}
                    disabled={activeCardId === item.trackUri}
                  >
                    {item.artwork ? <Image source={{ uri: item.artwork }} style={styles.cardImage} /> : (
                      <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(item.trackName) }]}>
                        <Ionicons name="play-circle" size={32} color={colors.textSecondary} />
                      </View>
                    )}
                    <CardOverlay
                      visible={activeCardId === item.trackUri}
                      onClose={() => setActiveCardId(null)}
                      options={[
                        { icon: 'folder', color: '#1DD75F', onPress: () => { setSelectedTrackForAdd(item); setAddToPlaylistVisible(true); } },
                        { icon: 'trash', color: '#ff4444', onPress: () => removeRecentTrack(item.trackUri) }
                      ]}
                    />
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.trackName}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{item.playlistName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {recentDownloads.length === 0 && recentPlayed.length === 0 && (
            <View style={styles.subSection}>
              {renderSectionHeader('Önerilenler', () => onNavigate('YoutubeDownloader'))}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
                {[
                  { id: 'm1', title: 'Pop Mix 2026', sub: 'Harika bir başlangıç', icon: 'musical-notes', artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80' },
                  { id: 'm2', title: 'Akustik Dinleti', sub: 'Rahatlatıcı', icon: 'musical-notes', artwork: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=500&q=80' },
                  { id: 'add', title: 'Müzik Ara', sub: 'İndir & Dinle', icon: 'search', artworkLocal: require('../../assets/dummy_music_search.jpg') }
                ].map((dummy, idx) => (
                  <TouchableOpacity key={dummy.id} style={styles.card} onPress={() => onNavigate('YoutubeDownloader')} activeOpacity={0.8}>
                    {dummy.artworkLocal ? (
                        <Image source={dummy.artworkLocal} style={styles.cardImage} />
                    ) : dummy.artwork ? (
                        <Image source={{ uri: dummy.artwork }} style={styles.cardImage} />
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
            </View>
          )}
        </View>

        {/* Videolarım Bölümü */}
        <View style={styles.mainSection}>
          {renderSectionHeader('Videolarım', () => onNavigate('Video'), true)}
          
          <View style={styles.subSection}>
            {downloadedVideos && downloadedVideos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
                {downloadedVideos.map((video, idx) => (
                  <TouchableOpacity 
                    key={`vid_${video.id}_${idx}`} 
                    style={[styles.card, activeCardId === video.id && { zIndex: 10, elevation: 10 }]} 
                    onPress={() => {
                        useVideoStore.getState().setActiveVideo(video);
                    }}
                    onLongPress={() => setActiveCardId(video.id)}
                    activeOpacity={0.7}
                    disabled={activeCardId === video.id}
                  >
                    {video.thumbnail ? (
                        <Image source={{ uri: video.thumbnail }} style={styles.cardImage} />
                    ) : (
                        <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(video.title) }]}>
                        <Ionicons name="videocam" size={32} color="rgba(255,255,255,0.7)" />
                        </View>
                    )}
                    <CardOverlay
                      visible={activeCardId === video.id}
                      onClose={() => setActiveCardId(null)}
                      options={[
                        { icon: 'trash', color: '#ff4444', onPress: () => {
                            Alert.alert('Emin misiniz?', `"${video.title}" videosunu silmek istediğinize emin misiniz?`, [
                              { text: 'İptal', style: 'cancel' },
                              { text: 'Sil', style: 'destructive', onPress: async () => {
                                  // Find category and remove
                                  const categories = useVideoStore.getState().categories;
                                  let catId = '';
                                  for (const c of categories) {
                                      if (c.videos.find(v => v.id === video.id)) {
                                          catId = c.id;
                                          break;
                                      }
                                  }
                                  if (catId) {
                                      useVideoStore.getState().removeVideoFromCategory(catId, video.id);
                                  }
                              }}
                            ]);
                        }}
                      ]}
                    />
                    <Text style={styles.cardTitle} numberOfLines={1}>{video.title}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{video.author || video.duration}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} decelerationRate="fast" snapToInterval={CARD_WIDTH + 15}>
                {[
                  { id: 'v1', title: 'Film Önerisi', sub: 'Aksiyon & Macera', icon: 'videocam', artwork: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=80' },
                  { id: 'v2', title: 'Belgesel Kesiti', sub: 'Doğa & Yaşam', icon: 'videocam', artwork: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500&q=80' },
                  { id: 'v_add', title: 'Video Ara', sub: 'İndir & İzle', icon: 'search' }
                ].map((dummy, idx) => (
                  <TouchableOpacity key={dummy.id} style={styles.card} onPress={() => onNavigate('YoutubeVideoDownloader')} activeOpacity={0.8}>
                    {dummy.artwork ? (
                        <Image source={{ uri: dummy.artwork }} style={styles.cardImage} />
                    ) : dummy.id === 'v_add' ? (
                        <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: '#1A1A1A', overflow: 'hidden' }]}>
                            <View style={{ flexDirection: 'row', position: 'absolute', top: 8, width: '100%', justifyContent: 'space-evenly', opacity: 0.15 }}>
                                {[1,2,3,4].map(i => <View key={i} style={{ width: 16, height: 12, backgroundColor: '#fff', borderRadius: 2 }} />)}
                            </View>
                            
                            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                <Ionicons name="film" size={64} color="rgba(29, 215, 95, 0.15)" style={{ position: 'absolute' }} />
                                <View style={{ backgroundColor: '#1DD75F', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#1DD75F', shadowOffset: {width:0, height:4}, shadowOpacity: 0.5 }}>
                                    <Ionicons name="search" size={24} color="#000" />
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', position: 'absolute', bottom: 8, width: '100%', justifyContent: 'space-evenly', opacity: 0.15 }}>
                                {[1,2,3,4].map(i => <View key={i} style={{ width: 16, height: 12, backgroundColor: '#fff', borderRadius: 2 }} />)}
                            </View>
                        </View>
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
