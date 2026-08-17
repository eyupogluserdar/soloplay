import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/theme';
import { useDocStore } from '../store/useDocStore';

export const AddToDocCategoryModal = ({
  visible,
  document,
  onClose,
}: {
  visible: boolean;
  document: any;
  onClose: () => void;
}) => {
  const categories = useDocStore(state => state.categories);
  const updateDocument = useDocStore(state => state.updateDocument);

  const handleAdd = (categoryId: string) => {
    if (!document) return;
    
    if (document.categoryId === categoryId) {
      alert('Bu belge zaten bu kategoride!');
      onClose();
      return;
    }

    updateDocument(document.id, { categoryId });
    alert('Kategoriye taşındı!');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Kategoriye Taşı</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            {categories.map(cat => (
              <TouchableOpacity key={cat.id} style={styles.item} onPress={() => handleAdd(cat.id)}>
                <Ionicons name="folder" size={24} color={colors.primary} />
                <Text style={styles.itemText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
            {categories.length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                Henüz bir kategori oluşturmadınız.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  content: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { ...typography.title, fontSize: 18, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  itemText: { color: colors.text, fontSize: 16, marginLeft: 15, fontWeight: '600' }
});
