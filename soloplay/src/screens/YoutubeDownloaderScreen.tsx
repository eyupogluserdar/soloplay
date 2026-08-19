import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Image, Keyboard, Linking, Animated, Dimensions, ScrollView, PanResponder, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { saveToExternalStorage } from '../utils/fileStorage';
import YoutubeIframe from 'react-native-youtube-iframe';
import { colors, typography } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { usePlayerStore } from '../store/usePlayerStore';
import { MiniPlayer } from '../components/MiniPlayer';

interface YoutubeDownloaderProps {
  onBack: () => void;
  onOpenPlayer: (playlistId: string, playlistName: string) => void;
}

interface SearchResult {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
}

export const YoutubeDownloaderScreen = ({ onBack, onOpenPlayer }: YoutubeDownloaderProps) => {
  const insets = useSafeAreaInsets();
  const { currentPlaylistId: activePlaylistIdFromAudio, currentTrackName, pause, playTrack } = useAudio();
  const playlists = usePlayerStore(state => state.playlists);
  const addPlaylist = usePlayerStore(state => state.addPlaylist);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  
  const activeDownloads = usePlayerStore(state => state.activeDownloads);
  const addActiveDownload = usePlayerStore(state => state.addActiveDownload);
  const removeActiveDownload = usePlayerStore(state => state.removeActiveDownload);
  
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (text.trim().length === 0) {
      setResults([]);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(text);
    }, 600);
  };

  const handleSearch = async (queryOverride?: string) => {
    const queryToSearch = queryOverride !== undefined ? queryOverride : searchQuery;
    if (!queryToSearch.trim()) return;
    
    setIsSearching(true);

    try {
      const query = encodeURIComponent(queryToSearch.trim());
      const response = await fetch(`https://www.youtube.com/results?search_query=${query}`);
      const html = await response.text();
      
      const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
      if (match && match[1]) {
        const data = JSON.parse(match[1]);
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents;
        
        if (contents) {
          const parsedResults: SearchResult[] = [];
          for (const item of contents) {
            const video = item.videoRenderer;
            if (video) {
              parsedResults.push({
                id: video.videoId,
                title: video.title?.runs[0]?.text || 'İsimsiz Video',
                thumbnail: video.thumbnail?.thumbnails[0]?.url || '',
                duration: video.lengthText?.simpleText || '0:00',
                author: video.ownerText?.runs[0]?.text || 'Bilinmeyen Kanal'
              });
            }
          }
          setResults(parsedResults);
        }
      }
    } catch (error) {
      console.error("Arama hatası:", error);
      alert("Arama yapılırken bir hata oluştu.");
    } finally {
      setIsSearching(false);
    }
  };

  const openPreview = async (id: string) => {
    await pause();
    setPreviewVideoId(id);
    setIsPreviewVisible(true);
  };

  const fetchAudioUrl = async (videoId: string, onProgress: (p: number) => void): Promise<string | null> => {
    try {
      const startUrl = `https://loader.to/ajax/download.php?format=mp3&url=https://www.youtube.com/watch?v=${videoId}`;
      const startResp = await fetch(startUrl);
      const startData = await startResp.json();
      
      if (!startData.success || !startData.progress_url) {
        return null;
      }
      
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const progressResp = await fetch(startData.progress_url);
        const progressData = await progressResp.json();
        
        if (progressData.success === 1 && progressData.download_url) {
          onProgress(50);
          return progressData.download_url;
        }
        if (progressData.progress !== undefined) {
          // progressData.progress is up to 1000. Scale to 0-50%
          const percent = Math.floor(progressData.progress / 20);
          onProgress(percent);
        }
        if (progressData.text === 'error') return null;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleDownload = async (item: SearchResult) => {
    if (activeDownloads[item.id]) return;

    addActiveDownload({
      id: item.id,
      title: item.title,
      artist: item.author,
      artwork: item.thumbnail,
      progress: 0
    });
    try {
      const audioUrl = await fetchAudioUrl(item.id, (p) => {
        usePlayerStore.getState().updateActiveDownloadProgress(item.id, p);
      });
      if (!audioUrl) {
        alert("Ses akışı bulunamadı. Lütfen başka bir parça deneyin.");
        removeActiveDownload(item.id);
        return;
      }
      
      const safeTitle = item.title.replace(/[^a-zA-Z0-9 ğüşöçİĞÜŞÖÇ]/g, "").trim().substring(0, 50);
      const fileName = `${safeTitle}_${item.id}.mp3`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      // Conversion bitti, indirme başlıyor (sanal olarak %75 gösterelim)
      usePlayerStore.getState().updateActiveDownloadProgress(item.id, 75);
      
      const downloadResult = await FileSystem.downloadAsync(audioUrl, fileUri);
      
      if (!downloadResult || (downloadResult.status !== 200 && downloadResult.status !== 206)) {
        alert(`İndirme başarısız. Hata kodu: ${downloadResult?.status || 'Bilinmiyor'}`);
        removeActiveDownload(item.id);
        return;
      }
      
      try {
        await saveToExternalStorage(downloadResult.uri, fileName, 'Müzik', 'audio/mpeg');
      } catch (e) {
        console.log("Dosya dışa aktarılamadı:", e);
      }
      
      let targetPlaylistId: string;
      const ytPlaylist = playlists.find(p => p.name === 'YouTube İndirilenler');
      
      if (ytPlaylist) {
        targetPlaylistId = ytPlaylist.id;
      } else if (playlists.length > 0) {
        targetPlaylistId = playlists[0].id;
      } else {
        const newId = 'yt_downloads_' + Date.now();
        addPlaylist({ id: newId, name: 'YouTube İndirilenler', tracks: [] });
        targetPlaylistId = newId;
      }
      
      usePlayerStore.getState().addTrack(targetPlaylistId, {
        id: item.id,
        name: item.title,
        artist: item.author,
        artwork: item.thumbnail,
        uri: downloadResult.uri
      });
      
      alert(`"${item.title}" başarıyla indirildi.`);
      removeActiveDownload(item.id);
    } catch (error) {
      alert('İndirme sırasında bir hata oluştu.');
      removeActiveDownload(item.id);
    }
  };

  const getDownloadedTracks = () => {
    const ytPlaylist = playlists.find(p => p.name === 'YouTube İndirilenler');
    if (ytPlaylist) return { playlist: ytPlaylist, tracks: ytPlaylist.tracks };
    if (playlists.length > 0) {
      const first = playlists[0];
      const ytTracks = first.tracks.filter(t => t.id && t.artwork);
      return { playlist: first, tracks: ytTracks };
    }
    return { playlist: null, tracks: [] };
  };

  const { playlist: downloadPlaylist, tracks: downloadedTracks } = getDownloadedTracks();

  const handlePlayHistoryItem = async (track: any) => {
    if (activeDownloads[track.id]) return;
    if (downloadPlaylist) {
      onOpenPlayer(downloadPlaylist.id, downloadPlaylist.name);
      await playTrack(track.uri, track.name || track.title, downloadPlaylist.id);
    }
  };

  const handleRemoveTrack = async (trackUri: string) => {
    if (!downloadPlaylist) return;
    usePlayerStore.getState().removeTrack(downloadPlaylist.id, trackUri);
    try {
      await FileSystem.deleteAsync(trackUri, { idempotent: true });
    } catch (e) {
      console.log('Dosya silinemedi:', e);
    }
  };

  const SwipeableHistoryItem = ({ track }: { track: any }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const screenWidth = Dimensions.get('window').width;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_: any, gestureState: any) => {
          return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 15;
        },
        onPanResponderMove: (_: any, gestureState: any) => {
          if (gestureState.dx < 0) {
            translateX.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_: any, gestureState: any) => {
          if (gestureState.dx < -screenWidth * 0.35) {
            Animated.timing(translateX, {
              toValue: -screenWidth,
              duration: 200,
              useNativeDriver: true,
            }).start(() => handleRemoveTrack(track.uri));
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      })
    ).current;

    return (
      <View style={styles.swipeContainer}>
        <View style={styles.swipeDeleteBg}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.swipeDeleteText}>Sil</Text>
        </View>
        <Animated.View 
          style={[styles.historyItem, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          {track.artwork ? (
            <Image source={{ uri: track.artwork }} style={styles.historyThumb} />
          ) : (
            <View style={[styles.historyThumb, { justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="musical-notes" size={22} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.historyInfo}>
            <Text style={styles.historyTitle} numberOfLines={1}>{track.name || track.title}</Text>
            <Text style={styles.historyArtist} numberOfLines={1}>{track.artist}</Text>
          </View>
          {activeDownloads[track.id] ? (
            <Text style={{ marginRight: 15, color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>
              {activeDownloads[track.id].progress || 0}%
            </Text>
          ) : (
            <TouchableOpacity onPress={() => handlePlayHistoryItem(track)} style={{ padding: 10, marginRight: 5 }}>
              <Ionicons name="play" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    );
  };

  const renderDownloadHistory = () => {
    const ytPlaylist = playlists.find(p => p.name === 'YouTube İndirilenler');
    const downloadedTracks = ytPlaylist ? ytPlaylist.tracks : [];
    const activeList = Object.values(activeDownloads).map(d => ({
      id: d.id,
      name: d.title,
      artist: d.artist,
      artwork: d.artwork,
      progress: d.progress,
      uri: 'downloading_' + d.id
    }));
    const combinedList = [...activeList.reverse(), ...downloadedTracks.slice().reverse()];
    if (combinedList.length === 0) return null;
    return (
      <View style={styles.historySection}>
        <View style={styles.historySectionHeader}>
          <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
          <Text style={styles.historySectionTitle}>İndirme Geçmişi</Text>
          <Text style={styles.historyCount}>{combinedList.length} parça</Text>
        </View>
        {combinedList.map((track, index) => (
          <SwipeableHistoryItem key={track.uri + '_' + index} track={track} />
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: SearchResult }) => {
    const isDownloaded = downloadedTracks.some(t => t.id === item.id);
    const isDownloading = !!activeDownloads[item.id];
    return (
      <TouchableOpacity style={styles.resultItem} onPress={() => openPreview(item.id)}>
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.resultSubtitle}>{item.author} • {item.duration}</Text>
        </View>
        <TouchableOpacity style={styles.downloadButton} onPress={() => {
            if (!isDownloaded && !isDownloading) handleDownload(item);
          }} disabled={isDownloaded || isDownloading}>
          {isDownloading ? (
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
              {activeDownloads[item.id]?.progress || 0}%
            </Text>
          ) : isDownloaded ? <Ionicons name="checkmark-circle" size={26} color={colors.primary} /> : <Ionicons name="download-outline" size={24} color={colors.background} />}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { zIndex: 10 }]}>
        <TouchableOpacity onPress={onBack} style={{ padding: 10, marginLeft: -10 }}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="YouTube'da ara..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={() => { Keyboard.dismiss(); handleSearch(); }}
            returnKeyType="search"
          />
        </View>
      </View>

      {isSearching ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Aranıyor...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList data={results} keyExtractor={item => item.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
          {renderDownloadHistory()}
        </ScrollView>
      )}

      <Modal visible={isPreviewVisible} transparent={true} animationType="slide" onRequestClose={() => { setIsPreviewVisible(false); setPreviewVideoId(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ön İzleme</Text>
              <TouchableOpacity onPress={() => { setIsPreviewVisible(false); setPreviewVideoId(null); }}>
                <Ionicons name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {previewVideoId && (
              <View style={styles.iframeContainer}>
                <YoutubeIframe height={220} videoId={previewVideoId} play={true} />
              </View>
            )}
            <TouchableOpacity style={styles.modalDownloadBtn} onPress={() => { setIsPreviewVisible(false); const item = results.find(r => r.id === previewVideoId); setPreviewVideoId(null); if (item) handleDownload(item); }}>
              <Ionicons name="download" size={20} color="white" style={{marginRight: 8}}/>
              <Text style={styles.modalDownloadText}>Bu Parçayı İndir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {activePlaylistIdFromAudio && currentTrackName && (
        <MiniPlayer 
          safeAreaBottom={insets.bottom}
          onPress={() => {
            const p = playlists.find(p => p.id === activePlaylistIdFromAudio);
            if (p) onOpenPlayer(p.id, p.name);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginLeft: 10,
    height: 44,
  },
  searchIcon: {
    paddingLeft: 12,
  },
  clearIcon: {
    paddingRight: 12,
    paddingLeft: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 10,
    height: '100%',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  thumbnail: {
    width: 100,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  resultTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF4444', // Red for YT
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 20,
  },
  closePreviewButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  youtubeWrapper: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
  },
  previewText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 15,
  },
  // İndirme geçmişi stilleri
  centerContentInline: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  historySection: {
    marginTop: 10,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  historySectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  historyCount: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  swipeContainer: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  swipeDeleteBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 20,
    gap: 6,
  },
  swipeDeleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
  },
  historyThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  historyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyArtist: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  historyDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  iframeContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'black',
    marginBottom: 20,
  },
  modalDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalDownloadText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  }
});
