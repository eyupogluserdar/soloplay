import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/theme';
import { useProfileStore } from '../store/useProfileStore';

interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
  onNavigateToPlaylist?: (id: string, name: string) => void;
  onOpenPlayer?: () => void;
}

export const getAgeGroup = (ageStr: string) => {
  const age = parseInt(ageStr);
  if (isNaN(age)) return 'adult';
  if (age <= 13) return 'child';
  if (age <= 22) return 'teen';
  if (age <= 55) return 'adult';
  return 'senior';
};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { 
    userName, userAge, reportStrengths, reportImprovements, aiComment, resetProfile 
  } = useProfileStore();
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  
  const ageGroup = userAge ? getAgeGroup(userAge) : 'yetişkin';
  const currentIcon = ageGroup === 'child' ? 'game-controller' : ageGroup === 'teen' ? 'headset' : ageGroup === 'adult' ? 'briefcase' : 'cafe';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="person" size={28} color={colors.primary} />
          <Text style={styles.headerTitle}>Profilim</Text>
        </View>
        <Text style={styles.headerSubtitle}>Eylemlerinize göre şekillenen kişisel alanınız</Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View>
              <Text style={styles.levelTitle}>Seviye 1: Çırak Kaşif</Text>
              <Text style={styles.levelSubtitle}>Gelişim Aşaması</Text>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>150 XP</Text>
            </View>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: '30%' }]} />
          </View>
          <Text style={styles.progressText}>Sonraki seviyeye 350 XP kaldı</Text>
        </View>

        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => setIsProfileExpanded(!isProfileExpanded)}
          style={[styles.card, { borderColor: colors.primary, borderWidth: 1, marginBottom: 16 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={currentIcon as any} size={48} color={colors.primary} />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={{ ...typography.h1, fontSize: 22, color: colors.text }}>{userName.trim() || 'Kullanıcı'}</Text>
              <Text style={{ ...typography.body, color: colors.textSecondary, fontSize: 14 }}>{userAge} Yaşında • {ageGroup.toUpperCase()}</Text>
            </View>
            <Ionicons name={isProfileExpanded ? "chevron-up" : "chevron-down"} size={24} color={colors.textSecondary} />
          </View>
          
          {!isProfileExpanded && (
            <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
               <View style={{ flex: 1 }}>
                 <Text style={{ ...typography.body, color: colors.textSecondary, fontSize: 12 }}>İrade Puanı</Text>
                 <Text style={{ ...typography.h2, color: colors.primary, fontSize: 18 }}>%0</Text>
               </View>
               <View style={{ flex: 1 }}>
                 <Text style={{ ...typography.body, color: colors.textSecondary, fontSize: 12 }}>Hedef Başarısı</Text>
                 <Text style={{ ...typography.h2, color: '#f59e0b', fontSize: 18 }}>%0</Text>
               </View>
               <View style={{ flex: 1 }}>
                 <Text style={{ ...typography.body, color: colors.textSecondary, fontSize: 12 }}>Deneyim (XP)</Text>
                 <Text style={{ ...typography.h2, color: '#3b82f6', fontSize: 18 }}>0</Text>
               </View>
            </View>
          )}

          {isProfileExpanded && (
            <View style={{ marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
              
              <View style={{ width: '100%', marginBottom: 20 }}>
                <Text style={{ ...typography.h2, color: colors.primary, marginBottom: 8 }}>✨ Güçlü Yönler / İlgi Alanları</Text>
                <Text style={{ ...typography.body, color: colors.text, lineHeight: 22 }}>{reportStrengths}</Text>
              </View>

              <View style={{ width: '100%', marginBottom: 24 }}>
                <Text style={{ ...typography.h2, color: colors.primary, marginBottom: 8 }}>🎯 Gelişim Alanları / Zorluklar</Text>
                <Text style={{ ...typography.body, color: colors.text, lineHeight: 22 }}>{reportImprovements}</Text>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
                   <Text style={{ ...typography.body, color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>İrade Puanı (%0)</Text>
                   <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: 4 }}>
                     <View style={{ height: '100%', width: '0%', backgroundColor: colors.primary, borderRadius: 3 }} />
                   </View>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
                   <Text style={{ ...typography.body, color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Hedef Başarısı (%0)</Text>
                   <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: 4 }}>
                     <View style={{ height: '100%', width: '0%', backgroundColor: '#f59e0b', borderRadius: 3 }} />
                   </View>
                </View>
              </View>

              <View style={{ width: '100%', backgroundColor: 'rgba(16,185,129,0.1)', padding: 16, borderRadius: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="sparkles" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ ...typography.h2, color: colors.primary }}>Soloplay AI Notu</Text>
                </View>
                <Text style={{ ...typography.body, color: colors.text, lineHeight: 24, fontStyle: 'italic' }}>{aiComment}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="time-outline" size={24} color={colors.primary} style={styles.statIcon} />
            <Text style={styles.statValue}>12 dk</Text>
            <Text style={styles.statLabel}>Günlük AI Etkileşimi</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="flash-outline" size={24} color="#f59e0b" style={styles.statIcon} />
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Tamamlanan Eylem</Text>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 0 }]}>
           <Text style={{ ...typography.h2, color: colors.text, marginBottom: 16 }}>🎯 Bugünün Görevleri</Text>
           <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.text, fontWeight: 'bold' }}>
                  {ageGroup === 'child' ? 'Oyun oynamadan önce 1 saat ders çalış' : 'Bugün telefon süresini 1 saat azalt'}
                </Text>
                <Text style={{ ...typography.body, color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>Ödül: +50 XP, +10 İrade</Text>
              </View>
           </View>
        </View>

        <TouchableOpacity 
          style={{ marginTop: 24, padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}
          onPress={() => {
            Alert.alert(
              "Yeni Profil Oluştur",
              "Mevcut profiliniz silinecek ve asistan ekranında kayıt sürecine baştan başlayacaksınız. Emin misiniz?",
              [
                { text: "İptal", style: "cancel" },
                { text: "Evet, Sil ve Yeniden Başla", style: "destructive", onPress: () => {
                    resetProfile();
                    onNavigate('Assistant');
                }}
              ]
            );
          }}
        >
          <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>Yeni Profil Oluştur</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    ...typography.h1,
    fontSize: 28,
    color: colors.text,
    marginLeft: 12,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  levelCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelTitle: {
    ...typography.h2,
    color: colors.primary,
  },
  levelSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
  },
  xpBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  xpText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    ...typography.h2,
    fontSize: 24,
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
