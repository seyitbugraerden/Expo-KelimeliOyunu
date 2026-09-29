# Türkçe oyun sözlüğü

Kaynak: https://github.com/ahmetaa/zemberek-nlp
Dosya: morphology/src/main/resources/tr/master-dictionary.dict
İndirme: 2026-09-29, master dalı. Kaynak dosya değiştirilmeden saklanmıştır.
Lisans: Apache-2.0; LICENSE ve NOTICE bu klasördedir.

`../dictionary.mjs` bu yerel dosyanın baş sözcüklerini okur. Dosya bilgisayar
rakibinin aday listesini ve çevrimdışı testleri destekler; oyuncu hamlelerinin
doğruluk kaynağı değildir.

İnsan ve bilgisayar hamlelerinde ana ve çapraz kelimeler `../tdk.mjs` üzerinden
TDK Güncel Türkçe Sözlük API'sinde tam baş sözcük olarak aranır. Yalnızca
tanımlı, özel ad olmayan maddeler kabul edilir; çekim eki üretilmez. Sonuçlar
yalnızca sunucu belleğinde önbelleğe alınır. TDK'ya erişilemiyorsa hamle
reddedilir; bilgisayar rakibi pas geçer. Bu denetim turnuva Scrabble sözlüğü
veya tam oyun kuralları iddiası taşımaz.
