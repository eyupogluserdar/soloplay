import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { usePlayerStore } from '../store/usePlayerStore';
import { AnimatedRing } from './AnimatedRing';
import { colors, typography } from '../theme/theme';

import { CustomSlider } from './CustomSlider';

export const MiniPlayer = ({
  onPress,
  safeAreaBottom,
  bottomOffset,
}: {
  onPress: () => void;
  safeAreaBottom: number;
  bottomOffset?: number;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const { 
    currentTrackName, 
    isPlaying, 
    pause, 
    resume,
    seek,
    stop,
    playNext,
    playPrevious
  } = useAudio();

  const positionMillis = usePlayerStore(state => state.positionMillis);
  const durationMillis = usePlayerStore(state => state.durationMillis);
  const isMicro = usePlayerStore(state => state.isMicro);
  const setIsMicro = usePlayerStore(state => state.setIsMicro);

  if (!currentTrackName) return null;

  if (isMicro) {
    return (
      <TouchableOpacity 
        style={[styles.microContainer, { bottom: (bottomOffset || 0) + 20 }]} 
        onPress={() => setIsMicro(false)}
        activeOpacity={0.8}
      >
        <AnimatedRing size={48} isPlaying={isPlaying} borderWidth={3}>
          <View style={styles.microButton}>
            <Ionicons name="musical-notes" size={24} color={colors.background} />
          </View>
        </AnimatedRing>
      </TouchableOpacity>
    );
  }

  const formatTime = (millis: number) => {
    if (!millis || isNaN(millis)) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progress = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

  return (
    <TouchableOpacity 
      style={[styles.container, { bottom: bottomOffset || 0 }]} 
      onPress={onPress}
      activeOpacity={1}
    >
      <View style={styles.voluminousLayer}>
        
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={(e) => {
            e.stopPropagation();
            setIsMicro(true); // Stop yerine küçültme (Micro) moduna geçiyoruz
          }}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.trackName} numberOfLines={1}>{currentTrackName}</Text>
          <Text style={styles.signature}>SoloPlay by htmlkod</Text>
        </View>

        <View style={styles.progressContainer}>
          <CustomSlider
            durationMillis={durationMillis}
            positionMillis={positionMillis}
            onSeek={seek}
            onDragValueChange={(dragging, val) => {
              setIsDragging(dragging);
              setDragTime(val);
            }}
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(isDragging ? dragTime : positionMillis)}</Text>
            <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
            <Ionicons name="play-skip-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => seek(positionMillis - 10000)} style={styles.controlButton}>
            <Ionicons name="arrow-undo" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <AnimatedRing size={52} isPlaying={isPlaying} borderWidth={3}>
            <TouchableOpacity onPress={isPlaying ? pause : resume} style={styles.playPauseButton}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={22} color={colors.background} />
            </TouchableOpacity>
          </AnimatedRing>

          <TouchableOpacity onPress={() => seek(positionMillis + 10000)} style={styles.controlButton}>
            <Ionicons name="arrow-redo" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={playNext} style={styles.controlButton}>
            <Ionicons name="play-skip-forward" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  microContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 100,
    elevation: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  microButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voluminousLayer: {
    backgroundColor: 'rgba(9, 9, 11, 0.85)', // BlurView yerine koyu ama hafif saydam bir cam efekti (Native build gerektirmez)
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 8, // Ekranın altına tam oturması için minimal boşluk
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    zIndex: 10,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 40,
  },
  trackName: {
    ...typography.title,
    fontSize: 16,
    marginBottom: 2,
    textAlign: 'center',
  },
  signature: {
    ...typography.signature,
    fontSize: 10,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    ...typography.subtitle,
    fontSize: 11,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  controlButton: {
    padding: 8,
  },
  playPauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
