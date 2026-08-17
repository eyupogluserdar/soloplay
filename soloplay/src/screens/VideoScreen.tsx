import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VideoScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Video Oynatıcı</Text>
      </View>
      <View style={styles.content}>
        <Ionicons name="construct-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>Video özelliği çok yakında eklenecek!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingBottom: 15 },
  headerTitle: { ...typography.title, fontSize: 28 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 15 }
});
