import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated, Dimensions, PanResponder, Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { useAudio } from '../context/AudioContext';
import { MiniPlayer } from '../components/MiniPlayer';
import { AnimatedRing } from '../components/AnimatedRing';
import { colors, typography } from '../theme/theme';

export const PlaylistScreen = ({ 
  playlistId, 
  playlistName, 
  onBack, 
  onPlayTrack,
  onOpenPlayer
}: { 
  playlistId: string;
  playlistName: string;
  onBack: () => void;
  onPlayTrack: (track: Track, positionMillis?: number) => void;
  onOpenPlayer: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const { currentPlaylistId, isPlaying, currentTrackName, pause, resume } = useAudio();
  const memory = usePlayerStore(state => state.memory[playlistId]);
  const playlist = usePlayerStore(state => state.playlists.find(p => p.id === playlistId));
  
  const tracks = playlist?.tracks || [];

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleRemoveTrack = async (trackUri: string) => {
    usePlayerStore.getState().removeTrack(playlistId, trackUri);
    try {
      await FileSystem.deleteAsync(trackUri, { idempotent: true });
    } catch (e) {
      console.log('Dosya silinemedi:', e);
    }
  };

const SwipeableTrackItem = React.memo(({ 
  item, 
  isActiveTrack, 
  isPlayingThis,
  onPlayTrack,
  onRemoveTrack
}: { 
  item: Track, 
  isActiveTrack: boolean, 
  isPlayingThis: boolean,
  onPlayTrack: (track: Track, pos: number) => void,
  onRemoveTrack: (uri: string) => void
}) => {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;

  const panResponder = React.useRef(
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
          }).start(() => onRemoveTrack(item.uri));
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
        style={[
          styles.trackItem, 
          isActiveTrack && styles.activeTrackItem,
          { transform: [{ translateX }] }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.trackItemTouchable}
          onPress={() => onPlayTrack(item, 0)}
        >
          {item.artwork ? (
            <Image source={{ uri: item.artwork }} style={styles.trackThumb} />
          ) : (
            <AnimatedRing size={36} isPlaying={isPlayingThis}>
              <Ionicons 
                name={isActiveTrack ? "play" : "musical-note"} 
                size={20} 
                color={isActiveTrack ? colors.primary : colors.textSecondary} 
              />
            </AnimatedRing>
          )}
          
          <View style={styles.trackInfoContainer}>
            <Text style={[styles.trackName, isActiveTrack && { color: colors.primary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {item.artist || 'Bilinmeyen'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onRemoveTrack(item.uri)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.item.uri === nextProps.item.uri &&
         prevProps.isActiveTrack === nextProps.isActiveTrack &&
         prevProps.isPlayingThis === nextProps.isPlayingThis;
});

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={typography.header} numberOfLines={1}>{playlistName}</Text>
      </View>

      {memory && currentPlaylistId !== playlistId && (
        <View style={styles.memoryCard}>
          <Text style={styles.memoryLabel}>Kaldığın Yerden Devam Et:</Text>
          <Text style={styles.memoryTrack} numberOfLines={1}>{memory.trackName}</Text>
          <Text style={styles.memoryTime}>{formatTime(memory.positionMillis)}</Text>
          <TouchableOpacity 
            style={styles.resumeButton}
            onPress={() => onPlayTrack({ uri: memory.trackUri, name: memory.trackName }, memory.positionMillis)}
          >
            <Ionicons name="play" size={20} color={colors.background} />
            <Text style={styles.resumeButtonText}>Devam Et</Text>
          </TouchableOpacity>
        </View>
      )}

      {tracks.length === 0 ? (
        <Text style={styles.emptyText}>Bu çalma listesinde parça bulunamadı.</Text>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={item => item.uri}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => (
            { length: 76, offset: 76 * index, index } // Assuming trackItem is ~76px tall
          )}
          contentContainerStyle={{ paddingBottom: Math.max(100, insets.bottom + 90) }}
          renderItem={({ item }) => {
            const isPlayingThis = currentPlaylistId === playlistId && currentTrackName === item.name && isPlaying;
            const isActiveTrack = 
              (currentPlaylistId === playlistId && currentTrackName === item.name) || 
              (currentPlaylistId !== playlistId && memory?.trackName === item.name);
              
            return (
              <SwipeableTrackItem 
                item={item} 
                isActiveTrack={isActiveTrack} 
                isPlayingThis={isPlayingThis} 
                onPlayTrack={onPlayTrack}
                onRemoveTrack={handleRemoveTrack}
              />
            );
          }}
        />
      )}

      {currentPlaylistId === playlistId && currentTrackName && (
        <MiniPlayer 
          safeAreaBottom={insets.bottom}
          onPress={onOpenPlayer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  memoryCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  memoryLabel: {
    ...typography.subtitle,
    color: colors.primary,
    marginBottom: 5,
  },
  memoryTrack: {
    ...typography.title,
    fontSize: 16,
    marginBottom: 5,
  },
  memoryTime: {
    ...typography.subtitle,
    marginBottom: 15,
  },
  resumeButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  resumeButtonText: {
    color: colors.background,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  trackItem: {
    backgroundColor: colors.background,
  },
  trackItemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeTrackItem: {
    backgroundColor: colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  trackThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: colors.surfaceLight,
  },
  trackInfoContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  trackName: {
    ...typography.title,
    fontSize: 15,
  },
  trackArtist: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 5,
  },
  swipeContainer: {
    position: 'relative',
  },
  swipeDeleteBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF3B30',
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
  }
});
