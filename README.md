# Kelime

Türkçe kelimeleri tahtada buluşturan, arkadaşla veya bilgisayara karşı oynanabilen mobil kelime oyunu.

<p align="center">
  <img src="assets/icon.png" width="128" alt="Kelime uygulama simgesi">
</p>

Kelime; 15×15 oyun tahtası, Türkçe harf taşları ve TDK sözlük doğrulamasıyla mobilde oynanmak üzere geliştirilmiş bir prototiptir. Uygulama Expo SDK 57, React Native ve TypeScript kullanır.

## Öne çıkanlar

- **Bilgisayara karşı oyna:** Davet beklemeden bir oyun başlat; bilgisayar her hamleden sonra yanıt versin.
- **Arkadaşını davet et:** Kullanıcı ID’siyle davet gönder, daveti kabul et ve sırayla oyna.
- **Hamleni hazırla:** Harfleri sürükleyip bırak veya dokunarak yerleştir; kelimeleri ve puan önizlemesini gör.
- **Tahtayı rahatça incele:** 15×15 tahtayı ekrana sığdır, yakınlaştır ve sürükleyerek hareket ettir.
- **Türkçe kelime kontrolü:** Ana ve çapraz kelimeler hamle gönderilmeden önce TDK Güncel Türkçe Sözlük API’sinde doğrulanır.
- **Oyun puanlaması:** Harf/kelime bonus kareleri, sıfır puanlı jokerler ve yedi harfi aynı turda kullanma bonusu bulunur.

## Gereksinimler

- Node.js 22.13 veya üzeri
- npm
- iOS Simulator veya Android emülatörü ya da Expo Go destekleyen bir mobil cihaz

## Kurulum ve çalıştırma

Bağımlılıkları yükleyin ve API sunucusunu ilk terminalde başlatın:

```sh
npm install
npm run server
```

İkinci terminalde `.env.example` dosyasını `.env` olarak kopyalayın ve `EXPO_PUBLIC_API_URL` adresini çalıştırdığınız ortama göre ayarlayın:

```sh
cp .env.example .env
```

- **Fiziksel cihaz:** Bilgisayarınızın yerel ağ IP adresini kullanın; telefon ve bilgisayar aynı ağa bağlı olmalı ve `3001` portuna erişebilmelidir. Örnek: `http://192.168.1.25:3001`.
- **iOS Simulator:** `http://localhost:3001` kullanın.
- **Android emülatörü:** `http://10.0.2.2:3001` kullanın.

Ardından uygulamayı başlatın:

```sh
npm start
```

Terminaldeki QR kodunu Expo Go ile tarayın veya geliştirme menüsünden emülatörde açın. Kısayollar için `npm run ios` ve `npm run android` kullanılabilir. API adresini değiştirdiğinizde Metro'yu yeniden başlatın. Expo Go ile uyumlu olmayan bir native modül eklenirse development build gerekir.

## Nasıl oynanır?

### Bilgisayara karşı

Profil oluşturduktan sonra **Bilgisayarla oyna** seçeneğine dokunun. İlk hamle sizindir; her hamle veya pas sonrasında bilgisayar otomatik oynar. Açık bir bilgisayar oyunu varsa aynı seçenek o oyuna döner. Bilgisayar küçük bir yerel Türkçe kelime listesinden aday hamleler arar; aday kelimeler de TDK kontrolünden geçer. Uygun hamle bulamazsa pas geçer. Bu mod çevrimdışı çalışmaz; API sunucusu açık olmalıdır.

### Bir arkadaşla

1. İki cihazda da bir oyuncu profili oluşturun; kullanıcı ID’si ana ekranda görünür.
2. Oyunculardan biri diğerinin ID’sini girerek davet göndersin.
3. Davet alan oyuncu isteği kabul etsin; daveti gönderen ilk hamleyi yapsın.
4. Harfleri tahtaya yerleştirip **Hamleyi oyna** düğmesine dokunun. Diğer cihazın oyun durumu yaklaşık 2,5 saniyede bir yenilenir.

## Oyun kuralları

- Tahta 15×15 kareden, oyuncu eli en fazla yedi harften oluşur.
- İlk kelime en az iki harf içermeli ve merkez karesinden geçmelidir. Sonraki hamleler mevcut harflere bağlanmalı; tek satır veya sütunda, arada boşluk kalmadan yerleşmelidir.
- Hamlede oluşan yatay ve dikey kelimelerin tamamı sözlükten geçmelidir. Geçersiz hamle tahta, puan veya sıra durumunu değiştirmez.
- 2×/3× harf ve kelime kareleri yalnızca o turda yeni taş konduğunda puana etki eder. Yedi harfin tamamını kullanmak +50 puan kazandırır.
- Joker seçilen harfin yerine geçer ve 0 puan değerindedir.
- Arka arkaya dört pas veya bir oyuncunun elinin bitmesi oyunu tamamlar. Bu prototipte elde kalan harfler için puan kesintisi uygulanmaz.

## Teknik yapı

| Alan | Kullanılan teknoloji |
| --- | --- |
| Mobil uygulama | Expo SDK 57, React Native 0.86, React 19, TypeScript 6 |
| Oyun tahtası | React Native Gesture Handler, Reanimated ve Worklets |
| Oturum saklama | `expo-secure-store` |
| API sunucusu | Node.js yerleşik HTTP sunucusu |
| Oyun durumu | Yerel `server/data.json` dosyası |

Uygulama ve API ayrı süreçler olarak çalışır. Sunucu oyuncu profillerini, davetleri, oyun sırasını, puanlamayı ve hamle doğrulamasını yönetir. İstemci oturum anahtarını cihazdaki SecureStore alanında tutar. Sunucu rakibin harf rafını diğer oyuncunun API yanıtına dahil etmez.

## Test ve kalite kontrolleri

```sh
npm run lint
npm run typecheck
npm test
node --test tests/*.test.mjs
```

`npm test`, sunucu oyun kuralları, sözlük ve API testlerini çalıştırır. Son komut tahta koordinat/yerleşim testlerini çalıştırır.

## Sözlük ve kapsam

Oyuncu ve bilgisayar hamlelerinde oluşan kelimeler sunucudan TDK Güncel Türkçe Sözlük API’sinde baş sözcük olarak aranır. Yalnızca tanımı bulunan ve özel ad olmayan maddeler kabul edilir; çekimli biçimler veya turnuva sözlüğü desteği iddiası yoktur. TDK’ya erişilemiyorsa hamle kabul edilmez. Bilgisayarın aday kelime listesi ayrı bir yerel kaynaktır; kaynağı ve lisans bilgisi için [`server/dictionary/README.md`](server/dictionary/README.md) dosyasına bakın.

Bu depo yerel geliştirme ve prototip amaçlıdır; internete açık yayın sunucusu değildir. `server/data.json` yerel oyun verilerini saklar ve Git’e eklenmez. İnternete dağıtım öncesinde HTTPS, kalıcı/veritabanı tabanlı depolama, kötüye kullanım sınırlaması, hesap kurtarma ve operasyonel güvenlik ayrıca ele alınmalıdır. Web sürümü yapılandırılmamış ve desteklenen bir hedef değildir.

Depodaki [`LICENSE`](LICENSE) dosyası Expo MIT lisans metnidir; Kelime uygulamasına özel lisans ayrıca belirtilmemiştir.
