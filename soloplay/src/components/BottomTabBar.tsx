import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIIcon } from './AIIcon';

type Tab = {
  id: string;
  title: string;
  icon: string;
  iconFamily?: 'Ionicons' | 'MaterialCommunityIcons';
  isCenter?: boolean;
};

const tabs: Tab[] = [
  { id: 'Dashboard', title: 'Profilim', icon: 'person-circle', iconFamily: 'Ionicons' },
  { id: 'Scan', title: 'Tara', icon: 'scan', iconFamily: 'Ionicons' },
  { id: 'Assistant', title: 'Asistan', icon: 'sparkles', iconFamily: 'Ionicons', isCenter: true },
  { id: 'AIMemory', title: 'AI Hafıza', icon: 'hardware-chip', iconFamily: 'Ionicons' },
  { id: 'MusicDashboard', title: 'Medya', icon: 'musical-notes', iconFamily: 'Ionicons' },
];

interface BottomTabBarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onLongPressAssistant?: () => void;
  isListening?: boolean;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ 
  currentScreen, 
  onNavigate,
  onLongPressAssistant,
  isListening = false
}) => {
  const insets = useSafeAreaInsets();
  
  const listenAnim = useRef(new Animated.Value(isListening ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(listenAnim, {
      toValue: isListening ? 1 : 0,
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [isListening]);

  const centerBgColor = listenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary, '#ffffff']
  });

  const centerShadow = listenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary, '#ffffff']
  });

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.id;
        
        if (tab.isCenter) {
          return (
            <View key={tab.id} style={styles.centerTabContainer}>
              <Animated.View style={[styles.centerButton, { backgroundColor: centerBgColor, shadowColor: centerShadow, shadowOpacity: listenAnim.interpolate({inputRange:[0,1], outputRange:[0.6, 1]}), shadowRadius: 15 }]}>
                <TouchableOpacity
                  style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.8}
                  onPress={() => onNavigate(tab.id)}
                  delayLongPress={700}
                  onLongPress={() => {
                    if (tab.id === 'Assistant' && onLongPressAssistant) {
                      onLongPressAssistant();
                    }
                  }}
                >
                  <AIIcon size={28} color={isListening ? colors.primary : colors.background} />
                </TouchableOpacity>
              </Animated.View>
              <Text style={[styles.label, isActive && styles.labelActive, { marginTop: 8 }]}>
                {tab.title}
              </Text>
            </View>
          );
        }

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
    alignItems: 'flex-end',
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
    paddingBottom: 4,
  },
  centerTabContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1.2,
    marginTop: -25, // Pop up out of the bar
    paddingBottom: 4,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
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
