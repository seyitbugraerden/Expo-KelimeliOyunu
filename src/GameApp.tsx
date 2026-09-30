import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { RackTile } from './components/RackTile';
import { GameBoard, type BoardHandle, type ScoredWord } from './components/GameBoard';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { letterPoints } from './utils/letterPoints';
type Player = { id: string; name: string };
type MoveDetail = { playerId: string; revision: number; points: number; words: ScoredWord[]; bonus: number };
type Game = { recentMoves?: MoveDetail[]; id: string; players: Player[]; status: string; board: (string | null)[]; blankTiles?: boolean[]; premiumSquares?: (string | null)[]; rack: string[]; scores: Record<string, number>; turn: string; revision: number; remaining: number; lastMove: string };
type Snapshot = { user: Player; games: Game[] };
type Placement = { index: number; letter: string; rackIndex: number; blank?: boolean };
type BlankTarget = { rackIndex: number; index: number | null };
const SERVER = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const SESSION_KEY = 'kelime-session';
const letters = [...'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'];
function Button({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, (disabled || pressed) && { opacity: 0.45 }]}><Text style={[s.buttonText, secondary && { color: '#214A41' }]}>{title}</Text></Pressable>;
}
export default function App() { return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><GameApp /></SafeAreaProvider></GestureHandlerRootView>; }
function GameApp() {
  const boardRef = useRef<BoardHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [token, setToken] = useState<string | null>(null), [ready, setReady] = useState(false);
  const [data, setData] = useState<Snapshot | null>(null), [name, setName] = useState(''), [friend, setFriend] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedTile, setSelectedTile] = useState<number | null>(null), [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedBlankLetter, setSelectedBlankLetter] = useState<string | null>(null), [blankTarget, setBlankTarget] = useState<BlankTarget | null>(null);
  const [previewResult, setPreviewResult] = useState<{ key: string; preview?: MoveDetail; error?: string } | null>(null);
  const [exchangeMode, setExchangeMode] = useState(false), [exchangeTiles, setExchangeTiles] = useState<number[]>([]);
  const working = useRef(false), requestVersion = useRef(0);
  const game = data?.games.find(g => g.id === selectedGame);
  const draftKey = `${selectedGame}:${game?.revision}`;
  const [previousDraftKey, setPreviousDraftKey] = useState(draftKey);
  if (previousDraftKey !== draftKey) {
    setPreviousDraftKey(draftKey);
    setPlacements([]);
    setSelectedTile(null);
    setSelectedBlankLetter(null);
    setBlankTarget(null);
    setExchangeMode(false);
    setExchangeTiles([]);
  }
  useEffect(() => { SecureStore.getItemAsync(SESSION_KEY).then(value => { if (value) { const saved = JSON.parse(value); if (saved.server === SERVER) setToken(saved.token); } }).catch(() => setError('Kayıtlı oturum okunamadı.')).finally(() => setReady(true)); }, []);
  async function request(path: string, body?: object, auth = token) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${SERVER}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
      const result = await response.json();
      if (!response.ok) { if (response.status === 401) { await SecureStore.deleteItemAsync(SESSION_KEY); setToken(null); setData(null); } throw Error(result.error); }
      return result;
    } catch (e) { if (e instanceof Error && (e.name === 'AbortError' || e.message.includes('Network'))) throw Error('Sunucuya bağlanılamadı. Sunucunun açık ve adresinin doğru olduğunu kontrol et.'); throw e; }
    finally { clearTimeout(timeout); }
  }
  useEffect(() => {
    if (!token) return;
    let disposed = false;
    async function refresh() {
      if (working.current) return;
      const version = ++requestVersion.current;
      try { const next = await request('/state', undefined, token); if (!disposed && version === requestVersion.current) { setData(next); setError(''); } }
      catch (e) { if (!disposed && version === requestVersion.current) setError((e as Error).message); }
    }
    void refresh(); const timer = setInterval(refresh, 2500);
    return () => { disposed = true; clearInterval(timer); };
    // The request helper reads only the explicit auth argument for polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  async function act(path: string, body: object) {
    if (working.current) return;
    working.current = true; ++requestVersion.current; setBusy(true); setError('');
    try {
      const next = await request(path, body);
      if (next.token) { await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ server: SERVER, token: next.token })); setToken(next.token); }
      setData(next); if (path === '/computer') setSelectedGame(next.gameId);
      if (path === '/invite') setFriend('');
      if (path === '/move') { setPlacements([]); setSelectedTile(null); setSelectedBlankLetter(null); setBlankTarget(null); }
      if (path === '/exchange') { setExchangeMode(false); setExchangeTiles([]); setSelectedTile(null); }
      if (path === '/surrender') { setPlacements([]); setSelectedTile(null); setSelectedBlankLetter(null); setBlankTarget(null); setExchangeMode(false); setExchangeTiles([]); }
    } catch (e) { setError((e as Error).message); }
    finally { working.current = false; setBusy(false); }
  }
  const myTurn = game?.status === 'active' && game.turn === data?.user.id;
  const previewGameId = game?.id, previewRevision = game?.revision;
  const previewKey = `${previewGameId}:${previewRevision}:${JSON.stringify(placements.map(({ index, letter, blank }) => ({ index, letter, blank })))}`;
  const movePreview = previewResult?.key === previewKey ? previewResult.preview : null;
  const previewError = previewResult?.key === previewKey ? previewResult.error || '' : '';
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    if (!previewGameId || previewRevision === undefined || !myTurn || busy || !placements.length || !token) return () => { cancelled = true; controller.abort(); };
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${SERVER}/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ gameId: previewGameId, revision: previewRevision, placements: placements.map(({ index, letter, blank }) => ({ index, letter, ...(blank ? { blank: true } : {}) })) }), signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw Error(result.error);
        if (!cancelled) setPreviewResult({ key: previewKey, preview: result.preview });
      } catch (e) {
        if (!cancelled && !(e instanceof Error && e.name === 'AbortError')) setPreviewResult({ key: previewKey, error: (e as Error).message });
      }
    }, 160);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [previewGameId, previewRevision, previewKey, myTurn, busy, placements, token]);
  function place(index: number) {
    if (!myTurn || busy || !game) return;
    if (placements.some(p => p.index === index)) { setPlacements(placements.filter(p => p.index !== index)); return; }
    if (selectedTile === null || game.board[index]) return;
    const blank = game.rack[selectedTile] === '*';
    if (blank && !selectedBlankLetter) return;
    setPlacements([...placements, { index, letter: blank ? selectedBlankLetter! : game.rack[selectedTile], rackIndex: selectedTile, blank }]);
    setSelectedTile(null); setSelectedBlankLetter(null);
  }
  function dropTile(index: number, rackIndex: number) {
    if (!myTurn || busy || !game || game.board[index] || !game.rack[rackIndex]) return;
    if (placements.some(p => p.index === index || p.rackIndex === rackIndex)) return;
    if (game.rack[rackIndex] === '*') {
      setSelectedTile(null); setSelectedBlankLetter(null); setBlankTarget({ rackIndex, index });
      return;
    }
    setPlacements(current => {
      if (current.some(p => p.index === index || p.rackIndex === rackIndex)) return current;
      return [...current, { index, letter: game.rack[rackIndex], rackIndex, blank: false }];
    });
    setSelectedTile(null);
  }
  function chooseBlankLetter(letter: string) {
    if (!blankTarget || !game) return;
    if (blankTarget.index === null) {
      setSelectedTile(blankTarget.rackIndex); setSelectedBlankLetter(letter);
    } else {
      setPlacements(current => [...current, { index: blankTarget.index!, letter, rackIndex: blankTarget.rackIndex, blank: true }]);
      setSelectedTile(null); setSelectedBlankLetter(null);
    }
    setBlankTarget(null);
  }
  function selectRackTile(index: number) {
    if (!game) return;
    if (game.rack[index] === '*') {
      setSelectedTile(index); setSelectedBlankLetter(null); setBlankTarget({ rackIndex: index, index: null });
      return;
    }
    setSelectedTile(selectedTile === index ? null : index); setSelectedBlankLetter(null);
  }
  function handleSurrender() {
    if (!game || busy || game.status !== 'active') return;
    Alert.alert(
      'Pes Et',
      'Bu oyundan pes etmek istediğine emin misin? Oyun sonlanacak.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Pes Et', style: 'destructive', onPress: () => void act('/surrender', { gameId: game.id }) }
      ]
    );
  }
  function submitMove() {
    if (!game || !movePreview?.words.length) return;
    void act('/move', { gameId: game.id, revision: game.revision, placements: placements.map(({ index, letter, blank }) => ({ index, letter, ...(blank ? { blank: true } : {}) })) });
  }
  if (game && data) return <SafeAreaView style={s.safe}><StatusBar style="dark" /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.gameScreen}>
      <View style={s.gameTop}><Pressable accessibilityRole="button" onPress={() => setSelectedGame(null)} style={s.backButton}><Text style={s.backText}>‹ Oyunlar</Text></Pressable><Text style={s.gameBrand}>kelime<Text style={{ color: '#D8864C' }}>.</Text></Text>{game.status === 'active' ? <Pressable accessibilityRole="button" accessibilityLabel="Oyundan pes et" disabled={busy} onPress={handleSurrender} style={s.surrenderButton}><Text style={s.surrenderText}>Pes et</Text></Pressable> : <Text style={s.tag}>15 × 15</Text>}</View>
      <View style={s.scoreRow}>{game.players.map(p => <View key={p.id} style={[s.score, s.gameScore, game.turn === p.id && game.status === 'active' && s.current]}><Text numberOfLines={1} style={s.gamePlayerName}>{p.name}{p.id === data.user.id ? ' (sen)' : ''}</Text><Text style={s.scoreNumber}>{game.scores[p.id]}</Text></View>)}</View>
      <Text style={s.gameHeading}>{game.status === 'finished' ? 'Oyun tamamlandı' : myTurn ? 'Sıra sende' : game.players.some(p => p.id === 'COMPUTER') ? 'Bilgisayarın sırası' : 'Arkadaşının sırası'}</Text>
      <View style={s.playArea}><GameBoard fitHeight scoredWords={game.recentMoves?.at(-1)?.words} previewWords={movePreview?.words} premiumSquares={game.premiumSquares} onCommit={submitMove} ref={boardRef} onDrop={dropTile} key={game.id} board={game.board} blankTiles={game.blankTiles} placements={placements} onPlace={place} enabled={!!myTurn && !busy} scrollRef={scrollRef} /></View>
      {!!previewError && <Text accessibilityRole="alert" style={s.previewError}>{previewError}</Text>}
      <View style={s.rackHeader}><Text style={s.eyebrow}>HARFLERİN</Text><Text style={s.caption}>{exchangeMode ? (exchangeTiles.length ? `${exchangeTiles.length} harf seçildi — değiştir veya vazgeç` : 'Değiştirmek istediğin harflere dokun') : placements.length ? `${placements.length} harf · ${movePreview ? `${movePreview.points} puan` : previewError ? 'Geçerli kelime yok' : 'TDK doğrulaması…'}` : 'Sürükle veya seçip kareye dokun'}</Text></View>
      <View style={s.rack}>{game.rack.map((letter, i) => <RackTile key={i} letter={letter} points={letterPoints(letter)} selected={exchangeMode ? exchangeTiles.includes(i) : selectedTile === i} disabled={(!myTurn || busy) && !exchangeMode} used={!exchangeMode && placements.some(p => p.rackIndex === i)} onSelect={() => { if (exchangeMode) { setExchangeTiles(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]); } else { selectRackTile(i); } }} onDrop={(x, y) => { if (!exchangeMode) boardRef.current?.drop(x, y, i); }} />)}</View>
      <View style={s.gameActions}>
        {exchangeMode
          ? <><Button title={busy ? 'Değiştiriliyor…' : `Değiştir${exchangeTiles.length ? ` (${exchangeTiles.length})` : ''}`} disabled={busy || !exchangeTiles.length} onPress={() => void act('/exchange', { gameId: game.id, revision: game.revision, indexes: exchangeTiles })} /><Button title="Vazgeç" secondary disabled={busy} onPress={() => { setExchangeMode(false); setExchangeTiles([]); }} /></>
          : <><Button title={busy ? 'Gönderiliyor…' : `Hamleyi oyna${movePreview?.points ? ` · +${movePreview.points}` : ''}`} disabled={!myTurn || busy || !movePreview?.words.length} onPress={submitMove} /><Button title="Geri al" secondary disabled={busy || !placements.length} onPress={() => { setPlacements([]); setSelectedTile(null); setSelectedBlankLetter(null); }} /><Button title="Pas" secondary disabled={!myTurn || busy || !!placements.length} onPress={() => void act('/move', { gameId: game.id, revision: game.revision, placements: [] })} /><Button title="Değiştir" secondary disabled={!myTurn || busy || !!placements.length || game.remaining < 7} onPress={() => { setExchangeMode(true); setPlacements([]); setSelectedTile(null); }} /></>}
      </View>
      <Text style={s.gameFooter}>Torbada {game.remaining} harf · Joker 0 puan · 6 pas oyunu bitirir</Text>
    </View>
  </KeyboardAvoidingView><Modal transparent visible={!!blankTarget} animationType="fade" onRequestClose={() => setBlankTarget(null)}><View style={s.modalBackdrop}><View style={s.letterPicker}><Text style={s.heading}>Joker hangi harf olsun?</Text><View style={s.letterChoices}>{letters.map(letter => <Pressable key={letter} accessibilityRole="button" accessibilityLabel={`${letter} harfini seç`} onPress={() => chooseBlankLetter(letter)} style={s.letterChoice}><Text style={s.letterChoiceText}>{letter}</Text></Pressable>)}</View><Pressable accessibilityRole="button" onPress={() => setBlankTarget(null)} style={s.cancelPicker}><Text style={s.caption}>Vazgeç</Text></Pressable></View></View></Modal></SafeAreaView>;
  return <SafeAreaView style={s.safe}><StatusBar style="dark" /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView ref={scrollRef} contentContainerStyle={[s.page, !!game && s.gamePage]} keyboardShouldPersistTaps="handled">
    <View style={s.top}><Text style={s.brand}>kelime<Text style={{ color: '#D8864C' }}>.</Text></Text><Text style={s.tag}>KELİMELERLE OYNA</Text></View>
    {!!error && <View style={s.error}><Text accessibilityRole="alert" style={{ color: '#8F302B' }}>{error}</Text></View>}
    {!ready ? <ActivityIndicator color="#214A41" /> : !token ? <>
      <Text style={s.eyebrow}>HER HARF BİR BAŞLANGIÇ</Text><Text style={s.hero}>Kelimeler buluşsun.</Text><Text style={s.body}>Bilgisayara karşı hemen oyna veya arkadaşını ID’siyle davet et.</Text>
      <View style={s.preview}>{['K', 'E', 'L', 'İ', 'M', 'E'].map((l, i) => <View key={i} style={s.demoTile}><Text style={s.tileText}>{l}</Text></View>)}</View>
      <View style={s.card}><Text style={s.heading}>Oyuncu profilini oluştur</Text><Text style={s.body}>Sana özel bir kullanıcı ID’si vereceğiz.</Text><TextInput accessibilityLabel="Oyuncu adı" style={s.input} value={name} onChangeText={setName} placeholder="Oyuncu adın" maxLength={20} placeholderTextColor="#7C8982" /><Button title={busy ? 'Hazırlanıyor…' : 'Oyuna katıl →'} disabled={busy || name.trim().length < 2} onPress={() => void act('/users', { name })} /></View>
    </> : !data ? <View style={s.card}><ActivityIndicator color="#214A41" /><Text style={s.body}>Oyunların yükleniyor…</Text></View> : <>
      {!game && <View style={s.identity}><View><Text style={s.eyebrow}>MERHABA, {data.user.name.toLocaleUpperCase('tr-TR')}</Text><Text selectable style={s.id}>ID: {data.user.id}</Text></View><Pressable accessibilityRole="button" onPress={() => void Share.share({ message: `Kelime oyununda beni davet et! Kullanıcı ID’m: ${data.user.id}` }).catch(() => setError('Paylaşım açılamadı.'))}><Text style={s.link}>Paylaş ↗</Text></Pressable></View>}
      {game ? <>
        <Button title="← Tüm oyunlar" secondary onPress={() => setSelectedGame(null)} />
        <View style={s.scoreRow}>{game.players.map(p => <View key={p.id} style={[s.score, game.turn === p.id && game.status === 'active' && s.current]}><Text style={s.body}>{p.name}{p.id === data.user.id ? ' (sen)' : ''}</Text><Text style={s.scoreNumber}>{game.scores[p.id]}</Text></View>)}</View>
        <Text style={s.heading}>{game.status === 'finished' ? 'Oyun tamamlandı' : myTurn ? 'Sıra sende. Bir kelime bırak.' : game?.players.some(p => p.id === 'COMPUTER') ? 'Bilgisayarın sırası' : 'Arkadaşının sırası'}</Text>
        <View style={s.moveNote}><Text style={s.caption}>{game.lastMove}</Text>{game.recentMoves?.filter(move => move.words.length > 0).map(move => <Text key={move.revision} style={s.caption}>{game.players.find(p => p.id === move.playerId)?.name}: {move.words.map(word => `${word.word} +${word.points}`).join(' · ')}{move.bonus ? ` · Bonus +${move.bonus}` : ''} → +{move.points} puan</Text>)}</View>
        <GameBoard scoredWords={game.recentMoves?.at(-1)?.words} ref={boardRef} onDrop={dropTile} key={game.id} board={game.board} blankTiles={game.blankTiles} placements={placements} onPlace={place} enabled={!!myTurn && !busy} scrollRef={scrollRef} />
        <View style={s.rackHeader}><Text style={s.eyebrow}>HARFLERİN</Text><Text style={s.caption}>{placements.length ? `${placements.length} harf yerleştirildi` : 'Bir harf seç, kareye dokun'}</Text></View>
        <View style={s.rack}>{game.rack.map((letter, i) => <RackTile key={i} letter={letter} points={letterPoints(letter)} selected={selectedTile === i} disabled={!myTurn || busy || placements.some(p => p.rackIndex === i)} used={placements.some(p => p.rackIndex === i)} onSelect={() => selectRackTile(i)} onDrop={(x, y) => boardRef.current?.drop(x, y, i)} />)}</View>
        <Text style={s.caption}>Harfi sürükle veya seçip kareye dokun. Joker için yerine geçeceği harfi seç.</Text>
        <Button title={busy ? 'Gönderiliyor…' : 'Hamleyi oyna'} disabled={!myTurn || busy || !placements.length} onPress={() => void act('/move', { gameId: game.id, revision: game.revision, placements: placements.map(({ index, letter, blank }) => ({ index, letter, ...(blank ? { blank: true } : {}) })) })} />
        <View style={s.actions}><Button title="Geri al" secondary disabled={busy || !placements.length} onPress={() => { setPlacements([]); setSelectedTile(null); setSelectedBlankLetter(null); }} /><Button title="Pas geç" secondary disabled={!myTurn || busy || !!placements.length} onPress={() => void act('/move', { gameId: game.id, revision: game.revision, placements: [] })} /></View><Text style={s.caption}>Torbada {game.remaining} harf · Arka arkaya 6 pas oyunu bitirir.</Text>
      </> : <>
        <Text style={s.hero}>İster tek başına,<Text style={{ color: '#D8864C' }}> ister arkadaşınla.</Text></Text>
        <View style={s.card}><Text style={s.heading}>Bilgisayarla oyna</Text><Text style={s.body}>Arkadaş beklemeden pratik yap. Bilgisayar Türkçe kelimeler bulur; hamle bulamazsa pas geçer.</Text><Button title={busy ? 'Hazırlanıyor…' : data.games.some(g => g.status === 'active' && g.players.some(p => p.id === 'COMPUTER')) ? 'Bilgisayarla oyuna devam et →' : 'Bilgisayarla oyna →'} disabled={busy} onPress={() => void act('/computer', {})} /></View>
        <View style={s.card}><Text style={s.heading}>Arkadaşını davet et</Text><Text style={s.body}>Arkadaşın da profil oluştursun, ID’sini buraya yaz.</Text><TextInput accessibilityLabel="Arkadaş kullanıcı ID’si" style={s.input} value={friend} onChangeText={v => setFriend(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={8} placeholder="Örn. A7B2C9D1" placeholderTextColor="#7C8982" /><Button title="Oyun daveti gönder →" disabled={busy || friend.length !== 8} onPress={() => void act('/invite', { userId: friend.trim() })} /></View>
        <Text style={s.heading}>Oyunların</Text>
        {!data.games.length && <Text style={s.body}>Bilgisayarla bir oyun başlat veya arkadaşını davet et.</Text>}
        {[...data.games].reverse().filter(g => g.status !== 'declined').map(g => <View key={g.id} style={s.card}><Text style={s.heading}>{g.players.find(p => p.id !== data.user.id)?.name}</Text><Text style={s.body}>{g.status === 'pending' ? g.players[0].id === data.user.id ? 'Davetin kabul edilmesi bekleniyor' : 'Seni bir oyuna davet etti' : g.status === 'finished' ? 'Oyun bitti' : g.turn === data.user.id ? 'Sıra sende' : 'Arkadaşının sırası'}</Text>{g.status === 'pending' ? g.players[1].id === data.user.id && <View style={s.actions}><Button title="Kabul et" disabled={busy} onPress={() => void act('/accept', { gameId: g.id })} /><Button title="Reddet" secondary disabled={busy} onPress={() => void act('/decline', { gameId: g.id })} /></View> : <Button title={g.status === 'finished' ? 'Sonucu gör' : 'Tahtayı aç →'} secondary onPress={() => setSelectedGame(g.id)} />}</View>)}
      </>}
    </>}
    <Text style={s.footnote}>TDK sözlüğü · Joker 0 puanlı · ★4K yıldız karesi etkin</Text>
  </ScrollView></KeyboardAvoidingView><Modal transparent visible={!!blankTarget} animationType="fade" onRequestClose={() => setBlankTarget(null)}><View style={s.modalBackdrop}><View style={s.letterPicker}><Text style={s.heading}>Joker hangi harf olsun?</Text><View style={s.letterChoices}>{letters.map(letter => <Pressable key={letter} accessibilityRole="button" accessibilityLabel={`${letter} harfini seç`} onPress={() => chooseBlankLetter(letter)} style={s.letterChoice}><Text style={s.letterChoiceText}>{letter}</Text></Pressable>)}</View><Pressable accessibilityRole="button" onPress={() => setBlankTarget(null)} style={s.cancelPicker}><Text style={s.caption}>Vazgeç</Text></Pressable></View></View></Modal></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F4EC' }, page: { padding: 18, gap: 18, maxWidth: 680, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  gameScreen: { flex: 1, paddingHorizontal: 10, paddingTop: 4, paddingBottom: 5, gap: 4 }, gameTop: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, backButton: { minWidth: 82, minHeight: 36, justifyContent: 'center' }, backText: { color: '#315E50', fontSize: 13, fontWeight: '700' }, gameBrand: { color: '#214A41', fontSize: 23, fontWeight: '900' }, surrenderButton: { minWidth: 60, minHeight: 36, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 4 }, surrenderText: { color: '#B64F57', fontSize: 13, fontWeight: '700' }, gameScore: { padding: 8, borderRadius: 10 }, gamePlayerName: { color: '#62776C', fontSize: 12, lineHeight: 16 }, gameHeading: { color: '#214A41', fontSize: 16, fontWeight: '800' }, playArea: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' }, previewError: { color: '#9D4036', fontSize: 11, lineHeight: 15, textAlign: 'center' }, gameActions: { flexDirection: 'row', alignItems: 'center', gap: 6 }, gameFooter: { textAlign: 'center', color: '#74857B', fontSize: 10, lineHeight: 14 },
  gamePage: { gap: 12, paddingHorizontal: 14 }, rackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }, moveNote: { backgroundColor: '#EAF0E5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }, brand: { fontSize: 36, color: '#214A41', fontWeight: '900', letterSpacing: -2 }, tag: { fontSize: 9, letterSpacing: 1.5, color: '#62776C', fontWeight: '700' },
  eyebrow: { color: '#62776C', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 }, hero: { fontSize: 35, lineHeight: 42, fontWeight: '800', letterSpacing: -1.5, color: '#214A41' }, body: { color: '#62776C', fontSize: 15, lineHeight: 23 },
  preview: { flexDirection: 'row', gap: 7, marginVertical: 16 }, demoTile: { width: 43, height: 51, backgroundColor: '#EDDBAF', borderRadius: 9, borderBottomWidth: 4, borderColor: '#CEB67F', justifyContent: 'center', alignItems: 'center' },
  card: { padding: 22, backgroundColor: '#FFFFFF', borderRadius: 23, gap: 14 }, heading: { color: '#214A41', fontSize: 20, fontWeight: '700' }, input: { backgroundColor: '#F3F5F0', borderWidth: 1, borderColor: '#DDE4D9', borderRadius: 12, padding: 16, color: '#214A41', fontSize: 17 },
  button: { backgroundColor: '#214A41', padding: 16, minHeight: 48, borderRadius: 14, alignItems: 'center' }, secondary: { backgroundColor: '#E7EDE4' }, buttonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  error: { padding: 16, backgroundColor: '#FBE5DF', borderRadius: 12 }, identity: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, id: { color: '#214A41', fontSize: 19, fontWeight: '700', marginTop: 6 }, link: { color: '#214A41', fontWeight: '700', paddingVertical: 12 },
  scoreRow: { flexDirection: 'row', gap: 12 }, score: { flex: 1, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: 'transparent' }, current: { borderColor: '#43866A' }, scoreNumber: { color: '#214A41', fontSize: 30, fontWeight: '800' },
  rack: { zIndex: 20, overflow: 'visible', flexDirection: 'row', gap: 5, justifyContent: 'center', padding: 7, paddingTop: 12, backgroundColor: '#E7DBBF', borderRadius: 16 }, tileText: { color: '#38483B', fontSize: 24, fontWeight: '800' }, actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' }, caption: { color: '#62776C', fontSize: 12, lineHeight: 19 }, footnote: { fontSize: 11, lineHeight: 18, color: '#788578', textAlign: 'center', marginTop: 18 },
  modalBackdrop: { flex: 1, padding: 20, backgroundColor: 'rgba(20, 35, 28, 0.55)', justifyContent: 'center', alignItems: 'center' }, letterPicker: { width: '100%', maxWidth: 370, padding: 18, gap: 16, backgroundColor: '#F6F4EC', borderRadius: 14 }, letterChoices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7 }, letterChoice: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDDBAF', borderRadius: 8, borderWidth: 1, borderColor: '#CEB67F' }, letterChoiceText: { fontSize: 18, fontWeight: '800', color: '#214A41' }, cancelPicker: { alignSelf: 'flex-end', padding: 8 },
});
