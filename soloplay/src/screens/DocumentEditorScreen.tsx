import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDocStore } from '../store/useDocStore';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveToExternalStorage } from '../utils/fileStorage';
// Native modüllerin derlenmesi gerektiği için geçici olarak kaldırıldı
// import * as Print from 'expo-print';
// import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

interface DocumentEditorProps {
  initialText: string;
  documentId?: string; // If editing an existing doc
  imageUri?: string | null; // Keep image relation
  onClose: () => void;
  hideInsets?: boolean;
}

export default function DocumentEditorScreen({ initialText, documentId, imageUri, onClose, hideInsets }: DocumentEditorProps) {
  const [text, setText] = useState(initialText);
  const [title, setTitle] = useState('Tarama - ' + new Date().toLocaleDateString());
  const [currentDocId, setCurrentDocId] = useState<string | undefined>(documentId);
  const insets = useSafeAreaInsets();
  
  const { documents, addDocument, updateDocument } = useDocStore();
  
  useEffect(() => {
    Keyboard.dismiss(); // Ensure keyboard is closed on mount
    if (documentId) {
      const doc = documents.find(d => d.id === documentId);
      if (doc) {
        setText(doc.content);
        setTitle(doc.title);
      }
    }
  }, [documentId, documents]);

  const handleSave = async () => {
    let finalUri = imageUri;
    let fileName = `scanned_${Date.now()}.jpg`;
    if (imageUri && !imageUri.startsWith(FileSystem.documentDirectory!)) {
        fileName = imageUri.split('/').pop() || fileName;
        const newUri = FileSystem.documentDirectory + fileName;
        try {
            await FileSystem.copyAsync({ from: imageUri, to: newUri });
            finalUri = newUri;
        } catch(e) {
            console.log('Resim kaydedilemedi:', e);
        }
    }

    if (finalUri) {
        try {
            await saveToExternalStorage(finalUri, fileName, 'OCR', 'image/jpeg');
        } catch(e) {
            console.log('Resim dışa aktarılamadı:', e);
        }
    }

    if (currentDocId) {
      updateDocument(currentDocId, { title, content: text, ...(finalUri ? { imageUri: finalUri } : {}) });
      Alert.alert("Başarılı", "Döküman güncellendi.", [{ text: "Tamam", onPress: onClose }]);
    } else {
      const newId = addDocument({ title, content: text, type: 'ocr', imageUri: finalUri || undefined });
      setCurrentDocId(newId);
      Alert.alert("Başarılı", "Yeni döküman olarak kaydedildi.", [{ text: "Tamam", onPress: onClose }]);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Kopyalandı", "Metin panoya kopyalandı.");
  };

  const handleExportPDF = async () => {
    Alert.alert("Bilgi", "PDF özelliği için uygulamanın yeni bir APK build'i alınması gerekmektedir. Şu an test aşamasında devre dışıdır.");
  };

  return (
    <View style={[styles.container, { paddingTop: hideInsets ? 0 : insets.top }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleCopy} style={styles.actionBtn}>
              <Ionicons name="copy-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleExportPDF} style={styles.actionBtn}>
              <Ionicons name="document-text-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.actionBtn, styles.saveBtn]}>
              <Text style={styles.saveBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.editorContainer}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Başlık girin..."
            placeholderTextColor="#888"
            autoFocus={false}
          />
          
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            placeholder="Metin buraya gelecek..."
            placeholderTextColor="#888"
            autoCapitalize="sentences"
            scrollEnabled={true}
            autoFocus={false}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  iconBtn: { padding: 5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  actionBtn: { padding: 5 },
  saveBtn: { backgroundColor: '#1DD75F', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 },
  saveBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  editorContainer: { flex: 1, padding: 20 },
  titleInput: { fontSize: 24, fontWeight: 'bold', color: '#1DD75F', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  textInput: { flex: 1, fontSize: 16, color: '#fff', lineHeight: 26 },
});
