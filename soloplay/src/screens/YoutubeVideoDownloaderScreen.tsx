import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Image, Keyboard, Animated, Dimensions, ScrollView, PanResponder, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { saveToExternalStorage } from '../utils/fileStorage';
import YoutubeIframe from 'react-native-youtube-iframe';
import { colors, typography } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useVideoStore } from '../store/useVideoStore';

interface YoutubeVideoDownloaderProps {
  onBack: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
}

export const YoutubeVideoDownloaderScreen = ({ onBack }: YoutubeVideoDownloaderProps) => {
  const insets = useSafeAreaInsets();
  const categories = useVideoStore(state => state.categories);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  
  const activeDownloads = useVideoStore(state => state.activeDownloads);
  const addActiveDownload = useVideoStore(state => state.addActiveDownload);
  const removeActiveDownload = useVideoStore(state => state.removeActiveDownload);
  const updateActiveDownloadProgress = useVideoStore(state => state.updateActiveDownloadProgress);
  
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
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
        const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        
        const parsedResults: SearchResult[] = [];
        const seenIds = new Set<string>();
        
        const extractVideo = (video: any, isShort: boolean = false) => {
          // Handle shortsLockupViewModel
          if (video && video.entityId && video.entityId.includes('shorts-shelf-item')) {
            const videoId = video.onTap?.innertubeCommand?.commandMetadata?.webCommandMetadata?.url?.split('/shorts/')[1] || video.entityId.split('-').pop();
            if (videoId && !seenIds.has(videoId)) {
              seenIds.add(videoId);
              parsedResults.push({
                id: videoId,
                title: video.overlayMetadata?.primaryText?.content || 'İsimsiz Kısa Video',
                thumbnail: video.thumbnailViewModel?.thumbnailViewModel?.image?.sources?.[0]?.url || '',
                duration: 'Short',
                author: 'Kısa Video' // Usually not provided clearly at root level
              });
            }
            return;
          }

          if (video && video.videoId && !seenIds.has(video.videoId)) {
            seenIds.add(video.videoId);
            let titleText = 'İsimsiz Video';
            if (video.title?.runs?.[0]?.text) {
              titleText = video.title.runs[0].text;
            } else if (video.headline?.simpleText) {
              titleText = video.headline.simpleText;
            }

            let authorText = 'Bilinmeyen Kanal';
            if (video.ownerText?.runs?.[0]?.text) {
              authorText = video.ownerText.runs[0].text;
            } else if (video.shortBylineText?.runs?.[0]?.text) {
              authorText = video.shortBylineText.runs[0].text;
            }

            parsedResults.push({
              id: video.videoId,
              title: titleText,
              thumbnail: video.thumbnail?.thumbnails?.[0]?.url || '',
              duration: isShort ? 'Short' : (video.lengthText?.simpleText || '0:00'),
              author: authorText
            });
          }
        };

        for (const section of sections) {
          const sectionContents = section?.itemSectionRenderer?.contents || [];
          for (const item of sectionContents) {
            if (item.videoRenderer) {
              extractVideo(item.videoRenderer);
            } else if (item.reelShelfRenderer) {
              const reelItems = item.reelShelfRenderer.items || [];
              for (const rItem of reelItems) {
                if (rItem.reelItemRenderer) {
                  extractVideo(rItem.reelItemRenderer, true);
                } else if (rItem.shortsLockupViewModel) {
                  extractVideo(rItem.shortsLockupViewModel, true);
                }
              }
            } else if (item.shelfRenderer) {
              const content = item.shelfRenderer.content;
              let items = [];
              if (content?.verticalListRenderer) {
                items = content.verticalListRenderer.items;
              } else if (content?.horizontalListRenderer) {
                items = content.horizontalListRenderer.items;
              } else if (content?.expandedShelfContentsRenderer) {
                items = content.expandedShelfContentsRenderer.items;
              }
              
              for (const sItem of items || []) {
                if (sItem.videoRenderer) extractVideo(sItem.videoRenderer);
                if (sItem.reelItemRenderer) extractVideo(sItem.reelItemRenderer, true);
                if (sItem.shortsLockupViewModel) extractVideo(sItem.shortsLockupViewModel, true);
              }
            }
          }
        }
        
        setResults(parsedResults);
      }
    } catch (error) {
      console.error("Arama hatası:", error);
      alert("Arama yapılırken bir hata oluştu.");
    } finally {
      setIsSearching(false);
    }
  };

  const fetchVideoUrl = async (videoId: string, onProgress: (p: number) => void): Promise<string | null> => {
    try {
      const startUrl = `https://loader.to/ajax/download.php?format=720&url=https://www.youtube.com/watch?v=${videoId}`;
      const startResp = await fetch(startUrl);
      const startData = await startResp.json();
      
      if (!startData.success || !startData.progress_url) return null;
      
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const progressResp = await fetch(startData.progress_url);
        const progressData = await progressResp.json();
        
        if (progressData.success === 1 && progressData.download_url) {
          onProgress(50);
          return progressData.download_url;
        }
        if (progressData.progress !== undefined) {
          const percent = Math.floor(progressData.progress / 20); // 0-50%
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
      author: item.author,
      thumbnail: item.thumbnail,
      progress: 0
    });
    
    try {
      const videoUrl = await fetchVideoUrl(item.id, (p) => {
        updateActiveDownloadProgress(item.id, p);
      });
      
      if (!videoUrl) {
        alert("Video akışı bulunamadı.");
        removeActiveDownload(item.id);
        return;
      }
      
      const safeTitle = item.title.replace(/[^a-zA-Z0-9 ğüşöçİĞÜŞÖÇ]/g, "").trim().substring(0, 50);
      const fileName = `${safeTitle}_${item.id}.mp4`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      updateActiveDownloadProgress(item.id, 75);
      
      const downloadResult = await FileSystem.downloadAsync(videoUrl, fileUri);
      
      if (!downloadResult || (downloadResult.status !== 200 && downloadResult.status !== 206)) {
        alert("İndirme başarısız.");
        removeActiveDownload(item.id);
        return;
      }
      
      let targetCategoryId = 'vid_cat_default';
      const ytCategory = categories.find(c => c.name === 'İndirilen Videolar' || c.id === 'vid_cat_default');
      if (ytCategory) targetCategoryId = ytCategory.id;
      
      useVideoStore.getState().addVideoToCategory(targetCategoryId, {
        id: item.id,
        title: item.title,
        uri: downloadResult.uri,
        thumbnail: item.thumbnail,
        duration: item.duration,
        author: item.author,
        addedAt: Date.now()
      });
      
      try {
        await saveToExternalStorage(downloadResult.uri, fileName, 'Video', 'video/mp4');
      } catch (e) {
        console.log("Video dışa aktarılamadı:", e);
      }
      
      alert(`"${item.title}" başarıyla indirildi.`);
      removeActiveDownload(item.id);
    } catch (error) {
      alert('İndirme sırasında hata oluştu.');
      removeActiveDownload(item.id);
    }
  };

  const getDownloadedVideos = () => {
    const allVideos = categories.flatMap(c => c.videos);
    return allVideos;
  };
  const downloadedVideos = getDownloadedVideos();

  const handleRemoveVideo = async (videoId: string, uri: string) => {
    for (const cat of categories) {
      if (cat.videos.find(v => v.id === videoId)) {
        useVideoStore.getState().removeVideoFromCategory(cat.id, videoId);
        break;
      }
    }
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (e) {
      console.log('Dosya silinemedi:', e);
    }
  };

  const SwipeableHistoryItem = ({ video }: { video: any }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const screenWidth = Dimensions.get('window').width;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 15,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) translateX.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -screenWidth * 0.35) {
            Animated.timing(translateX, { toValue: -screenWidth, duration: 200, useNativeDriver: true }).start(() => handleRemoveVideo(video.id, video.uri));
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
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
        <Animated.View style={[styles.historyItem, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
          {video.thumbnail ? (
            <Image source={{ uri: video.thumbnail }} style={styles.historyThumb} />
          ) : (
            <View style={[styles.historyThumb, { justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="videocam" size={22} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.historyInfo}>
            <Text style={styles.historyTitle} numberOfLines={1}>{video.title}</Text>
            <Text style={styles.historyArtist} numberOfLines={1}>{video.author}</Text>
          </View>
          {activeDownloads[video.id] ? (
            <Text style={{ marginRight: 15, color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>
              {activeDownloads[video.id].progress || 0}%
            </Text>
          ) : (
            <TouchableOpacity onPress={() => alert('Player eklenecek')} style={{ padding: 10 }}>
              <Ionicons name="play" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    );
  };

  const renderDownloadHistory = () => {
    const activeList = Object.values(activeDownloads).map(d => ({ ...d, uri: 'dl_' + d.id }));
    const combinedList = [...activeList.reverse(), ...downloadedVideos.slice().reverse()];
    if (combinedList.length === 0) return null;
    return (
      <View style={styles.historySection}>
        <View style={styles.historySectionHeader}>
          <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
          <Text style={styles.historySectionTitle}>Video İndirme Geçmişi</Text>
          <Text style={styles.historyCount}>{combinedList.length} video</Text>
        </View>
        {combinedList.map((video, index) => (
          <SwipeableHistoryItem key={video.uri + '_' + index} video={video} />
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: SearchResult }) => {
    const isDownloaded = downloadedVideos.some(v => v.id === item.id);
    const isDownloading = !!activeDownloads[item.id];
    return (
      <TouchableOpacity style={styles.resultItem} onPress={() => { setPreviewVideoId(item.id); setIsPreviewVisible(true); }}>
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
            placeholder="YouTube'da video ara..."
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
          <Text style={styles.loadingText}>Videolar Aranıyor...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList data={results} keyExtractor={item => item.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
          {renderDownloadHistory()}
        </ScrollView>
      )}

      <Modal visible={isPreviewVisible} transparent={true} animationType="slide" onRequestClose={() => setIsPreviewVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ön İzleme</Text>
              <TouchableOpacity onPress={() => setIsPreviewVisible(false)}>
                <Ionicons name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {previewVideoId && (
              <View style={styles.iframeContainer}>
                <YoutubeIframe height={220} videoId={previewVideoId} play={true} />
              </View>
            )}
            <TouchableOpacity style={styles.modalDownloadBtn} onPress={() => { setIsPreviewVisible(false); const item = results.find(r => r.id === previewVideoId); if (item) handleDownload(item); }}>
              <Ionicons name="download" size={20} color="white" style={{marginRight: 8}}/>
              <Text style={styles.modalDownloadText}>Bu Videoyu İndir (720p)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, marginLeft: 10, height: 44 },
  searchIcon: { paddingLeft: 12 },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingHorizontal: 10, height: '100%' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { color: colors.textSecondary, marginTop: 12, fontSize: 16 },
  resultItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 10, marginBottom: 12 },
  thumbnail: { width: 100, height: 56, borderRadius: 8, backgroundColor: colors.surfaceLight },
  resultInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  resultTitle: { color: colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  resultSubtitle: { color: colors.textSecondary, fontSize: 12 },
  downloadButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF4444', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  historySection: { marginTop: 10 },
  historySectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingHorizontal: 4 },
  historySectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginLeft: 8, flex: 1 },
  historyCount: { color: colors.textSecondary, fontSize: 13 },
  swipeContainer: { marginBottom: 10, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  swipeDeleteBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FF3B30', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 20, gap: 6 },
  swipeDeleteText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 10 },
  historyThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.surfaceLight },
  historyInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  historyTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  historyArtist: { color: colors.textSecondary, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 20, paddingTop: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  iframeContainer: { borderRadius: 12, overflow: 'hidden', backgroundColor: 'black', marginBottom: 20, marginHorizontal: 20 },
  modalDownloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, marginHorizontal: 20 },
  modalDownloadText: { color: 'white', fontSize: 16, fontWeight: '700' }
});
