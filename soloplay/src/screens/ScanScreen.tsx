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



export function ScanScreen({ onBack }: any) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedText, setCapturedText] = useState('');
  const [containerDim, setContainerDim] = useState({ w: SCREEN_W, h: SCREEN_H });

  // Gallery Crop States
  const [galleryImageUri, setGalleryImageUri] = useState<string | null>(null);
  const [galleryImageDim, setGalleryImageDim] = useState<{w: number, h: number} | null>(null);
  
  const initialRect = { x: 40, y: 150, w: SCREEN_W - 80, h: 250 };
  const cropRectRef = useRef(initialRect);
  const [cropRectState, setCropRectState] = useState(initialRect);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // PanResponder for custom crop box
  const startRect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const activeEdge = useRef<string | null>(null);
  const initialPinch = useRef({ xDist: 0, yDist: 0 });

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt, gestureState) => {
      startRect.current = { ...cropRectRef.current };
      const touches = evt.nativeEvent.touches;
      
      if (touches.length === 2) {
        initialPinch.current = {
          xDist: Math.abs(touches[0].pageX - touches[1].pageX),
          yDist: Math.abs(touches[0].pageY - touches[1].pageY),
        };
        activeEdge.current = 'pinch';
        return;
      }

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
      const touches = evt.nativeEvent.touches;
      
      if (touches.length === 2) {
        if (activeEdge.current !== 'pinch') {
          activeEdge.current = 'pinch';
          startRect.current = { ...cropRectRef.current };
          initialPinch.current = {
            xDist: Math.abs(touches[0].pageX - touches[1].pageX),
            yDist: Math.abs(touches[0].pageY - touches[1].pageY),
          };
        }
        
        const currXDist = Math.abs(touches[0].pageX - touches[1].pageX);
        const currYDist = Math.abs(touches[0].pageY - touches[1].pageY);
        
        const deltaX = currXDist - initialPinch.current.xDist;
        const deltaY = currYDist - initialPinch.current.yDist;
        
        let newRect = { ...startRect.current };
        newRect.w = Math.max(60, startRect.current.w + deltaX);
        newRect.h = Math.max(60, startRect.current.h + deltaY);
        newRect.x = startRect.current.x - (newRect.w - startRect.current.w) / 2;
        newRect.y = startRect.current.y - (newRect.h - startRect.current.h) / 2;
        
        cropRectRef.current = newRect;
        setCropRectState(newRect);
        return;
      } else if (touches.length === 1) {
        if (activeEdge.current === 'pinch') {
          activeEdge.current = null;
          return;
        }
      }

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
      
      let imgW = galleryImageDim.w;
      let imgH = galleryImageDim.h;
      
      const isLandscapePhotoOnPortraitUI = imgW > imgH && containerDim.h > containerDim.w;
      
      if (isLandscapePhotoOnPortraitUI) {
        // Pretend the image is Portrait for UI coordinate mapping
        imgW = galleryImageDim.h;
        imgH = galleryImageDim.w;
      }
      
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

      let allLines: any[] = [];
      result.blocks.forEach((b: any) => {
        if (b.lines && b.lines.length > 0) {
          allLines.push(...b.lines);
        } else {
          allLines.push(b);
        }
      });

      const filteredLines = allLines.filter(line => {
        if (!line.frame) return true;
        let lineCenterY = line.frame.top + (line.frame.height / 2);
        let lineCenterX = line.frame.left + (line.frame.width / 2);
        
        if (isLandscapePhotoOnPortraitUI) {
            const rawX = lineCenterX;
            const rawY = lineCenterY;
            lineCenterX = galleryImageDim.h - rawY; 
            lineCenterY = rawX;        
        }
        
        return lineCenterY >= minY && lineCenterY <= maxY && lineCenterX >= minX && lineCenterX <= maxX;
      });
      
      if (!filteredLines || filteredLines.length === 0) {
        Alert.alert('Bulunamadı', 'Kutunun içinde metin algılanamadı.');
        setIsProcessing(false);
        return;
      }
      
      const sortedByTop = [...filteredLines].sort((a, b) => (a.frame?.top ?? 0) - (b.frame?.top ?? 0));
      
      const groupedRows: any[][] = [];
      sortedByTop.forEach(line => {
         const top = line.frame?.top ?? 0;
         const height = line.frame?.height ?? 20;
         const centerY = top + height / 2;
         
         let added = false;
         if (groupedRows.length > 0) {
            const lastRow = groupedRows[groupedRows.length - 1];
            let sumCenterY = 0;
            lastRow.forEach(g => {
                const gTop = g.frame?.top ?? 0;
                const gHeight = g.frame?.height ?? 20;
                sumCenterY += (gTop + gHeight / 2);
            });
            const avgCenterY = sumCenterY / lastRow.length;
            
            if (Math.abs(centerY - avgCenterY) < (height * 0.75)) {
               lastRow.push(line);
               added = true;
            }
         }
         if (!added) {
            groupedRows.push([line]);
         }
      });
      
      let fullTextStr = '';
      for (let i = 0; i < groupedRows.length; i++) {
          const row = groupedRows[i];
          row.sort((a, b) => (a.frame?.left ?? 0) - (b.frame?.left ?? 0));
          const rowText = row.map(line => line.text).join('    ');
          
          if (i === 0) {
              fullTextStr += rowText;
          } else {
              const prevRow = groupedRows[i-1];
              const prevTop = prevRow[0].frame?.top ?? 0;
              const prevHeight = prevRow[0].frame?.height ?? 20;
              const currTop = row[0].frame?.top ?? 0;
              const currHeight = row[0].frame?.height ?? 20;
              
              if ((currTop - (prevTop + prevHeight)) > (currHeight * 0.8)) {
                  fullTextStr += '\n\n' + rowText;
              } else {
                  fullTextStr += '\n' + rowText;
              }
          }
      }

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
        quality: 1,
      });
      
      if (!photo || !photo.uri) {
        throw new Error("Fotoğraf alınamadı.");
      }
      
      // Fotoğraf çekildiğinde hemen OCR yapma. Kullanıcıya net resmi göster (Gallery Mode gibi)
      // Kadrajı bu net resim üzerinde ayarlamasını sağla.
      setGalleryImageUri(photo.uri);
      setGalleryImageDim({ w: photo.width, h: photo.height });
      
    } catch (e: any) {
      console.log('Kamera hatası:', e);
      Alert.alert('Hata', `Fotoğraf çekilemedi: ${e.message || JSON.stringify(e)}`);
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
          <View style={{ flex: 1, backgroundColor: '#111' }} {...panResponder.panHandlers}>
            {galleryImageUri ? (
              <Image 
                source={{ uri: galleryImageUri }} 
                style={StyleSheet.absoluteFillObject} 
                resizeMode="contain" 
              />
            ) : (
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFillObject}
                facing="back"
                pictureSize="1920x1080"
                autofocus="on"
              />
            )}

            {/* Dinamik Kırpma Kutusu (Sadece Dondurulmuş Resimde Gösterilir) */}
            {galleryImageUri && (
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
            )}

            {/* Sabit L Hizalama Çizgileri (Sadece Canlı Kamerada Gösterilir) */}
            {!galleryImageUri && (
              <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                {/* Sol Üst L */}
                <View style={[styles.fixedCornerHandle, { top: 40, left: 20, borderTopWidth: 4, borderLeftWidth: 4 }]} />
                {/* Sağ Üst L */}
                <View style={[styles.fixedCornerHandle, { top: 40, right: 20, borderTopWidth: 4, borderRightWidth: 4 }]} />
                {/* Sol Alt L */}
                <View style={[styles.fixedCornerHandle, { bottom: 120, left: 20, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
                {/* Sağ Alt L */}
                <View style={[styles.fixedCornerHandle, { bottom: 120, right: 20, borderBottomWidth: 4, borderRightWidth: 4 }]} />
              </View>
            )}
            
          </View>

          <View style={styles.customCropControls} pointerEvents="box-none">
            {galleryImageUri ? (
              <TouchableOpacity style={styles.cropCancelBtn} onPress={() => setGalleryImageUri(null)}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>İptal</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.galleryButton} onPress={pickImage} disabled={isProcessing}>
                <Ionicons name="image" size={32} color="white" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cropScanBtn} onPress={galleryImageUri ? processGalleryOCR : onCapture} disabled={isProcessing}>
              {isProcessing ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: 'bold' }}>{galleryImageUri ? "TARA" : "FOTOĞRAF ÇEK"}</Text>}
            </TouchableOpacity>

            {!galleryImageUri && <View style={{ width: 50, height: 50 }} />}
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
  // Custom Crop Styles
  instructionContainer: { position: 'absolute', top: 30, left: 0, right: 0, alignItems: 'center' },
  instructionText: { color: 'white', fontSize: 13, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' },
  cornerHandle: { position: 'absolute', width: 25, height: 25, borderColor: '#1DD75F' },
  fixedCornerHandle: { position: 'absolute', width: 40, height: 40, borderColor: '#1DD75F' },
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
