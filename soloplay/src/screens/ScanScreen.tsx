import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const FRAME_TYPES = [
  { id: 'portrait', icon: 'document-text', label: 'Dikey (A4)', wPct: 0.95, hPct: 0.72 },
  { id: 'landscape', icon: 'laptop', label: 'Yatay (PC)', wPct: 0.65, hPct: 0.72 },
  { id: 'square', icon: 'scan', label: 'Kutu', wPct: 0.75, hPct: 0.40 },
  { id: 'line', icon: 'remove', label: 'Satır', wPct: 0.90, hPct: 0.12 },
];

export function ScanScreen({ onBack }: any) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedText, setCapturedText] = useState('');
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);

  const activeFrame = FRAME_TYPES[activeFrameIdx];

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const onCapture = async () => {
    if (!cameraRef.current) return;
    
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      
      if (!photo || !photo.uri) {
        throw new Error("Fotoğraf alınamadı.");
      }
      
      const result = await TextRecognition.recognize(photo.uri);
      
      let imgW = photo.width;
      let imgH = photo.height;
      
      if (SCREEN_H > SCREEN_W && imgW > imgH) {
        imgW = photo.height;
        imgH = photo.width;
      }
      
      const scale = Math.max(SCREEN_W / imgW, SCREEN_H / imgH);
      const displayedW = imgW * scale;
      const displayedH = imgH * scale;
      
      const offsetX = (SCREEN_W - displayedW) / 2;
      const offsetY = (SCREEN_H - displayedH) / 2;
      
      const boxLeft = SCREEN_W * (0.5 - (activeFrame.wPct / 2));
      const boxRight = SCREEN_W * (0.5 + (activeFrame.wPct / 2));
      const boxTop = SCREEN_H * (0.5 - (activeFrame.hPct / 2));
      const boxBottom = SCREEN_H * (0.5 + (activeFrame.hPct / 2));
      
      const minX = (boxLeft - offsetX) / scale;
      const maxX = (boxRight - offsetX) / scale;
      const minY = (boxTop - offsetY) / scale;
      const maxY = (boxBottom - offsetY) / scale;

      const filteredBlocks = result.blocks.filter(b => {
        if (!b.frame) return true;
        const blockCenterY = b.frame.top + (b.frame.height / 2);
        const blockCenterX = b.frame.left + (b.frame.width / 2);
        return blockCenterY >= minY && blockCenterY <= maxY && blockCenterX >= minX && blockCenterX <= maxX;
      });
      
      if (!filteredBlocks || filteredBlocks.length === 0) {
        Alert.alert('Bulunamadı', 'Kadrajın içinde metin algılanamadı. Lütfen yazıları çerçeveye ortalayın.');
        setIsProcessing(false);
        return;
      }
      
      const sortedBlocks = [...filteredBlocks].sort((a, b) => {
        const aTop = a.frame?.top ?? 0;
        const bTop = b.frame?.top ?? 0;
        const aLeft = a.frame?.left ?? 0;
        const bLeft = b.frame?.left ?? 0;
        
        if (Math.abs(aTop - bTop) < 20) {
          return aLeft - bLeft;
        }
        return aTop - bTop;
      });

      const fullTextStr = sortedBlocks.map(b => b.text).join('\n\n');
      setCapturedText(fullTextStr);
      setIsScanning(false);
    } catch (e: any) {
      console.log('Tarama hatası:', e);
      Alert.alert('Hata', `Tarama başarısız: ${e.message || JSON.stringify(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyAll = async () => {
    if (!capturedText) return;
    await Clipboard.setStringAsync(capturedText);
    Alert.alert('Kopyalandı', 'Tüm metin panoya kopyalandı.');
  };

  const resetScanner = () => {
    setCapturedText('');
    setIsScanning(true);
  };

  if (!permission) {
    return <View style={[styles.container, { paddingTop: insets.top }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white', marginBottom: 20 }}>Kamera izni gerekiyor.</Text>
        <TouchableOpacity style={styles.actionButton} onPress={requestPermission}>
          <Text style={styles.actionButtonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={{ padding: 5, marginRight: 15 }} 
          onPress={() => {
            if (!isScanning) {
              resetScanner();
            } else if (onBack) {
              onBack();
            }
          }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={styles.logoTextSolo}>Akıllı Tarayıcı</Text>
        </View>
        <View style={{ flex: 1 }} />
        {!isScanning && (
          <TouchableOpacity style={{ padding: 5 }} onPress={resetScanner}>
            <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isScanning ? (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            pictureSize="1920x1080"
          />
          
          <View style={styles.overlay} pointerEvents="none">
            <View style={[styles.viewfinder, { width: `${activeFrame.wPct * 100}%` as any, height: `${activeFrame.hPct * 100}%` as any }]} />
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionText}>Metinleri çerçeveye ortalayıp butona basın</Text>
            </View>
          </View>
          
          <View style={styles.frameSelectorContainer}>
            {FRAME_TYPES.map((f, idx) => {
              const isActive = activeFrameIdx === idx;
              return (
                <TouchableOpacity 
                  key={f.id} 
                  style={[styles.frameBtn, isActive && styles.frameBtnActive]} 
                  onPress={() => setActiveFrameIdx(idx)}
                >
                  <Ionicons name={f.icon as any} size={20} color={isActive ? colors.background : 'white'} />
                  <Text style={[styles.frameBtnText, isActive && styles.frameBtnTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={styles.controlsContainer}>
            <View style={styles.shutterContainer}>
              {isProcessing ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <TouchableOpacity style={styles.shutterButton} onPress={onCapture} disabled={isProcessing}>
                  <View style={styles.shutterInner} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
            <Text
              selectable={true}
              style={{
                color: colors.text,
                fontSize: 18,
                lineHeight: 28,
                letterSpacing: 0.3,
              }}
            >
              {capturedText}
            </Text>
          </ScrollView>

          {capturedText.length > 0 && (
            <View style={styles.actionPanel}>
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={copyAll}
                >
                  <Ionicons name="document-text" size={20} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Tümünü Al</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', zIndex: 10 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoTextSolo: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  cameraContainer: { flex: 1, position: 'relative', backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  viewfinder: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 16, borderStyle: 'dashed' },
  instructionContainer: { position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center' },
  instructionText: { color: 'white', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' },
  
  frameSelectorContainer: { position: 'absolute', top: 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 10, flexWrap: 'wrap' },
  frameBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  frameBtnActive: { backgroundColor: 'white', borderColor: 'white' },
  frameBtnText: { color: 'white', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  frameBtnTextActive: { color: colors.background },

  controlsContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  shutterContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  shutterButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: '#000' },
  resultContainer: { flex: 1, backgroundColor: '#000', flexDirection: 'column' },
  actionPanel: { backgroundColor: colors.surface, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  buttonsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionButtonSecondary: { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionButtonText: { color: colors.background, fontSize: 15, fontWeight: 'bold' },
  title: { ...typography.title, fontSize: 22, marginBottom: 10 },
});
