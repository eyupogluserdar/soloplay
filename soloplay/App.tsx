import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, PermissionsAndroid, Platform, BackHandler, ToastAndroid } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioProvider, useAudio } from './src/context/AudioContext';
import { PlaylistsScreen } from './src/screens/PlaylistsScreen';
import { PlaylistScreen } from './src/screens/PlaylistScreen';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { MusicDashboardScreen } from './src/screens/MusicDashboardScreen';
import { MediaCategoryScreen } from './src/screens/MediaCategoryScreen';
import { WebBrowserScreen } from './src/screens/WebBrowserScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { AIMemoryScreen } from './src/screens/AIMemoryScreen';
import { AssistantScreen } from './src/screens/AssistantScreen'; // New Import
import { colors } from './src/theme/theme';
import { usePlayerStore } from './src/store/usePlayerStore';
import { BottomTabBar } from './src/components/BottomTabBar';
import { MiniPlayer } from './src/components/MiniPlayer';
import { PostHogProvider } from 'posthog-react-native';
import { posthog, trackScreen } from './src/utils/analytics';
import { checkAppVersion } from './src/utils/versionCheck';
import { useProfileStore } from './src/store/useProfileStore';

type ScreenState = 
  | { name: 'Dashboard' }
  | { name: 'MusicDashboard' }
  | { name: 'MediaCategory'; categoryTitle: string }
  | { name: 'Playlists' }
  | { name: 'WebBrowser' }
  | { name: 'Scan' }
  | { name: 'Video' }
  | { name: 'AIMemory' }
  | { name: 'Assistant' }
  | { name: 'Playlist'; id: string; playlistName: string };

const Main = () => {
    const isProfileComplete = useProfileStore(state => state.isProfileComplete);
  const [screen, setScreen] = useState<ScreenState>(isProfileComplete ? { name: 'Dashboard' } : { name: 'Assistant' });
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isGlobalListening, setIsGlobalListening] = useState(false);
  
  const { playTrack, currentTrackName } = useAudio();
  const currentPlaylistId = usePlayerStore(state => state.currentPlaylistId);
  const playlists = usePlayerStore(state => state.playlists);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    trackScreen(screen.name);
  }, [screen.name]);

  // OTA GÃ¼ncellemesi ve APK SÃ¼rÃ¼m KontrolÃ¼
  useEffect(() => {
    async function checkForUpdates() {
      // 1. Manuel APK (DÄ±ÅŸarÄ±dan YÃ¼klenen) GÃ¼ncelleme KontrolÃ¼
      await checkAppVersion();
      
      try {
        if (__DEV__) return;
        // 2. OTA (Expo Arka Plan) GÃ¼ncelleme KontrolÃ¼
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
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
        .catch(console.error);
    }
  }, []);

  const [backPressCount, setBackPressCount] = useState(0);

  useEffect(() => {
    const handleBackPress = () => {
      if (isPlayerOpen) {
        setIsPlayerOpen(false);
        return true;
      }

      if (screen.name === 'Playlist' || screen.name === 'Playlists' || screen.name === 'MediaCategory') {
        setScreen({ name: 'MusicDashboard' });
        return true;
      }

      if (screen.name === 'MusicDashboard' || screen.name === 'Scan' || screen.name === 'WebBrowser' || screen.name === 'Video' || screen.name === 'Assistant') {
        setScreen({ name: 'Dashboard' });
        return true;
      }

      if (screen.name === 'Dashboard') {
        if (backPressCount === 0) {
          setBackPressCount(1);
          ToastAndroid.show('Ã‡Ä±kmak iÃ§in tekrar basÄ±n', ToastAndroid.SHORT);
          setTimeout(() => setBackPressCount(0), 2000);
          return true;
        } else {
          return false; // let Android exit the app
        }
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [screen, isPlayerOpen, backPressCount]);

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
    if (screen.name !== screenName) {
      setScreen({ name: screenName as any });
    }
  };

  // BottomTabBar'Ä±n tam fiziksel yÃ¼ksekliÄŸi: 
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
            onNavigateToCategory={(title) => setScreen({ name: 'MediaCategory', categoryTitle: title })}
          />
        )}
        {screen.name === 'MediaCategory' && (
          <MediaCategoryScreen 
            categoryTitle={screen.categoryTitle}
            onBack={() => setScreen({ name: 'MusicDashboard' })}
          />
        )}
        {screen.name === 'Playlists' && (
          <PlaylistsScreen 
            onSelectPlaylist={handleSelectPlaylist} 
            onOpenPlayer={() => setIsPlayerOpen(true)}
            onBack={() => setScreen({ name: 'MusicDashboard' })}
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
        {screen.name === 'AIMemory' && (
          <AIMemoryScreen onNavigate={handleNavigate} />
        )}
        {screen.name === 'Assistant' && (
          <AssistantScreen 
            onBack={() => {
              setScreen({ name: 'Dashboard' });
              setIsGlobalListening(false);
            }}
            onNavigateToScan={() => setScreen({ name: 'Scan' })}
            isListening={isGlobalListening}
            setIsListening={setIsGlobalListening}
          />
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
          isListening={isGlobalListening}
          onLongPressAssistant={() => {
            if (screen.name === 'Assistant') {
              setIsGlobalListening(prev => !prev);
            } else {
              setScreen({ name: 'Assistant' });
              setIsGlobalListening(true);
            }
          }}
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




