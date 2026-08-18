import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const tabs: Tab[] = [
  { id: 'Dashboard', title: 'Ana Sayfa', icon: 'home' },
  { id: 'Documents', title: 'OCR', icon: 'document-text' },
  { id: 'Scan', title: 'Tara', icon: 'scan' },
  { id: 'MusicDashboard', title: 'Müzik', icon: 'musical-notes' },
];

export const BottomTabBar = ({ 
  currentScreen, 
  onNavigate 
}: { 
  currentScreen: string, 
  onNavigate: (screen: string) => void 
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onNavigate(tab.id)}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              <Ionicons
                name={isActive ? tab.icon : (`${tab.icon}-outline` as any)}
                size={22}
                color={isActive ? colors.background : colors.textSecondary}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1} adjustsFontSizeToFit>
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    ...typography.subtitle,
    fontSize: 10,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: 'bold',
  }
});
