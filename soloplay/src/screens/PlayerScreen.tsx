import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, Dimensions, Image, Easing } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { usePlayerStore } from '../store/usePlayerStore';
import { colors, typography } from '../theme/theme';
import TrackPlayer, { RepeatMode } from 'react-native-track-player';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';

const ProgressBar = ({ seek }: { seek: (pos: number) => void }) => {
  const positionMillis = usePlayerStore(state => state.positionMillis);
  const durationMillis = usePlayerStore(state => state.durationMillis);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

  const formatTime = (millis: number) => {
    if (!millis || isNaN(millis)) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.progressContainer}>
      <Slider
        style={{ width: '100%', height: 40 }}
        minimumValue={0}
        maximumValue={durationMillis || 100}
        value={isSeeking ? seekPosition : positionMillis}
        onValueChange={(val) => {
          setIsSeeking(true);
          setSeekPosition(val);
        }}
        onSlidingComplete={(value) => {
          seek(value);
          setIsSeeking(false);
        }}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.surfaceLight}
        thumbTintColor={colors.primary}
      />
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{formatTime(isSeeking ? seekPosition : positionMillis)}</Text>
        <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
      </View>
    </View>
  );
};

export const PlayerScreen = ({ onBack }: { onBack: () => void }) => {
  const { 
    isPlaying, 
    currentTrackName,
    currentTrackArtwork,
    pause,
    resume,
    seek,
    playNext,
    playPrevious
  } = useAudio();

  const [addToPlaylistVisible, setAddToPlaylistVisible] = useState(false);
  const isShuffleMode = usePlayerStore(state => state.isShuffleMode);
  const isRepeatMode = usePlayerStore(state => state.isRepeatMode);
  const toggleShuffle = usePlayerStore(state => state.toggleShuffle);
  const toggleRepeat = usePlayerStore(state => state.toggleRepeat);

  const translateY = useRef(new Animated.Value(0)).current;
  const windowHeight = Dimensions.get('window').height;

  const clampedTranslateY = translateY.interpolate({
    inputRange: [0, windowHeight],
    outputRange: [0, windowHeight],
    extrapolateLeft: 'clamp',
  });

  const scale = clampedTranslateY.interpolate({
    inputRange: [0, windowHeight],
    outputRange: [1, 0.4],
    extrapolate: 'clamp'
  });

  const opacity = clampedTranslateY.interpolate({
    inputRange: [0, windowHeight * 0.7],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        // Require a distinct downward swipe to avoid stealing touches from the slider
        return gestureState.dy > 20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: windowHeight,
            duration: 200,
            useNativeDriver: false,
          }).start(() => onBack());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 10,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const burst1Anim = useRef(new Animated.Value(0)).current;
  const burst2Anim = useRef(new Animated.Value(0)).current;
  const burst3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    let t1: NodeJS.Timeout, t2: NodeJS.Timeout;

    const animateBurst = (animValue: Animated.Value) => {
      if (!isMounted || !isPlaying) return;
      animValue.setValue(0);
      
      const duration = 1200;
      
      Animated.timing(animValue, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.exp), 
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && isPlaying && isMounted) {
          setTimeout(() => {
            if (isMounted && isPlaying) animateBurst(animValue);
          }, 300);
        }
      });
    };

    if (isPlaying) {
      animateBurst(burst1Anim);
      t1 = setTimeout(() => { if (isPlaying) animateBurst(burst2Anim); }, 500); 
      t2 = setTimeout(() => { if (isPlaying) animateBurst(burst3Anim); }, 1000);
    } else {
      burst1Anim.stopAnimation();
      burst2Anim.stopAnimation();
      burst3Anim.stopAnimation();
      Animated.timing(burst1Anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      Animated.timing(burst2Anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      Animated.timing(burst3Anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }

    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
      burst1Anim.stopAnimation();
      burst2Anim.stopAnimation();
      burst3Anim.stopAnimation();
    };
  }, [isPlaying]);

  const EnergyBurst = ({ animValue, color }: { animValue: Animated.Value, color?: string }) => (
    <Animated.View style={[
      styles.energyBurst,
      color ? { backgroundColor: color, shadowColor: color } : {},
      {
        opacity: animValue.interpolate({
          inputRange: [0, 0.1, 1],
          outputRange: [0, 0.8, 0],
        }),
        transform: [{
          scale: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.25],
          })
        }]
      }
    ]} />
  );

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [{ translateY: clampedTranslateY }, { scale }],
          opacity
        }
      ]} 
      {...panResponder.panHandlers}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-down" size={32} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Şu An Çalıyor</Text>
      </View>

      <View style={styles.artworkContainer}>
        <EnergyBurst animValue={burst1Anim} />
        <EnergyBurst animValue={burst2Anim} color="#d946ef" /> 
        <EnergyBurst animValue={burst3Anim} color="#0ea5e9" />

        <View style={styles.artworkWrapper}>
          {currentTrackArtwork ? (
            <Image source={{ uri: currentTrackArtwork }} style={styles.artworkImage} />
          ) : (
            <View style={styles.placeholderArtwork}>
              <Ionicons name="disc" size={150} color={colors.primary} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.trackTitle} numberOfLines={2}>
          {currentTrackName || "Bilinmeyen Parça"}
        </Text>
        <Text style={styles.signatureText}>SoloPlay by htmlkod</Text>
      </View>

      <View style={styles.extraControlsContainer}>
        <TouchableOpacity 
          style={styles.extraButton} 
          onPress={toggleShuffle}
        >
          <Ionicons 
            name="shuffle" 
            size={24} 
            color={isShuffleMode ? colors.primary : colors.textSecondary} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.extraButton} 
          onPress={() => setAddToPlaylistVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={28} color={colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.extraButton} 
          onPress={() => {
            toggleRepeat();
            const newMode = !isRepeatMode ? RepeatMode.Queue : RepeatMode.Off;
            TrackPlayer.setRepeatMode(newMode);
          }}
        >
          <Ionicons 
            name="repeat" 
            size={24} 
            color={isRepeatMode ? colors.primary : colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      <ProgressBar seek={seek} />

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={playPrevious}>
          <Ionicons name="play-skip-back" size={32} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={() => {
          const currentPos = usePlayerStore.getState().positionMillis;
          seek(currentPos - 10000);
        }}>
          <Ionicons name="arrow-undo" size={36} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.playPauseButton} onPress={isPlaying ? pause : resume}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={40} color={colors.background} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={() => {
          const currentPos = usePlayerStore.getState().positionMillis;
          seek(currentPos + 10000);
        }}>
          <Ionicons name="arrow-redo" size={36} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={playNext}>
          <Ionicons name="play-skip-forward" size={32} color={colors.text} />
        </TouchableOpacity>
      </View>

      {currentTrackName && (
        <AddToPlaylistModal
          visible={addToPlaylistVisible}
          track={{
            id: Date.now().toString(),
            name: currentTrackName,
          }}
          onClose={() => setAddToPlaylistVisible(false)}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    padding: 10,
    marginLeft: -10,
  },
  headerTitle: {
    ...typography.subtitle,
    flex: 1,
    textAlign: 'center',
    marginRight: 32, // Offset back button width to center text
  },
  artworkContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  energyBurst: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: colors.primary, // Çizgi değil, dolu bir enerji alanı
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50, // Çok dağınık (sınırları belirsiz)
    elevation: 20,
  },
  artworkWrapper: {
    width: 280,
    height: 280,
    borderRadius: 140, // Yuvarlak CD/Kapak görünümü
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
    backgroundColor: colors.surface,
    zIndex: 10,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
    borderRadius: 140, // Yuvarlak
  },
  placeholderArtwork: {
    width: '100%',
    height: '100%',
    borderRadius: 140, // Yuvarlak
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 20, // Alt kısımla (butonlarla) arayı daralttık
    marginTop: 60, // Kapağa yapışmasını önlemek için üstten boşluğu iyice açtık
  },
  trackTitle: {
    ...typography.header,
    textAlign: 'center',
    marginBottom: 10,
  },
  signatureText: {
    ...typography.signature,
  },
  progressContainer: {
    marginBottom: 15, // Ana butonlara daha da yaklaştı
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: -5,
  },
  timeText: {
    ...typography.subtitle,
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  extraControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10, // Bar ve butonlara iyice yaklaştırdık
  },
  extraButton: {
    padding: 10,
  },
  controlButton: {
    padding: 10,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  }
});
