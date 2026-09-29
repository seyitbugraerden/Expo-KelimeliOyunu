import { Pressable, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type Props = { letter: string; points: number; selected: boolean; disabled: boolean; used: boolean; onSelect: () => void; onDrop: (x: number, y: number) => void };
export function RackTile({ letter, points, selected, disabled, used, onSelect, onDrop }: Props) {
  const joker = letter === '*';
  const x = useSharedValue(0), y = useSharedValue(0), dragging = useSharedValue(false);
  const pan = Gesture.Pan().enabled(!disabled).minDistance(3).maxPointers(1)
    .onStart(() => { dragging.value = true; })
    .onUpdate(e => { x.value = e.translationX; y.value = e.translationY; })
    .onEnd((e, success) => { if (success) runOnJS(onDrop)(e.absoluteX, e.absoluteY); })
    .onFinalize(() => { dragging.value = false; x.value = withTiming(0, { duration: 120 }); y.value = withTiming(0, { duration: 120 }); });
  const animated = useAnimatedStyle(() => ({ zIndex: dragging.value ? 100 : 0, elevation: dragging.value ? 12 : 0, transform: [{ translateX: x.value }, { translateY: y.value }, { scale: dragging.value ? 1.15 : 1 }] }));
  return <GestureDetector gesture={pan}><Animated.View style={[styles.slot, animated]}><Pressable accessibilityRole="button" accessibilityLabel={joker ? 'Joker, 0 puan' : `${letter}, ${points} puan`} accessibilityHint={joker ? 'Tahtaya yerleştirmek için yerine geçeceği harfi seçin veya basılı tutup tahtaya sürükleyin.' : 'Seçip tahtaya dokunun veya basılı tutup tahtaya sürükleyin.'} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onSelect} style={[styles.tile, joker && styles.joker, selected && styles.selected, used && { opacity: 0.2 }]}><Text style={styles.letter}>{joker ? '✦' : letter}</Text><Text style={styles.points}>{points}</Text></Pressable></Animated.View></GestureDetector>;
}
const styles = StyleSheet.create({
  slot: { flex: 1, maxWidth: 62, minWidth: 0 }, tile: { height: 54, backgroundColor: '#EDDBAF', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#CEB67F' }, joker: { backgroundColor: '#E5EBDD', borderColor: '#9CAD93' }, selected: { borderColor: '#214A41' }, letter: { color: '#38483B', fontSize: 24, fontWeight: '800' }, points: { position: 'absolute', bottom: 2, right: 4, fontSize: 10, color: '#38483B' },
});
