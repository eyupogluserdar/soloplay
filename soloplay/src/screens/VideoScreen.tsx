import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useVideoStore } from '../store/useVideoStore';
import { CardOverlay } from '../components/CardOverlay';
import { PromptModal } from '../components/PromptModal';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;

interface VideoDashboardProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

export default function VideoScreen({ onNavigate, onBack }: VideoDashboardProps) {
  const insets = useSafeAreaInsets();
  const categories = useVideoStore(state => state.categories);
  const addCategory = useVideoStore(state => state.addCategory);
  const removeVideoFromCategory = useVideoStore(state => state.removeVideoFromCategory);
  
  const [isPicking, setIsPicking] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const handlePickVideo = async () => {
    setIsPicking(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Galeri erişim izni reddedildi!');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        const newVideo = {
          id: Date.now().toString(),
          title: video.fileName || 'Galeriden Video',
          uri: video.uri,
          addedAt: Date.now()
        };
        
        let targetCat = categories.find(c => c.name === 'Kişisel Videolar');
        let targetId = targetCat ? targetCat.id : 'vid_cat_personal';
        
        useVideoStore.getState().addVideoToCategory(targetId, newVideo);
        alert('Video kütüphaneye eklendi.');
      }
    } catch (err) {
      console.log('Video picking error:', err);
    } finally {
      setIsPicking(false);
    }
  };

  const handlePromptSubmit = (name: string) => {
    setPromptVisible(false);
    const finalName = name.trim() || `Kategori ${categories.length + 1}`;
    addCategory(finalName);
    alert(`"${finalName}" oluşturuldu.`);
  };

  const getDynamicColor = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 50%, 20%)`;
  };

  const renderSectionHeader = (title: string, onPress?: () => void) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ padding: 10, marginLeft: -10, marginRight: 10 }}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.logoContainer}>
          <Text style={styles.logoTextSolo}>Videolarım</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={() => onNavigate('YoutubeVideoDownloader')}
          >
            <Ionicons name="search" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={() => setPromptVisible(true)}
          >
            <Ionicons name="folder-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={handlePickVideo} 
            disabled={isPicking}
          >
            {isPicking ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="add" size={28} color={colors.primary} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: Math.max(120, insets.bottom + 90) }}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((category) => {
          if (!category.videos || category.videos.length === 0) return null;
          
          return (
            <View key={`cat_${category.id}`} style={styles.section}>
              {renderSectionHeader(category.name)}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.horizontalScrollContent}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + 15}
              >
                {category.videos.slice().reverse().map((video, idx) => (
                  <TouchableOpacity 
                    key={`vid_${video.id}_${idx}`} 
                    style={[styles.card, activeCardId === video.id && { zIndex: 10, elevation: 10 }]}
                    onPress={() => useVideoStore.getState().setActiveVideo(video)}
                    onLongPress={() => setActiveCardId(video.id)}
                    disabled={activeCardId === video.id}
                  >
                    {video.thumbnail ? (
                      <Image source={{ uri: video.thumbnail }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: getDynamicColor(video.title) }]}>
                        <Ionicons name="videocam" size={32} color={colors.textSecondary} />
                      </View>
                    )}
                    <CardOverlay
                      visible={activeCardId === video.id}
                      onClose={() => setActiveCardId(null)}
                      options={[
                        { icon: 'trash', color: '#ff4444', onPress: () => {
                            Alert.alert('Emin misiniz?', `Bu video silinecek.`, [
                              { text: 'İptal', style: 'cancel' },
                              { text: 'Sil', style: 'destructive', onPress: () => removeVideoFromCategory(category.id, video.id) }
                            ]);
                        }}
                      ]}
                    />
                    <Text style={styles.cardTitle} numberOfLines={1}>{video.title}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{video.author || 'Yerel Video'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        })}
        {categories.every(c => c.videos.length === 0) && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
             <Ionicons name="videocam-outline" size={64} color={colors.textSecondary} />
             <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: 15 }}>Henüz hiç video yok.</Text>
          </View>
        )}
      </ScrollView>

      <PromptModal
        visible={promptVisible}
        title="Yeni Video Kategorisi"
        placeholder="Kategori adı girin (Örn: Eğlence)"
        onCancel={() => setPromptVisible(false)}
        onSubmit={handlePromptSubmit}
      />
    </View>
  );
}

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
  logoTextSolo: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 20,
    color: colors.text,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    gap: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
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
});
