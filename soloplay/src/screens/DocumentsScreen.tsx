import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ImageBackground, Dimensions, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDocStore, Document } from '../store/useDocStore';
import { colors, typography } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DocumentEditorScreen from './DocumentEditorScreen';
import { CardOverlay } from '../components/CardOverlay';
import { AddToDocCategoryModal } from '../components/AddToDocCategoryModal';
import { PromptModal } from '../components/PromptModal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;
const CARD_HEIGHT = CARD_WIDTH * 1.33; // 3:4 aspect ratio for documents

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const { documents, categories, deleteDocument, addCategory, getRecentDocuments } = useDocStore();
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  const [promptVisible, setPromptVisible] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  
  const [addToCategoryVisible, setAddToCategoryVisible] = useState(false);
  const [selectedDocForAdd, setSelectedDocForAdd] = useState<any>(null);

  const recentDocuments = getRecentDocuments(10);

  const handlePromptSubmit = (name: string) => {
    setPromptVisible(false);
    const finalName = name.trim() || `Kategori ${categories.length + 1}`;
    addCategory(finalName);
    Alert.alert('Başarılı', `"${finalName}" kategorisi oluşturuldu.`);
  };

  const renderSectionHeader = (title: string, onPress?: () => void) => (
    <TouchableOpacity 
      style={styles.sectionHeader}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
    </TouchableOpacity>
  );

  const renderCardContent = (item: Document) => (
    <>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrapper}>
            <Ionicons name="document-text" size={20} color="#fff" />
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardDate}>
          {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
    </>
  );

  const renderDocumentCard = (item: Document) => (
    <TouchableOpacity 
      key={item.id}
      style={[styles.cardContainer, activeCardId === item.id && { zIndex: 10, elevation: 10 }]}
      activeOpacity={0.8}
      onPress={() => setEditingDocId(item.id)}
      onLongPress={() => setActiveCardId(item.id)}
      disabled={activeCardId === item.id}
    >
      {item.imageUri ? (
        <ImageBackground 
            source={{ uri: item.imageUri }} 
            style={styles.cardBg}
            imageStyle={styles.cardBgImage}
        >
            <View style={styles.cardOverlay}>
                {renderCardContent(item)}
            </View>
        </ImageBackground>
      ) : (
        <View style={[styles.cardBg, styles.cardBgFallback]}>
             {renderCardContent(item)}
        </View>
      )}
      <CardOverlay
        visible={activeCardId === item.id}
        onClose={() => setActiveCardId(null)}
        options={[
          { icon: 'folder', color: '#1DD75F', onPress: () => { setSelectedDocForAdd(item); setAddToCategoryVisible(true); } },
          { icon: 'trash', color: '#ff4444', onPress: () => {
              Alert.alert('Emin misiniz?', `"${item.title}" belgesini silmek istediğinize emin misiniz?`, [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => deleteDocument(item.id) }
              ]);
          }}
        ]}
      />
    </TouchableOpacity>
  );

  if (editingDocId) {
    return (
      <DocumentEditorScreen 
        initialText="" 
        documentId={editingDocId} 
        onClose={() => setEditingDocId(null)} 
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>OCR Taranan Belgeler</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={() => setPromptVisible(true)}
          >
            <Ionicons name="folder-open-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        contentContainerStyle={{ paddingBottom: Math.max(120, insets.bottom + 90) }}
        showsVerticalScrollIndicator={false}
      >
        {documents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="documents-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Henüz kaydedilmiş bir belgeniz yok.</Text>
          </View>
        ) : (
          <>
            {/* Son Eklenenler */}
            {recentDocuments.length > 0 && (
              <View style={styles.section}>
                {renderSectionHeader('Son Kaydedilenler')}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.horizontalScrollContent}
                  decelerationRate="fast"
                  snapToInterval={CARD_WIDTH + 15}
                >
                  {recentDocuments.map(renderDocumentCard)}
                </ScrollView>
              </View>
            )}

            {/* Kategoriler */}
            {categories.map((category) => {
              const categoryDocs = documents.filter(doc => doc.categoryId === category.id);
              if (categoryDocs.length === 0) return null;
              
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
                    {categoryDocs.map(renderDocumentCard)}
                  </ScrollView>
                </View>
              );
            })}
            
            {/* Kategorisiz Belgeler */}
            {documents.filter(doc => !doc.categoryId).length > 0 && categories.length > 0 && (
              <View style={styles.section}>
                {renderSectionHeader('Kategorisiz Belgeler')}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.horizontalScrollContent}
                  decelerationRate="fast"
                  snapToInterval={CARD_WIDTH + 15}
                >
                  {documents.filter(doc => !doc.categoryId).map(renderDocumentCard)}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <PromptModal
        visible={promptVisible}
        title="Yeni Kategori Oluştur"
        placeholder="Kategori adı girin (Örn: Faturalar)"
        onCancel={() => setPromptVisible(false)}
        onSubmit={handlePromptSubmit}
      />

      <AddToDocCategoryModal
        visible={addToCategoryVisible}
        document={selectedDocForAdd}
        onClose={() => setAddToCategoryVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingBottom: 20,
    marginBottom: 10
  },
  headerLeft: { flex: 1 },
  headerTitle: { ...typography.title, fontSize: 28 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
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
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardBg: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardBgImage: {
    borderRadius: 12,
  },
  cardBgFallback: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    padding: 10 
  },
  iconWrapper: {
    backgroundColor: colors.primary,
    padding: 6,
    borderRadius: 8,
  },
  cardFooter: {
    padding: 10,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cardTitle: { ...typography.subtitle, fontSize: 14, color: '#fff', marginBottom: 4 },
  cardDate: { ...typography.caption, color: '#ccc' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 50 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 15 }
});
