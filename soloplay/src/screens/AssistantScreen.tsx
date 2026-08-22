import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView, TextInput, Dimensions, TouchableWithoutFeedback, PanResponder, KeyboardAvoidingView, Platform, Keyboard, Modal, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIIcon } from '../components/AIIcon';
import { useProfileStore } from '../store/useProfileStore';
import { OnboardingFlow } from '../components/OnboardingFlow';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AssistantScreenProps {
  onBack: () => void;
  onNavigateToScan?: () => void;
  isListening?: boolean;
  setIsListening?: (listening: boolean) => void;
}

export const AssistantScreen: React.FC<AssistantScreenProps> = ({ onBack, onNavigateToScan, isListening = false, setIsListening }) => {
    const isProfileComplete = useProfileStore(state => state.isProfileComplete);

  if (!isProfileComplete) {
    return <OnboardingFlow onNavigate={onBack} />;
  }

  const insets = useSafeAreaInsets();
  
  // Animation values for the "Living Space" orb
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Animation for Attachment Bottom Sheet
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  
  // Local state for text dictation (chat box mic)
  const [isDictating, setIsDictating] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // Browser Canvas States
  const [isBrowserMode, setIsBrowserMode] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('https://www.google.com');
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isVideoLinkModalVisible, setIsVideoLinkModalVisible] = useState(false);
  const [videoLinkInput, setVideoLinkInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isVideoActionModalVisible, setIsVideoActionModalVisible] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isTimeRangeModalVisible, setIsTimeRangeModalVisible] = useState(false);
  const [startMin, setStartMin] = useState('');
  const [startSec, setStartSec] = useState('');
  const [endMin, setEndMin] = useState('');
  const [endSec, setEndSec] = useState('');
  
  const startSecRef = useRef<TextInput>(null);
  const endMinRef = useRef<TextInput>(null);
  const endSecRef = useRef<TextInput>(null);

  // Pan Responder for Bottom Sheet (Drag down to close)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 15;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          menuAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          setIsMenuOpen(false); // AnÄ±nda durumu gÃ¼ncelle ki bug olmasÄ±n
          Animated.timing(menuAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(menuAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    // Pulse animation (breathing effect)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Rotate animation (slow continuous rotation for the outer ring)
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Smooth color transition for listening mode
  const listenColorAnim = useRef(new Animated.Value(isListening ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(listenColorAnim, {
      toValue: isListening ? 1 : 0,
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [isListening]);

  const orbColor = listenColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary, '#ffffff']
  });

  const toggleListening = () => {
    if (setIsListening) {
      setIsListening(!isListening);
    }
  };

  const toggleAttachmentMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false); // AnÄ±nda kapat ki Ã§ift tÄ±klama hatasÄ± (desync) olmasÄ±n
      Animated.timing(menuAnim, { toValue: SCREEN_HEIGHT, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    } else {
      setIsMenuOpen(true);
      Animated.timing(menuAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    }
  };

  const handleOcrPress = () => {
    setIsMenuOpen(false); // AnÄ±nda kapat
    Animated.timing(menuAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      if (onNavigateToScan) onNavigateToScan();
    });
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Asistan</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="options-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Main Living Space or Browser Canvas */}
      <View style={{ flex: 1 }}>
        {isBrowserMode ? (
          <View style={{ flex: 1, overflow: 'hidden', marginHorizontal: 16, borderRadius: 16, marginBottom: 16, backgroundColor: colors.surface }}>
            {/* Advanced browser header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceHighlight, padding: 8 }}>
              
              {/* Back/Forward Controls */}
              <TouchableOpacity onPress={() => webViewRef.current?.goBack()} disabled={!canGoBack} style={{ padding: 4, opacity: canGoBack ? 1 : 0.3 }}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => webViewRef.current?.goForward()} disabled={!canGoForward} style={{ padding: 4, opacity: canGoForward ? 1 : 0.3, marginRight: 8 }}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>

              {/* URL Bar */}
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
                <Ionicons name="lock-closed" size={12} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={{ ...typography.small, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
                  {browserUrl.replace('https://', '').replace('http://', '')}
                </Text>
              </View>

              {/* Report Toggle */}
              <TouchableOpacity 
                onPress={() => setShowReport(!showReport)} 
                style={{ padding: 6, marginLeft: 8 }}
              >
                <Ionicons 
                  name={showReport ? "play-circle" : "document-text"} 
                  size={20} 
                  color={showReport ? colors.primary : colors.textSecondary} 
                />
              </TouchableOpacity>

              {/* Close Browser */}
              <TouchableOpacity 
                onPress={() => setIsBrowserMode(false)} 
                style={{ 
                  padding: 4, 
                  marginLeft: 8, 
                  backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                  borderRadius: 12 
                }}
              >
                <Ionicons name="close" size={20} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
            
            <View style={{ flex: 1 }}>
              {/* Report Overlay */}
              {showReport && (
                <ScrollView 
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, zIndex: 10 }}
                  contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <Ionicons name="sparkles" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={{ ...typography.h3, color: colors.text }}>AI Video Analiz Raporu</Text>
                  </View>
                  
                  <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 16, lineHeight: 24 }}>
                    Bu video, son dönemdeki ekonomik dalgalanmaları ve piyasa beklentilerini ele almaktadır. Merkez bankasının faiz kararları, enflasyon verileri ve döviz kurlarındaki hareketlilik detaylıca tartışılmıştır. Uzman konuk, özellikle yıl sonu hedeflerinde sapmalar olabileceğine dikkat çekiyor.
                  </Text>
                  
                  <Text style={{ ...typography.h4, color: colors.text, marginBottom: 8 }}>Öne Çıkan Başlıklar:</Text>
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 4 }}>• Faiz politikasının sektörlere etkisi</Text>
                    <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 4 }}>• Döviz kurlarında beklenen direnç noktaları</Text>
                    <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 4 }}>• Yabancı yatırımcının piyasaya dönüş sinyalleri</Text>
                  </View>

                  <TouchableOpacity 
                    onPress={() => setShowReport(false)}
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Videoya Geri Dön</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

              <WebView 
              ref={webViewRef}
              source={{ uri: browserUrl }}
              style={{ flex: 1, opacity: showReport ? 0 : 1 }}
              userAgent={isDesktopMode ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36" : undefined}
                injectedJavaScript={isDesktopMode ? `
                  var meta = document.querySelector('meta[name="viewport"]');
                  var content = 'width=1024, initial-scale=0.01, maximum-scale=5.0, user-scalable=yes';
                  if (meta) { 
                    meta.setAttribute('content', content); 
                  } else { 
                    meta = document.createElement('meta'); 
                    meta.name = 'viewport'; 
                    meta.content = content; 
                    document.head.appendChild(meta); 
                  }
                  setTimeout(function() {
                    var v = document.querySelector('video') || document.querySelector('iframe');
                    if(v) v.scrollIntoView({behavior: 'smooth', block: 'center'});
                  }, 1500);
                  true;
                ` : `
                  var meta = document.querySelector('meta[name="viewport"]');
                  if (meta) { meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes'); }
                  setTimeout(function() {
                    var v = document.querySelector('video') || document.querySelector('iframe');
                    if(v) v.scrollIntoView({behavior: 'smooth', block: 'center'});
                  }, 1500);
                  true;
                `}
                scalesPageToFit={true}
                setBuiltInZoomControls={true}
                setDisplayZoomControls={false}
                onNavigationStateChange={(navState) => {
                  setCanGoBack(navState.canGoBack);
                  setCanGoForward(navState.canGoForward);
                  if (navState.url && navState.url !== browserUrl) {
                    setBrowserUrl(navState.url);
                  }
                  // Update loading state based on navigation state
                  setIsVideoLoaded(!navState.loading);
                }}
              />
            </View>
            
            {/* AI Video Analysis Controls */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              backgroundColor: colors.surfaceHighlight || '#27272a', 
              paddingVertical: 12, 
              paddingHorizontal: 16,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.05)'
            }}>
              {!isVideoLoaded ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={{ ...typography.small, color: colors.textSecondary }}>
                    Video Bekleniyor...
                  </Text>
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isAnalyzing ? '#ef4444' : '#3b82f6', marginRight: 8, opacity: isAnalyzing ? 1 : 0.8 }} />
                    <Text style={{ ...typography.small, color: isAnalyzing ? '#ef4444' : '#3b82f6' }}>
                      {isAnalyzing ? 'AI Videoyu Gözlemliyor' : 'Video Analize Hazır'}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    onPress={() => {
                      if (isAnalyzing) {
                        setIsAnalyzing(false);
                      } else {
                        setIsVideoActionModalVisible(true);
                      }
                    }}
                    style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      backgroundColor: isAnalyzing ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                      paddingHorizontal: 16, 
                      paddingVertical: 8, 
                      borderRadius: 20 
                    }}
                  >
                    <Ionicons name={isAnalyzing ? "stop-circle-outline" : "eye"} size={16} color={isAnalyzing ? "#ef4444" : "#10b981"} />
                    {!isAnalyzing && <Ionicons name="ear" size={16} color="#10b981" style={{ marginLeft: 4 }} />}
                    <Text style={{ marginLeft: 6, color: isAnalyzing ? "#ef4444" : "#10b981", fontWeight: 'bold', fontSize: 13 }}>
                      {isAnalyzing ? "Analizi Durdur" : "Video Analiz Modu"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            
            {/* The AI Avatar / Orb and Texts (Hides when menu is open) */}
            <View style={{ opacity: isMenuOpen ? 0 : 1, width: '100%', alignItems: 'center' }}>
              <View style={styles.orbContainer}>
                <Animated.View style={[
                  styles.outerRing,
                  { transform: [{ rotate: spin }] }
                ]} />
                {/* Outer View handles Native scale animation */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  {/* Inner View handles JS color animation */}
                  <Animated.View style={[
                    styles.innerOrb,
                    { backgroundColor: orbColor, shadowColor: orbColor }
                  ]}>
                    <AIIcon size={48} color={isListening ? colors.primary : colors.background} />
                  </Animated.View>
                </Animated.View>
              </View>

              <Text style={styles.greetingText}>
                Merhaba! Ben Soloplay Asistan.
              </Text>
              
              <Animated.Text 
                style={[
                  styles.subGreetingText, 
                  isListening && { color: colors.primary, opacity: pulseAnim }
                ]}
              >
                {isListening ? "Sizi dinliyorum..." : "Nasıl yardımcı olabilirim?"}
              </Animated.Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Input Area (Text & Voice) - GEMINI STYLE PILL */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={toggleAttachmentMenu}>
            <Ionicons name="add" size={28} color={colors.primary} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            placeholder={isDictating ? "Dinleniyor..." : "Asistan'a sorun..."}
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          
          {inputText.trim().length > 0 ? (
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={() => {
                // Mock AI Logic
                const text = inputText.toLowerCase();
                let urlMatch = text.match(/(https?:\/\/[^\s]+)/);
                
                // Extremely basic parsing for demo
                if (urlMatch) {
                  setBrowserUrl(urlMatch[0]);
                  setIsBrowserMode(true);
                } else if (text.includes('.com') || text.includes('.net') || text.includes('.org') || text.includes('.tr')) {
                  const words = text.split(' ');
                  const domain = words.find(w => w.includes('.'));
                  if (domain) {
                    setBrowserUrl(`https://${domain.trim()}`);
                    setIsBrowserMode(true);
                  }
                } else if (text.includes('bul') || text.includes('tara')) {
                  // Simulate searching the current page
                  alert(`AI: Åu an "${browserUrl}" adresini tarÄ±yorum... AradÄ±ÄŸÄ±nÄ±z kelime sayfada bulunamadÄ±.`);
                } else if (isBrowserMode) {
                  setBrowserUrl(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
                } else {
                  // Normal chat mode
                  alert("AI: SÃ¶ylediÄŸiniz siteyi/komutu anlayamadÄ±m. LÃ¼tfen 'soloplay.com adresine gir' gibi bir komut verin.");
                }
                setInputText('');
              }}
            >
              <Ionicons name="send" size={18} color={colors.background} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                style={[styles.micButton, isDictating && styles.micButtonActive]} 
                onPress={() => setIsDictating(!isDictating)}
              >
                <Ionicons name={isDictating ? "mic" : "mic-outline"} size={22} color={isDictating ? colors.background : colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Background touchable to close floating menu */}
      {isMenuOpen && (
        <TouchableWithoutFeedback onPress={toggleAttachmentMenu}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Floating Action Menu (Separated Buttons) */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.floatingMenuContainer,
          { transform: [{ translateY: menuAnim }] }
        ]}
      >
        <View style={styles.floatingStack}>
          <TouchableOpacity style={styles.floatingRowButton} onPress={() => { toggleAttachmentMenu(); setIsBrowserMode(true); }}>
            <View style={[styles.smallIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="globe-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.rowButtonText}>İnternete Bağlan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.floatingRowButton}>
            <View style={[styles.smallIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="images-outline" size={20} color="#a855f7" />
            </View>
            <Text style={styles.rowButtonText}>Galeriden Medya Seç</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.floatingRowButton}>
            <View style={[styles.smallIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="document-text-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.rowButtonText}>Belge Yükle (PDF/Word)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.floatingRowButton} onPress={handleOcrPress}>
            <View style={[styles.smallIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="scan-outline" size={20} color="#10b981" />
            </View>
            <Text style={styles.rowButtonText}>Ekran / Belge Tara (OCR)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.floatingRowButton} onPress={() => { 
            toggleAttachmentMenu(); 
            setIsVideoLinkModalVisible(true);
          }}>
            <View style={[styles.smallIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="play-circle-outline" size={20} color="#ef4444" />
            </View>
            <Text style={styles.rowButtonText}>Canlı Video Analizi (Link)</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      {/* Video Link Modal */}
      <Modal visible={isVideoLinkModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ width: '85%', backgroundColor: colors.surface, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 }}>
            <Text style={{ ...typography.h3, color: colors.text, marginBottom: 12 }}>Video Linkini Girin</Text>
            <Text style={{ ...typography.body, fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Analiz edilecek videonun bağlantısını aşağıya yapıştırın.</Text>
            <TextInput
              style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 8, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
              value={videoLinkInput}
              onChangeText={setVideoLinkInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setIsVideoLinkModalVisible(false)} style={{ padding: 10 }}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setIsVideoLinkModalVisible(false);
                  let url = videoLinkInput.trim();
                  if (url) {
                     if (!url.startsWith('http')) {
                       url = 'https://' + url;
                     }
                     setBrowserUrl(url);
                     setIsBrowserMode(true);
                     setVideoLinkInput(''); // reset for next time
                  }
                }} 
                style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: 8 }}>
                <Text style={{ color: colors.background, fontWeight: 'bold' }}>Aç</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Video Action Selection Modal */}
      <Modal visible={isVideoActionModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ ...typography.h3, color: colors.text }}>Video Analiz Modu</Text>
              <TouchableOpacity onPress={() => setIsVideoActionModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
              onPress={() => {
                setIsVideoActionModalVisible(false);
                setIsAnalyzing(true);
                setTimeout(() => {
                  setIsAnalyzing(false);
                  setShowReport(true);
                }, 1500);
              }}
            >
              <View style={[styles.smallIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="flash-outline" size={20} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, fontWeight: 'bold', color: colors.text }}>⚡ Kısa Özet (Hızlı Analiz)</Text>
                <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: 2 }}>Videonun ana fikrini saniyeler içinde kısaca özetler.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
              onPress={() => {
                setIsVideoActionModalVisible(false);
                setTimeout(() => setIsTimeRangeModalVisible(true), 350);
              }}
            >
              <View style={[styles.smallIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="time-outline" size={20} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, fontWeight: 'bold', color: colors.text }}>⏱ Belirli Bir Aralığı İncele</Text>
                <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: 2 }}>Sadece seçtiğiniz dakikaları analiz eder.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
              onPress={() => {
                setIsVideoActionModalVisible(false);
                setIsAnalyzing(true);
                setTimeout(() => {
                  setIsAnalyzing(false);
                  setShowReport(true);
                }, 3000);
              }}
            >
              <View style={[styles.smallIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="document-text-outline" size={20} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, fontWeight: 'bold', color: colors.text }}>📝 Geniş Özet (Detaylı Analiz)</Text>
                <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: 2 }}>Tüm videoyu derinlemesine analiz edip detaylı raporlar.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Range Modal */}
      <Modal visible={isTimeRangeModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ width: '85%', backgroundColor: colors.surface, borderRadius: 16, padding: 20 }}>
            <Text style={{ ...typography.h3, color: colors.text, marginBottom: 8 }}>Zaman Aralığı Seçin</Text>
            <Text style={{ ...typography.body, fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>Lütfen incelenecek bölümün başlangıç ve bitiş sürelerini girin.</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              {/* START TIME */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ ...typography.small, color: colors.textSecondary, marginBottom: 8 }}>Başlangıç</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: 50, textAlign: 'center' }}
                    placeholder="00"
                    placeholderTextColor={colors.textSecondary}
                    value={startMin}
                    onChangeText={(t) => {
                      const val = t.replace(/[^0-9]/g, '');
                      setStartMin(val);
                      if (val.length === 2) startSecRef.current?.focus();
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={{ color: colors.text, fontWeight: 'bold', marginHorizontal: 6 }}>:</Text>
                  <TextInput
                    ref={startSecRef}
                    style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: 50, textAlign: 'center' }}
                    placeholder="00"
                    placeholderTextColor={colors.textSecondary}
                    value={startSec}
                    onChangeText={(t) => {
                      const val = t.replace(/[^0-9]/g, '');
                      setStartSec(val);
                      if (val.length === 2) endMinRef.current?.focus();
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>
              
              <Text style={{ color: colors.textSecondary, paddingHorizontal: 4, marginTop: 24 }}>-</Text>
              
              {/* END TIME */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ ...typography.small, color: colors.textSecondary, marginBottom: 8 }}>Bitiş</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    ref={endMinRef}
                    style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: 50, textAlign: 'center' }}
                    placeholder="00"
                    placeholderTextColor={colors.textSecondary}
                    value={endMin}
                    onChangeText={(t) => {
                      const val = t.replace(/[^0-9]/g, '');
                      setEndMin(val);
                      if (val.length === 2) endSecRef.current?.focus();
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={{ color: colors.text, fontWeight: 'bold', marginHorizontal: 6 }}>:</Text>
                  <TextInput
                    ref={endSecRef}
                    style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: 50, textAlign: 'center' }}
                    placeholder="00"
                    placeholderTextColor={colors.textSecondary}
                    value={endSec}
                    onChangeText={(t) => {
                      const val = t.replace(/[^0-9]/g, '');
                      setEndSec(val);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setIsTimeRangeModalVisible(false)} style={{ padding: 10 }}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setIsTimeRangeModalVisible(false);
                  setIsAnalyzing(true);
                  setTimeout(() => {
                    setIsAnalyzing(false);
                    setShowReport(true);
                  }, 2000);
                }} 
                style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: 8 }}>
                <Text style={{ color: colors.background, fontWeight: 'bold' }}>Analiz Et</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text,
  },
  settingsButton: {
    padding: 4,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  orbContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  outerRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(29, 185, 84, 0.3)',
    borderStyle: 'dashed',
  },
  innerOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 15,
  },
  listeningOrb: {
    backgroundColor: '#fff',
    shadowColor: '#fff',
  },
  greetingText: {
    ...typography.h1,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subGreetingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32, // Lift it up so it doesn't touch the protruding AI tab bar icon
    backgroundColor: 'transparent', // Floating effect, no background bar
    zIndex: 30,
    elevation: 30, // Ensures input area is always clickable above the overlay
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a', // Dark background for chat box
    borderRadius: 32, // Perfect pill shape
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  attachButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    color: '#ffffff', // White text for dark pill
    paddingHorizontal: 8,
    maxHeight: 120,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent', // Gemini has transparent bg for mic until active
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: colors.primary, // Glows when listening
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Bottom Sheet / Floating Menu Styles */
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent', // No dark background, just catches touches to close menu
    zIndex: 19,
    elevation: 19, // Fix for Android: covers the orb which has elevation 15
  },
  floatingMenuContainer: {
    position: 'absolute',
    bottom: 110, // Float right above the input pill
    left: 16,
    right: 16,
    zIndex: 20,
    elevation: 20, // Fix for Android: stays above the overlay
  },
  floatingStack: {
    flexDirection: 'column',
    gap: 12,
  },
  floatingRowButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#18181b', // Match the image's dark color
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12, // fallback if gap isn't supported
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  smallIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowButtonText: {
    ...typography.body,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'left',
  },
});

