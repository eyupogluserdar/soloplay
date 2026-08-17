import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { usePlayerStore } from '../store/usePlayerStore';
import type { Track } from '../store/usePlayerStore';

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
  const playlists = usePlayerStore(state => state.playlists);
  const memory = usePlayerStore(state => state.memory);
  const recentTracks = usePlayerStore(state => state.recentTracks || []);

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
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.horizontalScrollContent}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + 15}
              >
                {recentDownloads.map((track, idx) => (
                  <TouchableOpacity 
                    key={`dl_${track.uri}_${idx}`} 
                    style={styles.card}
                    onPress={() => handlePlayTrack(track, ytPlaylist!.id, ytPlaylist!.name)}
                  >
                    {track.artwork ? (
                      <Image source={{ uri: track.artwork }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(track.name) }]}>
                        <Ionicons name="musical-notes" size={32} color={colors.textSecondary} />
                      </View>
                    )}
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
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.horizontalScrollContent}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + 15}
              >
                {recentPlayed.map((item, idx) => (
                  <TouchableOpacity 
                    key={`rp_${item.trackUri}_${idx}`} 
                    style={styles.card}
                    onPress={() => handlePlayMemory(item)}
                  >
                    {item.artwork ? (
                      <Image source={{ uri: item.artwork }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(item.trackName) }]}>
                        <Ionicons name="play-circle" size={32} color={colors.textSecondary} />
                      </View>
                    )}
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.trackName}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{item.playlistName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {recentDownloads.length === 0 && recentPlayed.length === 0 && (
             <Text style={styles.emptyText}>Henüz çalınan veya indirilen bir parça yok.</Text>
          )}
        </View>

      </ScrollView>
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
