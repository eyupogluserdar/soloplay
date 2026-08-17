import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme/theme';

interface AnimatedRingProps {
  size: number;
  isPlaying: boolean;
  children: React.ReactNode;
  color?: string;
  borderWidth?: number;
}

export const AnimatedRing = ({ 
  size, 
  isPlaying, 
  children, 
  color = colors.primary, 
  borderWidth = 2 
}: AnimatedRingProps) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      const anim = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
      return () => anim.stop();
    } else {
      rotation.stopAnimation();
      rotation.setValue(0);
    }
  }, [isPlaying]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {isPlaying && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size / 2,
              borderWidth: borderWidth,
              borderColor: 'transparent',
              borderTopColor: color,
              borderBottomColor: color,
              transform: [{ rotate: spin }],
              opacity: 0.8,
            }
          ]}
        />
      )}
      {children}
    </View>
  );
};
