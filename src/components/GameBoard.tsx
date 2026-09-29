import { forwardRef, useImperativeHandle, useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { clamp, cellAtPoint } from './boardGeometry';
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export type BoardHandle = { drop: (x: number, y: number, rackIndex: number) => void };
export type ScoredWord = { word: string; cells: number[]; points: number; blankCells?: number[] };
type Props = {
  scoredWords?: ScoredWord[];
  previewWords?: ScoredWord[];
  premiumSquares?: (string | null)[];
  onCommit?: () => void;
  fitHeight?: boolean;
  onDrop: (index: number, rackIndex: number) => void;
  board: (string | null)[];
  blankTiles?: boolean[];
  placements: { index: number; letter: string; blank?: boolean }[];
  onPlace: (index: number) => void;
  enabled: boolean;
  scrollRef: RefObject<ScrollView | null>;
};
export const GameBoard = forwardRef<BoardHandle, Props>(function GameBoard(props, ref) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const size = props.fitHeight ? Math.min(layout.width, Math.max(180, layout.height - 78)) : layout.width;
  return <View onLayout={event => setLayout({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })} style={[{ width: '100%' }, props.fitHeight && { flex: 1, minHeight: 0 }]}>
    {size > 0 && <ZoomBoard ref={ref} key={size} {...props} size={size} />}
  </View>;
});
const ZoomBoard = forwardRef<BoardHandle, Props & { size: number }>(function ZoomBoard({ board, blankTiles = [], placements, onPlace, onDrop, enabled, scrollRef, size, scoredWords = [], previewWords = [], premiumSquares = [], onCommit }, ref) {
  const viewportRef = useRef<View>(null);
  const scale = useSharedValue(1), x = useSharedValue(0), y = useSharedValue(0);
  const startScale = useSharedValue(1), anchorX = useSharedValue(0), anchorY = useSharedValue(0), pinching = useSharedValue(false);
  useImperativeHandle(ref, () => ({ drop: (absoluteX, absoluteY, rackIndex) => {
    if (!enabled) return;
    viewportRef.current?.measureInWindow((left, top, width, height) => {
      const px = absoluteX - left, py = absoluteY - top;
      if (px < 0 || py < 0 || px >= width || py >= height) return;
      const index = cellAtPoint(px, py, size, scale.value, x.value, y.value);
      if (index >= 0) onDrop(index, rackIndex);
    });
  } }));
  const [zoom, setZoom] = useState(1);
  const cellSize = size / 15;
  function reset() { scale.value = withTiming(1); x.value = withTiming(0); y.value = withTiming(0); setZoom(1); }
  function stepZoom(change: number) {
    const next = clamp(scale.value + change, 1, 3);
    const limit = size * (next - 1) / 2;
    x.value = withTiming(clamp(x.value * next / scale.value, -limit, limit));
    y.value = withTiming(clamp(y.value * next / scale.value, -limit, limit));
    scale.value = withTiming(next); setZoom(next);
  }
  const pinch = Gesture.Pinch().blocksExternalGesture(scrollRef)
    .onStart(e => {
      cancelAnimation(scale); cancelAnimation(x); cancelAnimation(y);
      pinching.value = true; startScale.value = scale.value;
      anchorX.value = (e.focalX - size / 2 - x.value) / scale.value;
      anchorY.value = (e.focalY - size / 2 - y.value) / scale.value;
    })
    .onUpdate(e => {
      const next = clamp(startScale.value * e.scale, 1, 3), limit = size * (next - 1) / 2;
      scale.value = next;
      x.value = clamp(e.focalX - size / 2 - anchorX.value * next, -limit, limit);
      y.value = clamp(e.focalY - size / 2 - anchorY.value * next, -limit, limit);
    }).onFinalize(() => { pinching.value = false; runOnJS(setZoom)(scale.value); });
  const pan = Gesture.Pan().minDistance(8).maxPointers(1).blocksExternalGesture(scrollRef)
    .onChange(e => {
      if (pinching.value) return;
      const limit = size * (scale.value - 1) / 2;
      x.value = clamp(x.value + e.changeX, -limit, limit);
      y.value = clamp(y.value + e.changeY, -limit, limit);
    });
  // Resolve taps in viewport coordinates, so zooming never changes the target cell.
  const tap = Gesture.Tap().maxDistance(8).maxDuration(250).onEnd((e, success) => {
    if (!success || !enabled) return;
    const index = cellAtPoint(e.x, e.y, size, scale.value, x.value, y.value);
    if (index >= 0) runOnJS(onPlace)(index);
  });
  const transform = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }] }));
  return <View style={styles.panel}>
    <View style={styles.toolbar}><Text style={styles.label}>OYUN TAHTASI <Text style={styles.muted}>15 × 15</Text></Text><Text style={styles.muted}>{Math.round(zoom * 100)}%</Text></View>
    <GestureDetector gesture={Gesture.Simultaneous(pinch, Gesture.Race(pan, tap))}>
      <View ref={viewportRef} collapsable={false} style={[styles.viewport, { width: size, height: size }]}>
        <Animated.View style={[styles.grid, { width: size, height: size }, transform]}>
          {board.map((value, index) => {
            const draft = placements.find(p => p.index === index), letter = draft?.letter || value;
            const isBlank = draft?.blank ?? blankTiles[index] ?? false;
            const valuePoints = isBlank ? 0 : 'AEIİKLMNRT'.includes(letter || '') ? 1 : 'ÇĞJÖŞÜZ'.includes(letter || '') ? 4 : 2;
            const premium = premiumSquares[index];
            const premiumLabel = premium === '3W' ? '3K' : premium === '2W' ? '2K' : premium === '3L' ? '3H' : premium === '2L' ? '2H' : '';
            const premiumCell = premium === '3W' ? styles.tripleWordCell : premium === '2W' ? styles.doubleWordCell : premium === '3L' ? styles.tripleLetterCell : premium === '2L' ? styles.doubleLetterCell : null;
            const premiumText = premium === '3W' ? styles.tripleWordText : premium === '2W' ? styles.doubleWordText : premium === '3L' ? styles.tripleLetterText : premium === '2L' ? styles.doubleLetterText : null;
            return <View key={index} accessible accessibilityRole="button" accessibilityLabel={`${Math.floor(index / 15) + 1}. satır, ${index % 15 + 1}. sütun, ${letter ? `${letter}, ${isBlank ? 'joker, 0 puan' : `${valuePoints} puan`}` : premiumLabel ? `${premiumLabel}, bonus karesi` : 'boş'}`} accessibilityState={{ disabled: !enabled }} accessibilityActions={[{ name: 'activate', label: 'Harfi yerleştir veya geri al' }]} onAccessibilityAction={() => { if (enabled) onPlace(index); }} style={[styles.cell, { width: cellSize, height: cellSize, left: (index % 15) * cellSize, top: Math.floor(index / 15) * cellSize }, Math.floor(index / 15) % 2 === 0 && styles.alternate, index === 112 && styles.center, !letter && premiumCell, !!letter && styles.tile, !!draft && styles.draft]}>
              <Text allowFontScaling={false} style={[styles.letter, { fontSize: cellSize * 0.58 }, letter === 'I' && styles.dotlessI]}>{letter || (premiumLabel ? '' : index === 112 ? '✦' : '')}</Text>
              {!letter && !!premiumLabel && <Text allowFontScaling={false} style={[styles.premiumLabel, { fontSize: Math.max(6, cellSize * 0.3) }, premiumText]}>{premiumLabel}</Text>}
              {!!letter && <Text allowFontScaling={false} style={[styles.tilePoints, { fontSize: Math.max(8, cellSize * 0.28) }, isBlank && styles.blankPoints]}>{isBlank ? '+0' : valuePoints}</Text>}
            </View>;
          })}
          {(previewWords.length ? previewWords : scoredWords).map((word, i) => {
            const rows = word.cells.map(index => Math.floor(index / 15)), cols = word.cells.map(index => index % 15);
            const top = Math.min(...rows) * cellSize, left = Math.min(...cols) * cellSize;
            const width = (Math.max(...cols) - Math.min(...cols) + 1) * cellSize, height = (Math.max(...rows) - Math.min(...rows) + 1) * cellSize;
            const badgeSize = Math.max(28, cellSize * 1.45);
            const badgeLeft = Math.max(0, Math.min(size - badgeSize, left + width - badgeSize / 2));
            const badgeTop = Math.max(0, Math.min(size - badgeSize, top - badgeSize / 2));
            const preview = previewWords.length > 0;
            return <View key={`${word.word}-${i}`} pointerEvents="box-none" style={[styles.wordOverlay, { width: size, height: size }]}>
              <View pointerEvents="none" style={[styles.wordOutline, { top, left, width, height, borderColor: preview ? '#228B57' : '#D67524' }]}>
                {!preview && <Text allowFontScaling={false} style={{ position: 'absolute', top: -2, right: -2, backgroundColor: '#D67524', color: '#FFFFFF', borderRadius: 3, paddingHorizontal: 2, fontSize: Math.max(7, cellSize * 0.27), fontWeight: '800' }}>+{word.points}</Text>}
              </View>
              {preview && <Pressable accessibilityRole="button" accessibilityLabel={`${word.word}, ${word.points} puan. Hamleyi oyna`} disabled={!enabled || !onCommit} onPress={onCommit} style={({ pressed }) => [styles.wordCommit, { top: badgeTop, left: badgeLeft, width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }, pressed && styles.wordCommitPressed]}><Text allowFontScaling={false} style={{ color: '#FFFFFF', fontSize: Math.max(10, cellSize * 0.4), fontWeight: '900' }}>+{word.points}</Text></Pressable>}
            </View>;
          })}
        </Animated.View>
      </View>
    </GestureDetector>
    <View style={styles.controls}>
      <Text style={styles.hint}>İki parmakla büyüt.{ '\n' }2H/3H harf · 2K/3K kelime</Text>
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tahtayı uzaklaştır" onPress={() => stepZoom(-0.5)} style={styles.control}><Text style={styles.controlText}>−</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tahtayı ekrana sığdır" onPress={reset} style={styles.control}><Text style={styles.fit}>Sığdır</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tahtayı yakınlaştır" onPress={() => stepZoom(0.5)} style={styles.control}><Text style={styles.controlText}>+</Text></Pressable>
      </View>
    </View>
  </View>;
});
const styles = StyleSheet.create({
  panel: { gap: 6 }, toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 }, label: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#294D43' }, muted: { fontSize: 11, color: '#74857B', letterSpacing: 0 },
  viewport: { overflow: 'hidden', borderRadius: 10, backgroundColor: '#3F7157' }, grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#3F7157' }, cell: { position: 'absolute', borderWidth: 0.75, borderColor: '#9DB79D', backgroundColor: '#EDF0E2', alignItems: 'center', justifyContent: 'center' }, alternate: { backgroundColor: '#E1E9D9' }, center: { backgroundColor: '#F2C6C1' }, doubleLetterCell: { backgroundColor: '#B9DCE8', borderColor: '#609DB0', borderWidth: 1.4 }, tripleLetterCell: { backgroundColor: '#478EAA', borderColor: '#28657D', borderWidth: 1.5 }, doubleWordCell: { backgroundColor: '#F0C0BC', borderColor: '#C66C70', borderWidth: 1.4 }, tripleWordCell: { backgroundColor: '#B64F57', borderColor: '#82343C', borderWidth: 1.5 }, tile: { backgroundColor: '#F1DFB5', borderColor: '#D0B885' }, draft: { backgroundColor: '#F1DFB5', borderColor: '#A5B891' }, letter: { fontWeight: '800', color: '#2A4438' }, dotlessI: { fontFamily: 'serif' }, premiumLabel: { fontWeight: '900' }, doubleLetterText: { color: '#164C60' }, tripleLetterText: { color: '#FFFFFF' }, doubleWordText: { color: '#842E35' }, tripleWordText: { color: '#FFFFFF' }, tilePoints: { position: 'absolute', bottom: 0, right: 1, minWidth: 8, textAlign: 'center', color: '#38483B', fontWeight: '700' }, blankPoints: { borderWidth: 0.8, borderColor: '#D67524', borderRadius: 7, paddingHorizontal: 1, backgroundColor: '#F8EBCF', color: '#8B4B1C', fontWeight: '900' }, wordOverlay: { position: 'absolute', top: 0, left: 0, zIndex: 10 }, wordOutline: { position: 'absolute', borderWidth: 2, borderRadius: 4 }, wordCommit: { position: 'absolute', zIndex: 20, elevation: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#228B57', borderWidth: 2, borderColor: '#FFFFFF' }, wordCommitPressed: { backgroundColor: '#176B40', transform: [{ scale: 0.94 }] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, hint: { flex: 1, fontSize: 11, lineHeight: 16, color: '#708276' }, buttons: { flexDirection: 'row', gap: 4 }, control: { minWidth: 44, minHeight: 44, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6ECE2', borderRadius: 12 }, controlText: { fontSize: 24, color: '#214A41' }, fit: { fontSize: 12, fontWeight: '700', color: '#214A41' },
});
