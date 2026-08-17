import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import { usePlayerStore } from '../store/usePlayerStore';
import type { Track } from '../store/usePlayerStore';

export const scanAndRecoverFiles = async () => {
  const store = usePlayerStore.getState();
  
  // Eğer daha önce kontrol edildiyse veya kullanıcının listesi boş değilse tekrar sorma
  if (store.hasCheckedRecovery || store.playlists.length > 0) {
    return;
  }

  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    
    if (status !== 'granted') {
      store.setHasCheckedRecovery(true);
      return;
    }

    const album = await MediaLibrary.getAlbumAsync('SoloPlay');
    
    if (!album) {
      store.setHasCheckedRecovery(true);
      return;
    }

    const assets = await MediaLibrary.getAssetsAsync({
      album: album.id,
      mediaType: 'audio',
      first: 1000,
    });

    if (assets.assets.length === 0) {
      store.setHasCheckedRecovery(true);
      return;
    }

    const recoveredTracks: Track[] = [];

    for (const asset of assets.assets) {
      // Dosya adından ID ve Title'ı ayıkla. Formatımız: SarkiAdi_ID.mp3
      // Örn: Taylor Swift Blank Space_e-ORhEE9VVg.mp3
      const filename = asset.filename || '';
      const match = filename.match(/^(.*)_([a-zA-Z0-9_-]{11})\.mp3$/);
      
      let title = filename;
      let id = undefined;

      if (match) {
        title = match[1].trim();
        id = match[2];
      } else {
        // Eğer format uymuyorsa uzantıyı at
        title = filename.replace(/\.mp3$/, '').trim();
      }

      recoveredTracks.push({
        id,
        name: title,
        artist: 'Kurtarılan Parça',
        uri: asset.uri,
      });
    }

    if (recoveredTracks.length > 0) {
      Alert.alert(
        'Önceki Kayıtlar Bulundu',
        `Cihazınızda SoloPlay klasöründe daha önceden indirilmiş ${recoveredTracks.length} adet şarkı bulundu. Listeye geri yüklemek ister misiniz?`,
        [
          {
            text: 'Sıfırdan Başla',
            style: 'cancel',
            onPress: () => {
              store.setHasCheckedRecovery(true);
            },
          },
          {
            text: 'Geri Yükle',
            style: 'default',
            onPress: () => {
              const newId = 'yt_downloads_' + Date.now();
              store.addPlaylist({
                id: newId,
                name: 'YouTube İndirilenler',
                tracks: recoveredTracks,
              });
              store.setHasCheckedRecovery(true);
              Alert.alert('Başarılı', 'Eski parçalarınız geri yüklendi!');
            },
          },
        ],
        { cancelable: false }
      );
    } else {
      store.setHasCheckedRecovery(true);
    }
  } catch (error) {
    console.error('Kurtarma hatası:', error);
    store.setHasCheckedRecovery(true);
  }
};
