import PostHog from 'posthog-react-native';

// TODO: Kendi PostHog Proje API anahtarınızı (Project API Key) ve Sunucu adresinizi buraya girin.
// PostHog yapılandırması
export const posthog = new PostHog('phc_oyyW3dYJAwrZkrHtYdDUSa5Hk84gEocCAvLpkpYoxVkH', {
  host: 'https://us.i.posthog.com',
  enableSessionReplay: false, // Expo Go'da yerel modül gerektirdiği için çökertmemesi adına kapalı
});

/**
 * Sayfa görünümlerini (Screen Views) takip etmek için yardımcı fonksiyon
 */
export const trackScreen = (screenName: string) => {
  try {
    posthog.screen(screenName);
  } catch (e) {
    console.log("Analytics error:", e);
  }
};

/**
 * Kullanıcı aksiyonlarını (Örn: Video indirme, Şarkı çalma) takip etmek için yardımcı fonksiyon
 */
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  try {
    posthog.capture(eventName, properties);
  } catch (e) {
    console.log("Analytics error:", e);
  }
};
