import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioProvider, useAudio } from './src/context/AudioContext';
import { PlaylistsScreen } from './src/screens/PlaylistsScreen';
import { PlaylistScreen } from './src/screens/PlaylistScreen';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { MusicDashboardScreen } from './src/screens/MusicDashboardScreen';
import { YoutubeDownloaderScreen } from './src/screens/YoutubeDownloaderScreen';
import { WebBrowserScreen } from './src/screens/WebBrowserScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import { colors } from './src/theme/theme';
import { usePlayerStore } from './src/store/usePlayerStore';
import { BottomTabBar } from './src/components/BottomTabBar';
import { MiniPlayer } from './src/components/MiniPlayer';
import { VideoPlayerModal } from './src/components/VideoPlayerModal';
import VideoScreen from './src/screens/VideoScreen';
import { YoutubeVideoDownloaderScreen } from './src/screens/YoutubeVideoDownloaderScreen';
import { PostHogProvider } from 'posthog-react-native';
import { posthog, trackScreen } from './src/utils/analytics';
import { checkAppVersion } from './src/utils/versionCheck';
import { useVideoStore } from './src/store/useVideoStore';

type ScreenState = 
  | { name: 'Dashboard' }
  | { name: 'MusicDashboard' }
  | { name: 'Playlists' }
  | { name: 'YoutubeDownloader' }
  | { name: 'YoutubeVideoDownloader' }
  | { name: 'WebBrowser' }
  | { name: 'Scan' }
  | { name: 'Video' }
  | { name: 'Documents' }
  | { name: 'Playlist'; id: string; playlistName: string };

const Main = () => {
  const [screen, setScreen] = useState<ScreenState>({ name: 'Dashboard' });
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const { playTrack, currentTrackName } = useAudio();
  const currentPlaylistId = usePlayerStore(state => state.currentPlaylistId);
  const playlists = usePlayerStore(state => state.playlists);
  const activeVideo = useVideoStore(state => state.activeVideo);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    trackScreen(screen.name);
  }, [screen.name]);

  // OTA Güncellemesi ve APK Sürüm Kontrolü
  useEffect(() => {
    async function checkForUpdates() {
      // 1. Manuel APK (Dışarıdan Yüklenen) Güncelleme Kontrolü
      await checkAppVersion();
      
      try {
        if (__DEV__) return;
        // 2. OTA (Expo Arka Plan) Güncelleme Kontrolü
        const Updates = require('expo-updates');
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.log("Error fetching update: ", error);
      }
    }
    checkForUpdates();
  }, []);

  useEffect(() => {
    usePlayerStore.getState().loadInitialState().then(() => {});
    useVideoStore.getState().loadInitialState().then(() => {});
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
        .catch(console.error);
    }
  }, []);

  const handleSelectPlaylist = (id: string, name: string) => {
    setScreen({ name: 'Playlist', id, playlistName: name });
  };

  const handlePlayTrack = async (track: { uri: string; name: string }, positionMillis: number = 0) => {
    if (screen.name === 'Playlist') {
      const pId = screen.id;
      setIsPlayerOpen(true);
      await playTrack(track.uri, track.name, pId, positionMillis);
    }
  };

  const handleNavigate = (screenName: string) => {
    setScreen({ name: screenName as any });
  };

  // BottomTabBar'ın tam fiziksel yüksekliği: 
  // paddingTop (10) + borderTop (1) + icon (40) + marginBottom (4) + text (~12) = 67
  const bottomBarHeight = 67 + Math.max(insets.bottom, 10);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingBottom: bottomBarHeight }}>
        {screen.name === 'Dashboard' && (
          <DashboardScreen 
            onNavigate={handleNavigate}
            onNavigateToPlaylist={(id, name) => setScreen({ name: 'Playlist', id, playlistName: name })}
            onOpenPlayer={() => setIsPlayerOpen(true)}
          />
        )}
        {screen.name === 'MusicDashboard' && (
          <MusicDashboardScreen 
            onNavigate={handleNavigate}
            onNavigateToPlaylist={(id, name) => setScreen({ name: 'Playlist', id, playlistName: name })}
            onOpenPlayer={() => setIsPlayerOpen(true)}
            onBack={() => setScreen({ name: 'Dashboard' })}
          />
        )}
        {screen.name === 'Playlists' && (
          <PlaylistsScreen 
            onSelectPlaylist={handleSelectPlaylist} 
            onOpenPlayer={() => setIsPlayerOpen(true)}
            onBack={() => setScreen({ name: 'MusicDashboard' })}
          />
        )}
        {screen.name === 'YoutubeDownloader' && (
          <YoutubeDownloaderScreen 
            onOpenPlayer={() => setIsPlayerOpen(true)}
            onBack={() => setScreen({ name: 'Dashboard' })}
          />
        )}
        {screen.name === 'YoutubeVideoDownloader' && (
          <YoutubeVideoDownloaderScreen 
            onBack={() => setScreen({ name: 'Video' })}
          />
        )}
        {screen.name === 'Video' && (
          <VideoScreen 
            onNavigate={handleNavigate}
            onBack={() => setScreen({ name: 'Dashboard' })}
          />
        )}
        {screen.name === 'WebBrowser' && (
          <WebBrowserScreen 
            onBack={() => setScreen({ name: 'Dashboard' })}
          />
        )}
        {screen.name === 'Scan' && (
          <ScanScreen 
            onBack={() => setScreen({ name: 'Dashboard' })}
          />
        )}
        {screen.name === 'Documents' && (
          <DocumentsScreen />
        )}
        {screen.name === 'Playlist' && (
          <PlaylistScreen 
            playlistId={screen.id} 
            playlistName={screen.playlistName}
            onBack={() => setScreen({ name: 'MusicDashboard' })}
            onPlayTrack={handlePlayTrack}
            onOpenPlayer={() => setIsPlayerOpen(true)}
          />
        )}
      </View>

      {/* Global MiniPlayer - Always visible above bottom bar if track is loaded */}
      {currentPlaylistId && currentTrackName && !isPlayerOpen && (
        <MiniPlayer 
          safeAreaBottom={insets.bottom}
          bottomOffset={bottomBarHeight}
          onPress={() => {
            setIsPlayerOpen(true);
          }}
        />
      )}

      {/* Global Bottom Tab Bar */}
      {!isPlayerOpen && (
        <BottomTabBar 
          currentScreen={screen.name}
          onNavigate={handleNavigate}
        />
      )}

      {/* Global Video Player */}
      <VideoPlayerModal 
        visible={!!activeVideo}
        video={activeVideo}
        onClose={() => useVideoStore.getState().setActiveVideo(null)}
        bottomOffset={bottomBarHeight}
      />

      {/* Fullscreen Player Modal */}
      {isPlayerOpen && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <PlayerScreen onBack={() => setIsPlayerOpen(false)} />
        </View>
      )}
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PostHogProvider client={posthog} autocapture>
        <AudioProvider>
          <Main />
        </AudioProvider>
      </PostHogProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

