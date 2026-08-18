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
    // Check if permission is still valid (user might have revoked it or app data cleared)
    // Actually Expo's SAF doesn't easily let us check validity without trying to use it.
    // We assume it's valid if we have the URI.
    return true;
  }

  if (hasAskedSafPermission) {
    return false; // Already asked and they denied, or it failed.
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
                setSafDirectoryUri(directoryUri);
                // Create SoloPlay root folder and subfolders immediately
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
