import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/theme';

interface AIMemoryScreenProps {
  onNavigate: (screen: string) => void;
}

export const AIMemoryScreen: React.FC<AIMemoryScreenProps> = ({ onNavigate }) => {
  const [currentTime] = useState(new Date());

  const formattedDate = currentTime.toLocaleDateString('tr-TR', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const formattedTime = currentTime.toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="hardware-chip" size={28} color={colors.primary} />
          <Text style={styles.headerTitle}>AI Hafıza & Bağlam</Text>
        </View>
        <Text style={styles.headerSubtitle}>Soloplay Asistan Sistem Belleği</Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        
        {/* Zaman ve Sistem Durumu */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={20} color={colors.textSecondary} />
            <Text style={styles.cardTitle}>Zaman & Sistem Durumu</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Tarih</Text>
              <Text style={styles.timeValue}>{formattedDate}</Text>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Saat</Text>
              <Text style={styles.timeValue}>{formattedTime}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.statusText}>Sistem Aktif - API Bağlantısı Bekleniyor</Text>
          </View>
        </View>

        {/* AI Amacı ve Yönergeleri */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="compass" size={20} color={colors.textSecondary} />
            <Text style={styles.cardTitle}>Asistanın Karakteri & Yönergeleri</Text>
          </View>
          <View style={styles.directiveBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.directiveText}>Kullanıcıya her zaman bir yoldaş, samimi bir dost ve onu motive eden bir koç gibi davran.</Text>
          </View>
          <View style={styles.directiveBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.directiveText}>Resmi robotik dilden uzak dur; içten, destekleyici ve insani bir bağ kur.</Text>
          </View>
          <View style={styles.directiveBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.directiveText}>Kullanıcının gelişimini (sağlık, eğitim, kariyer) takip et ve yeri geldiğinde ona hatırlatmalar yap.</Text>
          </View>
        </View>

        {/* AI Kayıt Odası (Arşiv ve Bağlam) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="server" size={20} color={colors.textSecondary} />
            <Text style={styles.cardTitle}>AI Kayıt Odası (Bağlam)</Text>
          </View>
          <Text style={styles.infoDescription}>
            Asistanın sizi tanıması için tutulan kişisel hafıza, sohbet ve belge arşivleri.
          </Text>
          
          <View style={styles.vaultGrid}>
            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="chatbubbles-outline" size={24} color={colors.text} />
              <Text style={styles.vaultText}>Sohbet Geçmişi</Text>
              <Text style={styles.vaultCount}>0 Kayıt</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="bookmarks-outline" size={24} color={colors.text} />
              <Text style={styles.vaultText}>Öğrenilenler</Text>
              <Text style={styles.vaultCount}>0 Veri</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="document-text-outline" size={24} color={colors.text} />
              <Text style={styles.vaultText}>Tarananlar</Text>
              <Text style={styles.vaultCount}>0 Belge</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* İşlem Kayıt Odası (Operasyonlar) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="analytics" size={20} color={colors.textSecondary} />
            <Text style={styles.cardTitle}>İşlem Kayıt Odası</Text>
          </View>
          <Text style={styles.infoDescription}>
            Asistanın gerçekleştirdiği araç operasyonları ve sistemdeki görev akışınız.
          </Text>
          
          <View style={styles.vaultGrid}>
            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="videocam-outline" size={24} color="#8b5cf6" />
              <Text style={styles.vaultText}>Video Analizleri</Text>
              <Text style={styles.vaultCount}>0 Rapor</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="globe-outline" size={24} color="#3b82f6" />
              <Text style={styles.vaultText}>İnternet Aramaları</Text>
              <Text style={styles.vaultCount}>0 İşlem</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="list-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.vaultText}>Tüm Görevler</Text>
              <Text style={styles.vaultCount}>0 Görev</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
              <Text style={styles.vaultText}>Yapılanlar</Text>
              <Text style={styles.vaultCount}>0 Görev</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="time-outline" size={24} color="#f59e0b" />
              <Text style={styles.vaultText}>Bekleyenler</Text>
              <Text style={styles.vaultCount}>0 Görev</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="alert-circle-outline" size={24} color="#ef4444" />
              <Text style={styles.vaultText}>Gecikmiş Olanlar</Text>
              <Text style={styles.vaultCount}>0 Görev</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Kullanıcı Profil ve Gelişim Odası */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={20} color={colors.textSecondary} />
            <Text style={styles.cardTitle}>Kullanıcı Gelişim Odası</Text>
          </View>
          <Text style={styles.infoDescription}>
            Sizin başladığınız noktadan bugüne kadarki evriminizi, hobilerinizi ve karakteristik haritanızı temsil eder. Asistan, "Kiminle yürüyorum?" sorusunun cevabını buradan okur.
          </Text>
          
          <View style={styles.vaultGrid}>
            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="id-card-outline" size={24} color="#06b6d4" />
              <Text style={styles.vaultText}>Kişisel Profil</Text>
              <Text style={styles.vaultCount}>Kimlik & Yaş</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="trending-up-outline" size={24} color="#10b981" />
              <Text style={styles.vaultText}>İlerleme Eğrisi</Text>
              <Text style={styles.vaultCount}>Zaman Çizelgesi</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="heart-outline" size={24} color="#ec4899" />
              <Text style={styles.vaultText}>İlgi Alanları</Text>
              <Text style={styles.vaultCount}>Hedef & Hobi</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.vaultItem}>
              <Ionicons name="pulse-outline" size={24} color="#f43f5e" />
              <Text style={styles.vaultText}>Davranış Örüntüleri</Text>
              <Text style={styles.vaultCount}>Alışkanlık & Zaaf</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom padding spacing for tab bar */}
        <View style={{ height: 100 }} />

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
    fontSize: 24,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  editButton: {
    padding: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeBox: {
    flex: 1,
    backgroundColor: '#18181b',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  timeLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timeValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  statusText: {
    ...typography.body,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
    width: 110,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
  },
  infoDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 12,
    lineHeight: 20,
  },
  directiveBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#18181b',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  directiveText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  vaultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  vaultItem: {
    width: '48%',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  vaultText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  vaultCount: {
    ...typography.small,
    color: colors.textSecondary,
  },
});
