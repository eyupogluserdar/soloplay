import React, { useState, useRef } from 'react';
import { View, PanResponder } from 'react-native';
import { colors } from '../theme/theme';

export const CustomSlider = ({ 
  durationMillis, 
  positionMillis, 
  onSeek,
  onDragValueChange 
}: { 
  durationMillis: number;
  positionMillis: number;
  onSeek: (val: number) => void;
  onDragValueChange: (isDragging: boolean, val: number) => void;
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0); 

  const progress = durationMillis > 0 ? (positionMillis / durationMillis) : 0;
  const displayProgress = isDragging ? dragProgress : progress;

  const stateRef = useRef({ durationMillis, containerWidth, onSeek, onDragValueChange, progress });
  stateRef.current = { durationMillis, containerWidth, onSeek, onDragValueChange, progress };

  const containerRef = useRef<View>(null);
  const containerPageX = useRef(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startXRef = useRef(0);
  const lastProgressRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsDragging(true);
        const { containerWidth, durationMillis, onDragValueChange, progress: currentProg } = stateRef.current;
        
        // Use pageX instead of locationX to avoid Android pointerEvents bugs on the thumb
        const pageX = evt.nativeEvent.pageX;
        const reliableLocX = pageX - containerPageX.current;
        
        let startX = 0;
        if (typeof reliableLocX === 'number' && !isNaN(reliableLocX) && reliableLocX > 0 && containerPageX.current > 0) {
          startX = reliableLocX;
        } else if (containerWidth > 0) {
          // Fallback to current progress if measurement failed
          startX = currentProg * containerWidth;
        }
        startXRef.current = startX;

        if (containerWidth > 0) {
          const p = Math.max(0, Math.min(1, startX / containerWidth));
          lastProgressRef.current = p;
          setDragProgress(p);
          onDragValueChange(true, p * durationMillis);
        }
      },
      onPanResponderMove: (_, gestureState) => {
        const { containerWidth, durationMillis, onDragValueChange } = stateRef.current;
        if (containerWidth > 0) {
          const currentX = startXRef.current + gestureState.dx;
          const p = Math.max(0, Math.min(1, currentX / containerWidth));
          lastProgressRef.current = p;
          setDragProgress(p);
          onDragValueChange(true, p * durationMillis);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { containerWidth, durationMillis, onSeek, onDragValueChange } = stateRef.current;
        if (containerWidth > 0 && durationMillis > 0) {
          const p = lastProgressRef.current; // Use reliable progress
          setDragProgress(p);
          onSeek(p * durationMillis);
          
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          
          // Parent'a bittiğini bildiriyoruz ama UI'ı hemen serbest bırakmıyoruz (titremeyi önlemek için)
          onDragValueChange(false, p * durationMillis);
          
          // 600ms boyunca çubuğu bırakılan yerde tutarak motorun gerçek saniyeyi güncellemesine zaman tanıyoruz
          timeoutRef.current = setTimeout(() => {
            setIsDragging(false);
          }, 600);
        } else {
          setIsDragging(false);
        }
      },
      onPanResponderTerminate: () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsDragging(false);
        const { durationMillis, onDragValueChange, progress: currentProg } = stateRef.current;
        onDragValueChange(false, currentProg * durationMillis); 
      }
    })
  ).current;

  return (
    <View 
      ref={containerRef}
      style={{ height: 40, justifyContent: 'center', width: '100%' }}
      onLayout={(e) => {
        setContainerWidth(e.nativeEvent.layout.width);
        containerRef.current?.measure((x, y, w, h, pageX, pageY) => {
          containerPageX.current = pageX;
        });
      }}
      {...panResponder.panHandlers}
    >
      <View style={{ height: 4, backgroundColor: colors.surfaceLight, borderRadius: 2, width: '100%' }} />
      <View style={{ position: 'absolute', left: 0, height: 4, backgroundColor: colors.primary, borderRadius: 2, width: `${displayProgress * 100}%` }} pointerEvents="none" />
      <View style={{ 
        position: 'absolute', 
        left: `${displayProgress * 100}%`, 
        width: 16, 
        height: 16, 
        borderRadius: 8, 
        backgroundColor: colors.primary,
        marginLeft: -8 
      }} pointerEvents="none" />
    </View>
  );
};
