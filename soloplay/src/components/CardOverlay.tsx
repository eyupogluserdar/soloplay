import React from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

interface OverlayOption {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
}

interface CardOverlayProps {
  visible: boolean;
  options: OverlayOption[];
  onClose: () => void;
}

export const CardOverlay = ({ visible, options, onClose }: CardOverlayProps) => {
  if (!visible) return null;

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <View style={styles.buttonContainer}>
        {options.map((option, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.circleButton}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              setTimeout(() => option.onPress(), 50);
            }}
          >
            <Ionicons name={option.icon} size={28} color={option.color || '#1DD75F'} />
          </TouchableOpacity>
        ))}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  circleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
