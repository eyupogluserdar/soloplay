export const getDummyContent = (category: string) => {
  switch (category) {
    case 'Radyo Dinle':
      return [
        {
          title: 'Popüler İstasyonlar',
          items: [
            { title: 'Kral FM', sub: 'Damar & Arabesk', artwork: 'https://images.unsplash.com/photo-1598555239564-9a99723ecdb9?w=500&q=80' },
            { title: 'Metro FM', sub: 'Hit Müzik', artwork: 'https://images.unsplash.com/photo-1516280440502-a2f00a5a3a2e?w=500&q=80' },
            { title: 'Joy Türk', sub: 'Türkçe Yavaş', artwork: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=500&q=80' },
            { title: 'Süper FM', sub: 'Pop & Hareketli', artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80' },
          ]
        },
        {
          title: 'Bölgesel Radyolar',
          items: [
            { title: 'Karadeniz FM', sub: 'Yöresel Müzik', artwork: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=500&q=80' },
            { title: 'Ege FM', sub: 'Ege Havaları', artwork: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80' },
          ]
        }
      ];
    case 'TV İzle':
      return [
        {
          title: 'Haber & Belgesel',
          items: [
            { title: 'NTV', sub: 'Haberin Merkezi', artwork: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=500&q=80' },
            { title: 'TRT Belgesel', sub: 'Doğa & Tarih', artwork: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=500&q=80' },
            { title: 'CNN Türk', sub: 'Son Dakika', artwork: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&q=80' },
          ]
        },
        {
          title: 'Eğlence',
          items: [
            { title: 'TV8', sub: 'Yarışma & Eğlence', artwork: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=500&q=80' },
            { title: 'Star TV', sub: 'Diziler', artwork: 'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?w=500&q=80' },
          ]
        }
      ];
    case 'Podcastler':
      return [
        {
          title: 'Sizin İçin Seçilenler',
          items: [
            { title: 'Fularsız Entellik', sub: 'Kültür & Felsefe', artwork: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&q=80' },
            { title: 'Ortamlarda Satılacak', sub: 'İlginç Bilgiler', artwork: 'https://images.unsplash.com/photo-1558021212-51b6ecfa0db9?w=500&q=80' },
            { title: 'Zihnin Kodları', sub: 'Kişisel Gelişim', artwork: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=500&q=80' },
          ]
        }
      ];
    default:
      return [
        {
          title: 'Keşfet',
          items: [
            { title: 'Global Top 50', sub: 'En Çok Dinlenenler', artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80' },
            { title: 'Türkçe Pop', sub: 'Yeni Çıkanlar', artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80' },
            { title: 'Akustik', sub: 'Sakin & Yavaş', artwork: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500&q=80' },
            { title: 'Rap & Hip-Hop', sub: 'Enerjik', artwork: 'https://images.unsplash.com/photo-1493225457124-a1a2a5956011?w=500&q=80' },
          ]
        }
      ];
  }
};
