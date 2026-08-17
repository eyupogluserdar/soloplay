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

type ScreenState = 
  | { name: 'Dashboard' }
  | { name: 'MusicDashboard' }
  | { name: 'Playlists' }
  | { name: 'YoutubeDownloader' }
  | { name: 'WebBrowser' }
  | { name: 'Scan' }
  | { name: 'Playlist'; id: string; playlistName: string };

const Main = () => {
  const [screen, setScreen] = useState<ScreenState>({ name: 'Dashboard' });
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const { playTrack, currentTrackName } = useAudio();
  const currentPlaylistId = usePlayerStore(state => state.currentPlaylistId);
  const playlists = usePlayerStore(state => state.playlists);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    usePlayerStore.getState().loadInitialState().then(() => {});
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

  const bottomBarHeight = 55 + Math.max(insets.bottom, 10);

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
      <AudioProvider>
        <Main />
      </AudioProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

