import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AIIconProps {
  size?: number;
  color?: string;
}

export const AIIcon: React.FC<AIIconProps> = ({ size = 32, color = '#ffffff' }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Büyük Yıldız (Orta) */}
      <MaterialCommunityIcons 
        name="star-four-points-outline" 
        size={size * 0.9} 
        color={color} 
      />
      
      {/* Küçük Yıldız (Sağ Üst Çapraz) */}
      <MaterialCommunityIcons 
        name="star-four-points-outline" 
        size={size * 0.45} 
        color={color} 
        style={{ position: 'absolute', top: -size * 0.1, right: -size * 0.1 }}
      />
      
      {/* Küçük Yıldız (Sol Alt Çapraz) */}
      <MaterialCommunityIcons 
        name="star-four-points-outline" 
        size={size * 0.45} 
        color={color} 
        style={{ position: 'absolute', bottom: -size * 0.1, left: -size * 0.1 }}
      />
    </View>
  );
};
