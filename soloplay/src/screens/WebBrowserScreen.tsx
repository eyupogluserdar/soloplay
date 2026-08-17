import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Keyboard, 
  ScrollView,
  Dimensions,
  SafeAreaView,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Tema renkleri
const colors = {
  background: '#09090b',
  surface: '#18181b',
  surfaceHighlight: '#27272a',
  primary: '#10b981',
  text: '#f4f4f5',
  textSecondary: '#a1a1aa',
  border: '#3f3f46',
  danger: '#ef4444'
};

const AI_TOOLS = [
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', icon: 'chatbubble-ellipses', color: '#10a37f' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', icon: 'sparkles', color: '#8b5cf6' },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai', icon: 'bulb', color: '#d97757' },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai', icon: 'search-circle', color: '#2dd4bf' },
];

const SEARCH_TOOLS = [
  { id: 'google', name: 'Google', url: 'https://www.google.com', icon: 'logo-google', color: '#3b82f6' },
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com', icon: 'logo-youtube', color: '#ef4444' },
];

interface WebBrowserScreenProps {
  onBack: () => void;
}

export const WebBrowserScreen: React.FC<WebBrowserScreenProps> = ({ onBack }) => {
  const [inputUrl, setInputUrl] = useState<string>('');

  const handleNavigate = async (url: string) => {
    Keyboard.dismiss();
    
    let finalUrl = url.trim();
    if (!finalUrl) return;

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = 'https://' + finalUrl;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
      }
    }

    try {
      await Linking.openURL(finalUrl);
      setInputUrl('');
    } catch (e) {
      alert("Bu bağlantı açılamadı.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navButton} onPress={onBack}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.addressBarContainer}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginLeft: 12 }} />
          
          <TextInput
            style={styles.addressInput}
            placeholder="Arama yapın veya URL girin..."
            placeholderTextColor={colors.textSecondary}
            value={inputUrl}
            onChangeText={setInputUrl}
            onSubmitEditing={() => handleNavigate(inputUrl)}
            returnKeyType="go"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="web-search"
          />
          
          {inputUrl.length > 0 && (
            <TouchableOpacity onPress={() => setInputUrl('')} style={{ padding: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Portal İçeriği */}
      <View style={styles.content}>
        <ScrollView style={styles.portalContainer} contentContainerStyle={styles.portalContent}>
          <View style={styles.portalHeader}>
            <View style={styles.portalIconContainer}>
              <Ionicons name="planet" size={32} color={colors.background} />
            </View>
            <Text style={styles.portalTitle}>Keşfet</Text>
            <Text style={styles.portalSubtitle}>Yapay Zeka & Web Araçları</Text>
          </View>

          <Text style={styles.sectionTitle}>Yapay Zeka Asistanları</Text>
          <View style={styles.gridContainer}>
            {AI_TOOLS.map(tool => (
              <TouchableOpacity 
                key={tool.id} 
                style={styles.gridCard}
                onPress={() => handleNavigate(tool.url)}
              >
                <View style={[styles.cardIconWrapper, { backgroundColor: tool.color + '20' }]}>
                  <Ionicons name={tool.icon as any} size={28} color={tool.color} />
                </View>
                <Text style={styles.cardText}>{tool.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Arama & Medya</Text>
          <View style={styles.gridContainer}>
            {SEARCH_TOOLS.map(tool => (
              <TouchableOpacity 
                key={tool.id} 
                style={styles.gridCard}
                onPress={() => handleNavigate(tool.url)}
              >
                <View style={[styles.cardIconWrapper, { backgroundColor: tool.color + '20' }]}>
                  <Ionicons name={tool.icon as any} size={28} color={tool.color} />
                </View>
                <Text style={styles.cardText}>{tool.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  navButton: {
    padding: 8,
    marginRight: 5,
  },
  addressBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    height: 40,
  },
  addressInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    height: '100%',
  },
  content: {
    flex: 1,
  },
  
  // Portal Styles
  portalContainer: {
    flex: 1,
  },
  portalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  portalHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  portalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  portalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  portalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: (width - 55) / 2, // 2 columns with padding
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  cardIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
});
