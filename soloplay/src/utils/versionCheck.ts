import { Alert, Linking, Platform } from 'react-native';

// Sürüm kontrolü için bağlanacağımız adres (Bunu ileride kendi sitenize göre değiştirebilirsiniz)
const VERSION_URL = 'https://htmlkod.com/api/soloplay-version.json';

interface VersionData {
  latestVersion: string;
  downloadUrl: string;
  releaseNotes?: string;
  forceUpdate?: boolean;
}

/**
 * 1.0.1 ile 1.0.2 gibi sürüm numaralarını karşılaştırır.
 * Eğer cloudVersion (buluttaki) > currentVersion (telefondaki) ise true döner.
 */
const isUpdateAvailable = (currentVersion: string, cloudVersion: string) => {
  const currentParts = currentVersion.split('.').map(Number);
  const cloudParts = cloudVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, cloudParts.length); i++) {
    const c = currentParts[i] || 0;
    const cl = cloudParts[i] || 0;
    if (cl > c) return true;
    if (cl < c) return false;
  }
  return false;
};

export const checkAppVersion = async () => {
  try {
    if (__DEV__) {
      console.log('Geliştirme modunda sürüm kontrolü atlanıyor.');
      return;
    }

    // 1. Telefondaki uygulamanın mevcut sürümünü alıyoruz (app.json'daki version)
    let currentVersion = '1.0.0';
    try {
      const Application = require('expo-application');
      currentVersion = Application.nativeApplicationVersion || '1.0.0';
    } catch (e) {
      console.log('expo-application modülü bulunamadı, varsayılan sürüm kullanılıyor.');
    }

    // 2. İnternetteki adresten en güncel sürüm bilgisini çekiyoruz
    const response = await fetch(VERSION_URL, { cache: 'no-cache' });
    
    // Eğer dosya henüz yoksa veya 404 verirse sessizce çık
    if (!response.ok) return;

    const data: VersionData = await response.json();

    // 3. Karşılaştırma yapıyoruz
    if (isUpdateAvailable(currentVersion, data.latestVersion)) {
      // 4. Ekrana bildirim (Alert) çıkartıyoruz
      Alert.alert(
        'Yeni Sürüm Mevcut! 🎉',
        data.releaseNotes || 'Uygulamamız için yeni bir çekirdek güncellemesi çıktı. Daha iyi bir deneyim için lütfen güncelleyin.',
        [
          {
            text: data.forceUpdate ? 'Tamam' : 'Daha Sonra',
            style: data.forceUpdate ? 'default' : 'cancel',
            onPress: () => {
              if (data.forceUpdate) {
                // Zorunlu güncelleme ise pencere kapanmasın, tekrar sorsun
                setTimeout(checkAppVersion, 1000);
              }
            }
          },
          {
            text: 'Hemen Güncelle',
            onPress: () => {
              // Kullanıcıyı APK'nın olduğu siteye yönlendir
              Linking.openURL(data.downloadUrl).catch((err) => {
                console.error("Tarayıcı açılamadı:", err);
              });
            }
          }
        ],
        { cancelable: !data.forceUpdate } // Eğer zorunluysa dışarı tıklayarak kapatmayı engelle
      );
    }
  } catch (error) {
    // Sürüm kontrolünde internet kopuksa sessizce hatayı yut (Kullanıcıyı rahatsız etme)
    console.log('Sürüm kontrolü başarısız:', error);
  }
};
