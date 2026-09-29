# Mobil uygulama başlangıcı

Expo, React Native ve TypeScript ile iOS ve Android uygulama altyapısı.
Henüz oyun veya ürün özellikleri içermez.

## Çalıştırma

```sh
npm install
npm start
```

Terminaldeki QR kodunu projenin Expo SDK sürümünü destekleyen Expo Go ile açın.
iOS simülatörü için macOS ve Xcode, Android emülatörü için Android Studio gerekir.

```sh
npm run ios
npm run android
npm run typecheck
```

Başlangıç ekranı `App.tsx`, uygulama ayarları `app.json` içindedir.
Web hedefi için önce `npx expo install react-dom react-native-web @expo/metro-runtime` çalıştırın.
