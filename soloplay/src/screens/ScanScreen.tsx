import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform, Dimensions, Image, PanResponder } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
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
  const [containerDim, setContainerDim] = useState({ w: SCREEN_W, h: SCREEN_H });

  // Gallery Crop States
  const [galleryImageUri, setGalleryImageUri] = useState<string | null>(null);
  const [galleryImageDim, setGalleryImageDim] = useState<{w: number, h: number} | null>(null);
  
  const initialRect = { x: 40, y: 150, w: SCREEN_W - 80, h: 250 };
  const cropRectRef = useRef(initialRect);
  const [cropRectState, setCropRectState] = useState(initialRect);

  const activeFrame = FRAME_TYPES[activeFrameIdx];

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // PanResponder for custom crop box
  const startRect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const activeEdge = useRef<string | null>(null);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt, gestureState) => {
      startRect.current = { ...cropRectRef.current };
      const { locationX, locationY } = evt.nativeEvent;
      const rect = cropRectRef.current;
      const THRESHOLD = 50; // Touch area threshold for edges
      
      let edge = '';
      if (Math.abs(locationY - rect.y) < THRESHOLD) edge += 'top';
      else if (Math.abs(locationY - (rect.y + rect.h)) < THRESHOLD) edge += 'bottom';
      
      if (Math.abs(locationX - rect.x) < THRESHOLD) edge += 'left';
      else if (Math.abs(locationX - (rect.x + rect.w)) < THRESHOLD) edge += 'right';
      
      if (!edge) {
        if (locationX > rect.x && locationX < rect.x + rect.w && locationY > rect.y && locationY < rect.y + rect.h) {
          edge = 'center';
        }
      }
      activeEdge.current = edge;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (!activeEdge.current) return;
      let newRect = { ...startRect.current };
      const edge = activeEdge.current;
      
      if (edge.includes('top')) {
          newRect.y += gestureState.dy;
          newRect.h -= gestureState.dy;
      }
      if (edge.includes('bottom')) {
          newRect.h += gestureState.dy;
      }
      if (edge.includes('left')) {
          newRect.x += gestureState.dx;
          newRect.w -= gestureState.dx;
      }
      if (edge.includes('right')) {
          newRect.w += gestureState.dx;
      }
      if (edge === 'center') {
          newRect.x += gestureState.dx;
          newRect.y += gestureState.dy;
      }
      
      // Min dimensions and boundaries
      if (newRect.w < 60) newRect.w = 60;
      if (newRect.h < 60) newRect.h = 60;
      
      cropRectRef.current = newRect;
      setCropRectState(newRect);
    }
  }), []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Artık Native kırpma kullanmıyoruz!
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGalleryImageUri(result.assets[0].uri);
        setGalleryImageDim({ w: result.assets[0].width, h: result.assets[0].height });
        // Reset crop box position for new image
        cropRectRef.current = { ...initialRect };
        setCropRectState({ ...initialRect });
      }
    } catch (error) {
      console.log('Resim seçme hatası:', error);
      Alert.alert('Hata', 'Resim seçilirken bir sorun oluştu.');
    }
  };

  const processGalleryOCR = async () => {
    if (!galleryImageUri || !galleryImageDim) return;
    
    try {
      setIsProcessing(true);
      const result = await TextRecognition.recognize(galleryImageUri);
      
      // Calculate mapping from Screen UI to Image Raw Pixels
      const imgW = galleryImageDim.w;
      const imgH = galleryImageDim.h;
      
      // resizeMode="contain" math
      const scale = Math.min(containerDim.w / imgW, containerDim.h / imgH);
      const renderedW = imgW * scale;
      const renderedH = imgH * scale;
      const offsetX = (containerDim.w - renderedW) / 2;
      const offsetY = (containerDim.h - renderedH) / 2;
      
      const box = cropRectRef.current;
      const minX = (box.x - offsetX) / scale;
      const maxX = (box.x + box.w - offsetX) / scale;
      const minY = (box.y - offsetY) / scale;
      const maxY = (box.y + box.h - offsetY) / scale;

      const filteredBlocks = result.blocks.filter(b => {
        if (!b.frame) return true;
        const blockCenterY = b.frame.top + (b.frame.height / 2);
        const blockCenterX = b.frame.left + (b.frame.width / 2);
        return blockCenterY >= minY && blockCenterY <= maxY && blockCenterX >= minX && blockCenterX <= maxX;
      });
      
      if (!filteredBlocks || filteredBlocks.length === 0) {
        Alert.alert('Bulunamadı', 'Kutunun içinde metin algılanamadı.');
        setIsProcessing(false);
        return;
      }
      
      const sortedBlocks = [...filteredBlocks].sort((a, b) => {
        const aTop = a.frame?.top ?? 0;
        const bTop = b.frame?.top ?? 0;
        const aLeft = a.frame?.left ?? 0;
        const bLeft = b.frame?.left ?? 0;
        if (Math.abs(aTop - bTop) < 20) return aLeft - bLeft;
        return aTop - bTop;
      });

      const fullTextStr = sortedBlocks.map(b => b.text).join('\n\n');
      setCapturedText(fullTextStr);
      setGalleryImageUri(null); // Clear gallery state
      setIsScanning(false);
    } catch (e: any) {
      console.log('Tarama hatası:', e);
      Alert.alert('Hata', `Tarama başarısız: ${e.message || JSON.stringify(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

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
      
      if (containerDim.h > containerDim.w && imgW > imgH) {
        imgW = photo.height;
        imgH = photo.width;
      }
      
      const scale = Math.max(containerDim.w / imgW, containerDim.h / imgH);
      const displayedW = imgW * scale;
      const displayedH = imgH * scale;
      
      const offsetX = (containerDim.w - displayedW) / 2;
      const offsetY = (containerDim.h - displayedH) / 2;
      
      const boxLeft = containerDim.w * (0.5 - (activeFrame.wPct / 2));
      const boxRight = containerDim.w * (0.5 + (activeFrame.wPct / 2));
      const boxTop = containerDim.h * (0.5 - (activeFrame.hPct / 2));
      const boxBottom = containerDim.h * (0.5 + (activeFrame.hPct / 2));
      
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
        Alert.alert('Bulunamadı', 'Kadrajın içinde metin algılanamadı.');
        setIsProcessing(false);
        return;
      }
      
      const sortedBlocks = [...filteredBlocks].sort((a, b) => {
        const aTop = a.frame?.top ?? 0;
        const bTop = b.frame?.top ?? 0;
        const aLeft = a.frame?.left ?? 0;
        const bLeft = b.frame?.left ?? 0;
        if (Math.abs(aTop - bTop) < 20) return aLeft - bLeft;
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
    setGalleryImageUri(null);
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
            if (galleryImageUri) {
              setGalleryImageUri(null);
            } else if (!isScanning) {
              resetScanner();
            } else if (onBack) {
              onBack();
            }
          }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={styles.logoTextSolo}>{galleryImageUri ? "Resmi Kırp" : "Akıllı Tarayıcı"}</Text>
        </View>
        <View style={{ flex: 1 }} />
        {!isScanning && (
          <TouchableOpacity style={{ padding: 5 }} onPress={resetScanner}>
            <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isScanning ? (
        <View style={styles.cameraContainer} onLayout={e => setContainerDim({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {galleryImageUri ? (
            <>
              <View style={{ flex: 1, backgroundColor: '#111' }} {...panResponder.panHandlers}>
                <Image 
                  source={{ uri: galleryImageUri }} 
                  style={StyleSheet.absoluteFillObject} 
                  resizeMode="contain" 
                />

                {/* Dinamik Kırpma Kutusu */}
                <View style={{
                  position: 'absolute',
                  left: cropRectState.x,
                  top: cropRectState.y,
                  width: cropRectState.w,
                  height: cropRectState.h,
                  borderWidth: 4,
                  borderColor: '#1DD75F',
                }} pointerEvents="none">
                  {/* 4 Köşe Tutamacı */}
                  <View style={[styles.cornerHandle, { top: -4, left: -4, borderTopWidth: 4, borderLeftWidth: 4 }]} />
                  <View style={[styles.cornerHandle, { top: -4, right: -4, borderTopWidth: 4, borderRightWidth: 4 }]} />
                  <View style={[styles.cornerHandle, { bottom: -4, left: -4, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
                  <View style={[styles.cornerHandle, { bottom: -4, right: -4, borderBottomWidth: 4, borderRightWidth: 4 }]} />
                </View>
              </View>

              <View style={styles.customCropControls} pointerEvents="box-none">
                <TouchableOpacity style={styles.cropCancelBtn} onPress={() => setGalleryImageUri(null)}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cropScanBtn} onPress={processGalleryOCR} disabled={isProcessing}>
                  {isProcessing ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: 'bold' }}>TARA</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
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

              <View style={[styles.controlsContainer, { paddingHorizontal: 40, justifyContent: 'space-between' }]}>
                <TouchableOpacity style={styles.galleryButton} onPress={pickImage} disabled={isProcessing}>
                  <Ionicons name="image" size={32} color="white" />
                </TouchableOpacity>

                <View style={styles.shutterContainer}>
                  {isProcessing ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <TouchableOpacity style={styles.shutterButton} onPress={() => onCapture()} disabled={isProcessing}>
                      <View style={styles.shutterInner} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ width: 50, height: 50 }} />
              </View>
            </>
          )}
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

  controlsContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  galleryButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  shutterContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  shutterButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: '#000' },
  
  // Custom Crop Styles
  cornerHandle: { position: 'absolute', width: 25, height: 25, borderColor: '#1DD75F' },
  customCropControls: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  cropCancelBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  cropScanBtn: { backgroundColor: '#1DD75F', paddingHorizontal: 50, paddingVertical: 15, borderRadius: 12 },

  resultContainer: { flex: 1, backgroundColor: '#000', flexDirection: 'column' },
  actionPanel: { backgroundColor: colors.surface, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  buttonsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionButtonSecondary: { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionButtonText: { color: colors.background, fontSize: 15, fontWeight: 'bold' },
  title: { ...typography.title, fontSize: 22, marginBottom: 10 },
});
