# Kelime

Expo SDK 57 + React Native + TypeScript ile arkadaşla veya bilgisayara karşı oynanan Türkçe kelime oyunu prototipi.
Node.js 22.13 veya üzeri gerekir.

## Çalıştırma

```sh
npm install
npm run server
```

İkinci terminalde `.env.example` dosyasını `.env` olarak kopyalayın ve
`EXPO_PUBLIC_API_URL` değerini sunucu bilgisayarının yerel IP adresiyle güncelleyin.
Gerçek telefonda `localhost` telefonun kendisidir. Her iki telefon ve bilgisayar
aynı ağda olmalı; 3001 portuna erişilebilmelidir.

```sh
npm start
```

QR kodunu SDK 57 destekleyen Expo Go ile açın veya uyumlu development build kullanın.
iOS simülatörü için `npm run ios`, Android emülatörü için `npm run android`.
Android emülatöründe bilgisayara erişmek için `http://10.0.2.2:3001` kullanılabilir.
API adresini değiştirdikten sonra Metro'yu yeniden başlatın.

## Bilgisayarla oynama

Profil oluşturduktan sonra ana ekrandaki **Bilgisayarla oyna** düğmesine dokunun.
Davet gerekmez; ilk hamleyi siz yaparsınız. Her hamle veya pastan sonra bilgisayar
otomatik oynar. Açık bir bilgisayar oyunu varsa aynı düğme o oyuna döner;
oyun bitince yeni oyun başlatabilirsiniz.

Bilgisayar küçük, yerleşik bir Türkçe kelime listesinde uygun hamleleri arar ve
buldukları arasından en yüksek puanlı olanı seçer. Hamle bulamazsa pas geçer.
Oyuncu ve bilgisayarın oluşturduğu bütün kelimeler aynı sözlükte doğrulanır.
Bu mod da sunucu bağlantısı gerektirir; çevrimdışı mod değildir.
Sunucu kodu değiştiğinde `npm run server` işlemini yeniden başlatın.

## İki kişiyle deneme

1. İki ayrı cihazda oyuncu adı oluşturun. Kullanıcı ID’si ekranda görünür.
2. Birinci oyuncu diğerinin ID’sini girip davet gönderir.
3. İkinci oyuncu gelen daveti kabul eder. Her iki oyuncu tahtayı açar.
4. Daveti gönderen başlar. Eldeki harfe, ardından tahtadaki kareye dokunur.
5. İlk hamle en az iki harf içermeli ve merkezden geçmelidir. Sonraki hamleler
   mevcut harflere bağlanmalı; tek satır veya sütunda boşluksuz yerleşmelidir.
6. “Hamleyi oyna” ile gönderin. Diğer cihaz yaklaşık 2,5 saniyede güncellenir.

Kullanıcı ID’si paylaşılabilir; kimlik doğrulama ayrı rastgele oturum anahtarıyla
sağlanır. Anahtar cihazda SecureStore içinde saklanır. Sunucu rakibin elini veya
oturum anahtarlarını diğer oyuncuya göndermez. Sunucu verileri git'e eklenmeyen
`server/data.json` dosyasında tutulur ve yeniden başlatmada yüklenir.

## İlk sürüm kuralları ve sınırlar

- 15×15 tahta, 7 harflik el, Türkçe harfler, davet kabul/ret, puan ve sıra kontrolü.
- **Türkçe sözlük modu:** Ana ve çapraz kelimeler sunucuda TDK Güncel Türkçe
  Sözlük baş sözcükleriyle doğrulanır. Sözlük bağlantısı yoksa hamle kabul edilmez.
  Geçersiz hamle tahtayı, puanı veya sırayı değiştirmez.
- 15×15 standart bonus kareleri (2×/3× harf ve kelime), sıfır puanlı joker
  taşları ve 7 harfle oynama bonusu (+50) vardır. Bonus yalnızca yeni taşın
  konduğu turda uygulanır.
- Arka arkaya 4 pas veya bir oyuncunun elinin bitmesi oyunu bitirir.
  Eldeki kalan harflere puan kesintisi uygulanmaz.
- Yerel geliştirme sunucusudur; internete dağıtılmadı. Yayın sürümü için HTTPS,
  veritabanı, hesap kurtarma, istek sınırlama gerekir.
- Web hedefi hazırlanmadı; oturum saklama iOS/Android içindir.

## Kontroller

```sh
npm run typecheck
npm run lint
npm test
npx expo export --platform ios --output-dir /tmp/kelime-export
```

`server/game.mjs`: oyun kuralları. `server/index.mjs`: kimlik, davet ve oyun API’si.
`src/GameApp.tsx`: mobil arayüz. `server/*.test.mjs`: kurallar ve iki kullanıcılı API testleri.

## Tahta ve dokunmatik kontroller

15×15 oyun ekranı dikey kaydırma istemez; tahta kullanılabilir yüksekliğe
otomatik sığar. İki parmakla 1–3 kat yakınlaştırıp uzaklaştırabilirsiniz;
yakınlaştırınca tek parmakla sürükleyin. “Sığdır” görünümü sıfırlar, +/−
düğmeleri alternatif kontrol sağlar. Menü ve oyun listesi kaydırılabilir.

Gesture paketlerini ilk kurduktan sonra Metro'yu `npx expo start --clear` ile
başlatın. Tahta koordinat testleri: `node --test tests/*.test.mjs` (Node 24).
Gerçek cihazda kontrol: 320–430 pt telefon ve tablet ekranlarında tam tahta,
iki parmakla yakınlaştırma/uzaklaştırma, kenarlarda sürükleme, büyütülmüş kareye
harf bırakma, Sığdır ve büyük sistem yazı boyutu.

## Harf sürükleme ve puan gösterimi

Eldeki harfi doğrudan tahtaya sürükleyin. Zoom ve kaydırma konumu
bırakılan karenin hesabına katılır. Tahta dışına veya dolu kareye bırakma eli
değiştirmez. Dokunarak seçme/yerleştirme alternatifi korunur.
Tahtadaki harflerin sağ alt köşesinde puanları görünür; boş bonus kareleri
2H/3H (harf) ve 2K/3K (kelime) olarak işaretlenir. Taslakta TDK'da karşılığı
olan her yatay/dikey kelime yeşil çerçeve ve basılabilir +puan rozetiyle görünür.
Rozete basmak hamlenin tamamını oynar. Son hamleler turuncu çerçeveyle gösterilir.
Joker harfin yerine geçer, 0 puan alır ve rakibe aynı işaretle iletilir.

Sözlük kaynağı/lisansı: `server/dictionary/README.md`.
