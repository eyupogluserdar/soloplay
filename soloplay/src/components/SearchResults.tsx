import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAudio } from '../context/AudioContext';

interface SearchResultsProps {
  searchQuery: string;
  insets: any;
  onNavigateToPlaylist: (id: string, name: string) => void;
  onClose: () => void;
}

export const SearchResults = ({ searchQuery, insets, onNavigateToPlaylist, onClose }: SearchResultsProps) => {
  const playlists = usePlayerStore(state => state.playlists);
  const { playTrack } = useAudio();

  const getDynamicColor = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 50%, 20%)`;
  };

  const handlePlayTrack = async (track: any, playlistId: string, playlistName: string) => {
    onClose(); // Close search after play
    await playTrack(track.uri, track.name || '', playlistId);
  };

  const q = searchQuery.toLowerCase();
  
  const matchedPlaylists = playlists.filter(p => p.name && p.name.toLowerCase().includes(q)).map(p => ({ type: 'playlist', data: p }));

  const matchedTracks: any[] = [];
  playlists.forEach(p => {
    p.tracks?.forEach(t => {
      const trackName = t.name ? t.name.toLowerCase() : '';
      const trackArtist = t.artist ? t.artist.toLowerCase() : '';
      if (trackName.includes(q) || trackArtist.includes(q)) {
        if (!matchedTracks.some(mt => mt.data.uri === t.uri)) {
          matchedTracks.push({ type: 'track', data: t, playlistId: p.id, playlistName: p.name });
        }
      }
    });
  });

  const results = [...matchedPlaylists, ...matchedTracks];

  return (
    <ScrollView 
      contentContainerStyle={{ paddingBottom: Math.max(120, insets.bottom + 90), paddingTop: 10 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {results.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="search" size={48} color={colors.textSecondary} style={{ marginBottom: 15 }} />
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>"{searchQuery}" için sonuç bulunamadı.</Text>
        </View>
      ) : (
        results.map((item, idx) => {
          if (item.type === 'playlist') {
            return (
              <TouchableOpacity 
                key={`sp_${idx}`} 
                style={styles.resultItem}
                onPress={() => {
                  onClose();
                  onNavigateToPlaylist(item.data.id, item.data.name);
                }}
              >
                <View style={[styles.iconWrapper, { backgroundColor: getDynamicColor(item.data.name || 'default') }]}>
                  <Ionicons name="folder" size={24} color={colors.textSecondary} />
                </View>
                <View style={styles.textWrapper}>
                  <Text style={styles.titleText} numberOfLines={1}>{item.data.name}</Text>
                  <Text style={styles.subText} numberOfLines={1}>Liste • {item.data.tracks?.length || 0} Medya</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          } else {
            return (
              <TouchableOpacity 
                key={`st_${idx}`} 
                style={styles.resultItem}
                onPress={() => {
                  handlePlayTrack(item.data, item.playlistId, item.playlistName);
                }}
              >
                {item.data.artwork ? (
                  <Image source={{ uri: item.data.artwork }} style={styles.iconWrapper} />
                ) : (
                  <View style={[styles.iconWrapper, { backgroundColor: getDynamicColor(item.data.name || 'default') }]}>
                    <Ionicons name="musical-notes" size={24} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.textWrapper}>
                  <Text style={styles.titleText} numberOfLines={1}>{item.data.name}</Text>
                  <Text style={styles.subText} numberOfLines={1}>{item.playlistName} • {item.data.artist || 'Müzik'}</Text>
                </View>
                <Ionicons name="play-circle" size={28} color={colors.primary} />
              </TouchableOpacity>
            );
          }
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface
  },
  textWrapper: {
    flex: 1,
    marginLeft: 15
  },
  titleText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  subText: {
    color: colors.textSecondary,
    fontSize: 13
  }
});
