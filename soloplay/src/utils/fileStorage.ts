import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';


const { StorageAccessFramework } = FileSystem;

export type MediaType = 'Müzik' | 'Video' | 'OCR';

/**
 * Checks if SAF permission has been asked, and if not, prompts the user.
 * Returns true if SAF permission is granted (or already granted), false otherwise.
 */
export const requestSAFPermissionIfNeeded = async (): Promise<boolean> => {
  const { safDirectoryUri, hasAskedSafPermission, setSafDirectoryUri, setHasAskedSafPermission } = useSettingsStore.getState();

  if (safDirectoryUri) {
    return true;
  }

  if (hasAskedSafPermission) {
    return false;
  }

  return new Promise((resolve) => {
    Alert.alert(
      "Dosya İzni Gerekli",
      "İndirdiğiniz Müzik, Video ve Taranan Belgeleri (OCR) telefonunuzda tek bir klasörde görebilmeniz için lütfen kayıt edilecek ana klasörü seçin (Örn: İndirilenler klasörü).",
      [
        {
          text: "İstemiyorum",
          style: "cancel",
          onPress: () => {
            setHasAskedSafPermission(true);
            resolve(false);
          }
        },
        {
          text: "Klasör Seç",
          onPress: async () => {
            try {
              const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
              setHasAskedSafPermission(true);
              
              if (permissions.granted) {
                const directoryUri = permissions.directoryUri;
                
                // Eski klasör var mı kontrol et
                const files = await StorageAccessFramework.readDirectoryAsync(directoryUri);
                const existingSoloPlayUri = files.find(f => decodeURIComponent(f).endsWith('/SoloPlay') || decodeURIComponent(f).endsWith('%2FSoloPlay'));
                
                if (existingSoloPlayUri) {
                  Alert.alert(
                    "Mevcut Klasör Bulundu",
                    "Seçtiğiniz klasörde önceden kalma bir 'SoloPlay' klasörü bulduk. İçindeki eski müzik ve videolarınızı uygulamaya geri yüklemek ister misiniz?",
                    [
                      {
                        text: "Hayır, Yeni Aç",
                        style: "cancel",
                        onPress: async () => {
                          setSafDirectoryUri(directoryUri);
                          await StorageAccessFramework.makeDirectoryAsync(directoryUri, 'SoloPlay' + Date.now().toString().slice(-4));
                          resolve(true);
                        }
                      },
                      {
                        text: "Evet, Geri Yükle",
                        onPress: async () => {
                          setSafDirectoryUri(directoryUri);
                          await syncExistingFiles(existingSoloPlayUri);
                          resolve(true);
                        }
                      }
                    ]
                  );
                  return; // Alert'in sonucunu bekliyoruz
                }
                
                setSafDirectoryUri(directoryUri);
                await initializeSAFFolders(directoryUri);
                resolve(true);
              } else {
                resolve(false);
              }
            } catch (e) {
              console.log('SAF permission request failed:', e);
              setHasAskedSafPermission(true);
              resolve(false);
            }
          }
        }
      ]
    );
  });
};

const syncExistingFiles = async (soloPlayUri: string) => {
  try {
    const { playlists, addPlaylist, addTrack } = usePlayerStore.getState();
    let targetPlaylistId = playlists.find(p => p.name === 'YouTube İndirilenler')?.id;
    if (!targetPlaylistId) {
      targetPlaylistId = 'yt_downloads_' + Date.now();
      addPlaylist({ id: targetPlaylistId, name: 'YouTube İndirilenler', tracks: [] });
    }

    const subFiles = await StorageAccessFramework.readDirectoryAsync(soloPlayUri);
    
    // Müzikleri Kurtar
    const musicFolder = subFiles.find(f => decodeURIComponent(f).endsWith('/Müzik') || decodeURIComponent(f).endsWith('%2FMüzik'));
    if (musicFolder) {
      const musicFiles = await StorageAccessFramework.readDirectoryAsync(musicFolder);
      for (const fileUri of musicFiles) {
        const decoded = decodeURIComponent(fileUri).toLowerCase();
        if (decoded.endsWith('.mp3') || decoded.endsWith('.m4a') || decoded.endsWith('.wav')) {
          const fileName = decodeURIComponent(fileUri).split('/').pop()?.replace(/\.(mp3|m4a|wav)$/i, '') || 'Bilinmeyen Müzik';
          addTrack(targetPlaylistId, {
            id: fileUri,
            name: fileName,
            uri: fileUri
          });
        }
      }
    }
    
    // Videoları Kurtar
    const videoFolder = subFiles.find(f => decodeURIComponent(f).endsWith('/Video') || decodeURIComponent(f).endsWith('%2FVideo'));
    if (videoFolder) {
      const videoFiles = await StorageAccessFramework.readDirectoryAsync(videoFolder);
      for (const fileUri of videoFiles) {
        if (decodeURIComponent(fileUri).toLowerCase().endsWith('.mp4')) {
          const fileName = decodeURIComponent(fileUri).split('/').pop()?.replace('.mp4', '') || 'Bilinmeyen Video';
          addTrack(targetPlaylistId, {
            id: fileUri,
            name: fileName,
            uri: fileUri
          });
        }
      }
    }
    
    Alert.alert("Başarılı", "Eski müzik ve videolarınız kütüphanenize (YouTube İndirilenler) başarıyla eklendi!");
  } catch (e) {
    console.log("Geri yükleme hatası:", e);
    Alert.alert("Hata", "Dosyalar geri yüklenirken bir sorun oluştu.");
  }
};

export const promptManualRestore = async () => {
  try {
    Alert.alert(
      "Eski Dosyaları Bul",
      "Lütfen eski SoloPlay klasörünüzü veya onun bulunduğu ana klasörü (Örn: İndirilenler) seçin.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Klasör Seç",
          onPress: () => {
            setTimeout(async () => {
              try {
                const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                  const directoryUri = permissions.directoryUri;
                  
                  if (decodeURIComponent(directoryUri).endsWith('/SoloPlay') || decodeURIComponent(directoryUri).endsWith('%2FSoloPlay') || decodeURIComponent(directoryUri).includes('SoloPlay')) {
                    await syncExistingFiles(directoryUri);
                    return;
                  }

                  const files = await StorageAccessFramework.readDirectoryAsync(directoryUri);
                  const existingSoloPlayUri = files.find(f => decodeURIComponent(f).endsWith('/SoloPlay') || decodeURIComponent(f).endsWith('%2FSoloPlay'));
                  
                  if (existingSoloPlayUri) {
                    await syncExistingFiles(existingSoloPlayUri);
                  } else {
                    Alert.alert("Bulunamadı", "Seçtiğiniz klasörün içinde eski bir 'SoloPlay' dosyası bulamadık. Lütfen doğru yeri seçtiğinizden emin olun.");
                  }
                }
              } catch (e) {
                console.log("SAF Timeout Error:", e);
              }
            }, 400); // Wait for alert to dismiss before opening native picker
          }
        }
      ]
    );
  } catch (e) {
    console.log("Manual restore error:", e);
  }
};

const initializeSAFFolders = async (rootUri: string) => {
  try {
    // We create the root SoloPlay folder
    const soloPlayUri = await StorageAccessFramework.makeDirectoryAsync(rootUri, 'SoloPlay');
    // We create subfolders inside SoloPlay
    await StorageAccessFramework.makeDirectoryAsync(soloPlayUri, 'Müzik');
    await StorageAccessFramework.makeDirectoryAsync(soloPlayUri, 'Video');
    await StorageAccessFramework.makeDirectoryAsync(soloPlayUri, 'OCR');
  } catch (e) {
    console.log('Error initializing SAF folders:', e);
    // Might throw if folders already exist, which is fine
  }
};

/**
 * Gets or creates a subfolder within the root SAF directory.
 */
const getOrCreateSubFolder = async (rootUri: string, folderName: string): Promise<string | null> => {
  try {
    const files = await StorageAccessFramework.readDirectoryAsync(rootUri);
    // Files are URIs. We need to check if one ends with our foldername (encoded)
    // It's safer to just iterate and find the one that matches our folder name.
    
    // Actually, getting the exact URI of a subfolder is tricky in SAF if we only have the root.
    // Instead of parsing, we can try to create it. If it fails (already exists), we can just return the expected URI pattern or find it.
    // A simpler way: when we initialize, we know the URIs? No, we didn't save them.
    // Let's iterate the directory to find the "SoloPlay" folder.
    
    let soloPlayUri = files.find(f => decodeURIComponent(f).endsWith('/SoloPlay') || decodeURIComponent(f).endsWith('%2FSoloPlay'));
    
    if (!soloPlayUri) {
      soloPlayUri = await StorageAccessFramework.makeDirectoryAsync(rootUri, 'SoloPlay');
    }
    
    const subFiles = await StorageAccessFramework.readDirectoryAsync(soloPlayUri);
    let subFolderUri = subFiles.find(f => decodeURIComponent(f).endsWith('/' + folderName) || decodeURIComponent(f).endsWith('%2F' + folderName));
    
    if (!subFolderUri) {
      subFolderUri = await StorageAccessFramework.makeDirectoryAsync(soloPlayUri, folderName);
    }
    
    return subFolderUri;
  } catch (e) {
    console.log(`Failed to get/create folder ${folderName}:`, e);
    return null;
  }
};

/**
 * Saves a file to external storage using SAF (if permitted) or MediaLibrary (fallback).
 */
export const saveToExternalStorage = async (localUri: string, fileName: string, type: MediaType, mimeType: string = 'application/octet-stream') => {
  try {
    const hasSaf = await requestSAFPermissionIfNeeded();
    
    if (hasSaf) {
      const { safDirectoryUri } = useSettingsStore.getState();
      if (safDirectoryUri) {
        const subFolderUri = await getOrCreateSubFolder(safDirectoryUri, type);
        if (subFolderUri) {
          // Create the file in the SAF subfolder
          const newFileUri = await StorageAccessFramework.createFileAsync(subFolderUri, fileName, mimeType);
          
          // We need to read the local file and write it to SAF.
          // FileSystem.readAsStringAsync might crash on large files.
          // Fortunately, in Expo SDK 43+, StorageAccessFramework allows writing via FileSystem.writeAsStringAsync with base64, 
          // or we can use FileSystem.copyAsync? 
          // Wait, FileSystem.copyAsync works with SAF URIs!
          // BUT let's be safe. If copyAsync fails, we can fallback.
          
          try {
             // For large files (like videos), base64 read will crash the app (Out of Memory).
             // We must use copyAsync to move the file to the SAF directory directly.
             // Wait, Expo's copyAsync to SAF uri doesn't always work perfectly, but we will try.
             // If we can't write, we will fallback to MediaLibrary.
             
             // Actually, Expo FileSystem.copyAsync doesn't support SAF destination uris on some versions.
             // Instead, we can read chunk by chunk, or just try copyAsync first.
             await FileSystem.copyAsync({ from: localUri, to: newFileUri });
             return true;
          } catch(err) {
             console.log("Failed to copy file to SAF, falling back to MediaLibrary:", err);
             // Note: If copy fails, we fall through to MediaLibrary fallback below.
          }
        }
      }
    }
    
    // Fallback: Use MediaLibrary
    console.log("Using MediaLibrary fallback for", fileName);
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      const asset = await MediaLibrary.createAssetAsync(localUri);
      // Create album based on type to keep it organized somewhat if SAF fails
      // Note: Android restricts MediaLibrary albums to primary media directories.
      await MediaLibrary.createAlbumAsync('SoloPlay', asset, true);
      return true;
    }
    return false;
  } catch (e) {
    console.log('Error saving to external storage:', e);
    return false;
  }
};
