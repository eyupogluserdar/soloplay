import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, PanResponder, TouchableOpacity, BackHandler, Image, ScrollView } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoStore } from '../store/useVideoStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MINI_PLAYER_HEIGHT = 80;
const MINI_PLAYER_WIDTH = SCREEN_WIDTH * 0.95;
const MINI_VIDEO_WIDTH = 120;
const FULL_VIDEO_HEIGHT = SCREEN_WIDTH * (9 / 16);

interface VideoPlayerModalProps {
  visible: boolean;
  video: { id: string; title: string; uri: string; thumbnail?: string; duration?: string; author?: string } | null;
  onClose: () => void;
  bottomOffset?: number; // e.g. for BottomTabBar
}

export const VideoPlayerModal = ({ visible, video, onClose, bottomOffset = 65 }: VideoPlayerModalProps) => {
  const insets = useSafeAreaInsets();
  
  const videoRef = useRef<Video>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const [isMini, setIsMini] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);

  // When video changes or visible becomes true, reset to fullscreen and start playing
  useEffect(() => {
    if (visible && video) {
      setIsMini(false);
      translateY.setValue(0);
      setIsPlaying(true);
    }
  }, [visible, video]);

  // Handle hardware back button to minimize instead of close, if fullscreen
  useEffect(() => {
    const backAction = () => {
      if (visible && !isMini) {
        minimize();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, isMini]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        const maxY = SCREEN_HEIGHT - MINI_PLAYER_HEIGHT - bottomOffset;
        let newY = isMini ? maxY + gestureState.dy : gestureState.dy;
        if (newY < 0) newY = 0;
        if (newY > maxY + 100) newY = maxY + 100;
        translateY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const maxY = SCREEN_HEIGHT - MINI_PLAYER_HEIGHT - bottomOffset;
        if (gestureState.vy > 1.5 || gestureState.dy > SCREEN_HEIGHT * 0.2) {
          if (isMini) {
            onClose();
          } else {
            Animated.spring(translateY, { toValue: maxY, useNativeDriver: false, bounciness: 0 }).start(() => setIsMini(true));
          }
        } 
        else if (gestureState.vy < -1.5 || gestureState.dy < -SCREEN_HEIGHT * 0.2) {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start(() => setIsMini(false));
        } 
        else {
          if (isMini) {
            Animated.spring(translateY, { toValue: maxY, useNativeDriver: false, bounciness: 0 }).start(() => setIsMini(true));
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start(() => setIsMini(false));
          }
        }
      }
    })
  ).current;

  if (!visible || !video) return null;

  const MAX_TRANSLATE_Y = SCREEN_HEIGHT - MINI_PLAYER_HEIGHT - bottomOffset;

  const minimize = () => {
    Animated.spring(translateY, {
      toValue: MAX_TRANSLATE_Y,
      useNativeDriver: false,
      bounciness: 0
    }).start(() => setIsMini(true));
  };

  const maximize = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 0
    }).start(() => setIsMini(false));
  };

  const handlePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await videoRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const containerHeight = translateY.interpolate({
    inputRange: [0, MAX_TRANSLATE_Y],
    outputRange: [SCREEN_HEIGHT, MINI_PLAYER_HEIGHT],
    extrapolate: 'clamp'
  });

  const containerWidth = translateY.interpolate({
    inputRange: [0, MAX_TRANSLATE_Y],
    outputRange: [SCREEN_WIDTH, MINI_PLAYER_WIDTH],
    extrapolate: 'clamp'
  });

  const containerMarginHorizontal = translateY.interpolate({
    inputRange: [0, MAX_TRANSLATE_Y],
    outputRange: [0, (SCREEN_WIDTH - MINI_PLAYER_WIDTH) / 2],
    extrapolate: 'clamp'
  });

  const videoHeight = translateY.interpolate({
    inputRange: [0, MAX_TRANSLATE_Y],
    outputRange: [FULL_VIDEO_HEIGHT, MINI_PLAYER_HEIGHT],
    extrapolate: 'clamp'
  });

  const videoWidth = translateY.interpolate({
    inputRange: [0, MAX_TRANSLATE_Y],
    outputRange: [SCREEN_WIDTH, MINI_VIDEO_WIDTH],
    extrapolate: 'clamp'
  });

  const contentOpacity = translateY.interpolate({
    inputRange: [0, MAX_TRANSLATE_Y / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const miniContentOpacity = translateY.interpolate({
    inputRange: [MAX_TRANSLATE_Y / 2, MAX_TRANSLATE_Y],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const borderRadius = translateY.interpolate({
    inputRange: [0, MAX_TRANSLATE_Y],
    outputRange: [0, 12],
    extrapolate: 'clamp'
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: containerHeight,
          width: containerWidth,
          transform: [{ translateY }],
          marginHorizontal: containerMarginHorizontal,
          borderRadius: borderRadius,
        }
      ]}
    >
      <View style={styles.innerContainer}>
        {/* Video Alanı */}
        <Animated.View style={{ height: videoHeight, width: videoWidth }} {...panResponder.panHandlers}>
          <TouchableOpacity activeOpacity={1} onPress={isMini ? maximize : undefined} style={StyleSheet.absoluteFill}>
            <Video
              ref={videoRef}
              source={{ uri: video.uri }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={isPlaying}
              useNativeControls={!isMini}
              onPlaybackStatusUpdate={(s) => setStatus(() => s)}
              onError={(e) => console.log('Video error:', e)}
            />
            {/* Sadece mini modda oynatma/duraklatma ikonu üstte gösterilsin */}
            {isMini && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }]}>
                 {!isPlaying && <Ionicons name="play" size={32} color="white" />}
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Mini Player Sağ Kısım Kontrolleri */}
        <Animated.View style={[styles.miniControls, { opacity: miniContentOpacity }]} pointerEvents={isMini ? 'auto' : 'none'}>
          <TouchableOpacity style={{ flex: 1, paddingHorizontal: 10, justifyContent: 'center' }} onPress={maximize}>
            <Text style={styles.miniTitle} numberOfLines={1}>{video.title}</Text>
            <Text style={styles.miniAuthor} numberOfLines={1}>{video.author || 'SoloPlay Video'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.miniBtn} onPress={handlePlayPause}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={26} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.miniBtn} onPress={onClose}>
            <Ionicons name="close" size={26} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Tam Ekran İçerik (Video Altı) */}
        <Animated.View style={[styles.fullContent, { opacity: contentOpacity }]} pointerEvents={isMini ? 'none' : 'auto'}>
          <View style={styles.fullHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fullTitle} numberOfLines={2}>{video.title}</Text>
              <Text style={styles.fullAuthor}>{video.author || 'SoloPlay Video'}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtnIcon} onPress={onClose}>
              <Ionicons name="close-circle-outline" size={32} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.upNextTitle}>Sıradaki Videolar</Text>
          <ScrollView contentContainerStyle={styles.upNextScroll}>
            {useVideoStore.getState().categories.flatMap(c => c.videos)
              .filter(v => v.id !== video.id)
              .map((item, idx) => (
                <TouchableOpacity 
                  key={`upnext_${item.id}_${idx}`} 
                  style={styles.upNextItem}
                  onPress={() => useVideoStore.getState().setActiveVideo(item)}
                >
                  {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.upNextThumb} />
                  ) : (
                    <View style={[styles.upNextThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="videocam" size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.upNextInfo}>
                    <Text style={styles.upNextItemTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.upNextItemAuthor} numberOfLines={1}>{item.author || 'Yerel Video'}</Text>
                  </View>
                </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Pan Çizgisi (Sürükleme işareti) */}
        {!isMini && (
          <View style={styles.panIndicatorContainer} {...panResponder.panHandlers}>
            <View style={styles.panIndicator} />
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    backgroundColor: colors.surface, // Ya da colors.background
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  innerContainer: {
    flex: 1,
    flexDirection: 'column', // isMini'deyken row gibi davranması için farklı trick kullanacağız
  },
  miniControls: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: MINI_PLAYER_HEIGHT,
    width: SCREEN_WIDTH * 0.95 - MINI_VIDEO_WIDTH, // container genisligi eksi video genisligi
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  miniTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  miniAuthor: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  miniBtn: {
    padding: 10,
    height: '100%',
    justifyContent: 'center',
  },
  fullContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullHeader: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeBtnIcon: {
    padding: 5,
  },
  fullTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  fullAuthor: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  upNextTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  upNextScroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  upNextItem: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
  },
  upNextThumb: {
    width: 120,
    height: 70,
    backgroundColor: colors.surfaceLight,
  },
  upNextInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  upNextItemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  upNextItemAuthor: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  panIndicatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    zIndex: 10,
  },
  panIndicator: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 3,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionText: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 12,
  }
});
