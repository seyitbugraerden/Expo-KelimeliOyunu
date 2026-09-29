import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.badge}><Text style={styles.badgeText}>EXPO + REACT NATIVE</Text></View>
      <Text style={styles.title}>Merhaba! 👋</Text>
      <Text style={styles.description}>Yeni mobil uygulamanın ilk adımı hazır.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bir fikir, iki platform.</Text>
        <Text style={styles.cardText}>iOS ve Android için ortak TypeScript altyapısı ile başlayalım.</Text>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101D27',
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { backgroundColor: '#233C42', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginBottom: 24 },
  badgeText: { color: '#9EE4CD', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { color: '#F5F7F2', fontSize: 40, fontWeight: '800', textAlign: 'center' },
  description: { color: '#B4C4CA', fontSize: 17, lineHeight: 26, textAlign: 'center', marginTop: 14, maxWidth: 320 },
  card: { backgroundColor: '#1B2D38', padding: 24, borderRadius: 24, marginTop: 36, width: '100%', maxWidth: 400 },
  cardTitle: { color: '#F5F7F2', fontSize: 20, fontWeight: '600', marginBottom: 10 },
  cardText: { color: '#B4C4CA', fontSize: 16, lineHeight: 25 },
});
