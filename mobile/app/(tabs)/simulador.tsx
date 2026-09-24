import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { Ball } from '@/components/Ball';
import { ModalitySelector } from '@/components/ModalitySelector';
import { NumberGrid } from '@/components/NumberGrid';
import { useThemeColor } from '@/components/Themed';
import { formatNumber, getPrizeLabel } from '@/constants/modalities';
import { useAppState } from '@/state/AppStateContext';
import { usePool } from '@/state/PoolContext';

interface ConferenceResult {
  hits: number[];
  label: string;
  contest: number;
  date: string;
}

export default function SimuladorScreen() {
  const { modality, setModalityId, selected, toggleNumber, clearSelection, applyNumbers, history, addFavorite } =
    useAppState();
  const { addBet } = usePool();

  const [onlyEven, setOnlyEven] = useState(false);
  const [onlyOdd, setOnlyOdd] = useState(false);
  const [rangeLow, setRangeLow] = useState(false);
  const [conference, setConference] = useState<ConferenceResult | null>(null);
  const [favoriteName, setFavoriteName] = useState('');

  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const primary = useThemeColor({}, 'primary');
  const border = useThemeColor({}, 'border');

  const locked = selected.length >= modality.pick;
  const latest = history[0];

  const pool = useMemo(() => {
    const arr: number[] = [];
    const mid = modality.min + Math.floor((modality.max - modality.min) / 2);
    for (let i = modality.min; i <= modality.max; i += 1) {
      if (onlyEven && i % 2 !== 0) continue;
      if (onlyOdd && i % 2 === 0) continue;
      if (rangeLow && i > mid) continue;
      arr.push(i);
    }
    return arr.length >= modality.pick
      ? arr
      : Array.from({ length: modality.max - modality.min + 1 }, (_, idx) => modality.min + idx);
  }, [modality, onlyEven, onlyOdd, rangeLow]);

  function handleQuickPick() {
    const working = [...pool];
    const pick: number[] = [];
    while (pick.length < modality.pick && working.length) {
      const idx = Math.floor(Math.random() * working.length);
      pick.push(working.splice(idx, 1)[0]);
    }
    applyNumbers(pick);
    setConference(null);
  }

  function handleToggle(n: number) {
    toggleNumber(n);
    setConference(null);
  }

  function handleClear() {
    clearSelection();
    setConference(null);
  }

  function handleConference() {
    if (!latest) {
      Alert.alert('Aviso', 'Carregue os resultados antes de conferir.');
      return;
    }
    if (selected.length !== modality.pick) {
      Alert.alert('Aviso', `Selecione exatamente ${modality.pick} números para conferir.`);
      return;
    }
    const drawn = new Set(latest.balls);
    const hits = selected.filter((n) => drawn.has(n));
    setConference({
      hits,
      label: getPrizeLabel(modality, hits.length),
      contest: latest.contest,
      date: latest.date,
    });
  }

  async function handleCopy() {
    if (!selected.length) {
      Alert.alert('Aviso', 'Nenhum número para copiar.');
      return;
    }
    await Clipboard.setStringAsync(selected.map(formatNumber).join(' - '));
    Alert.alert('Copiado', 'Números copiados.');
  }

  async function handleShare() {
    if (!selected.length) {
      Alert.alert('Aviso', 'Selecione números antes de compartilhar.');
      return;
    }
    await Share.share({
      message: `Minha aposta ${modality.name}: ${selected.map(formatNumber).join(' - ')}`,
    });
  }

  async function handleSaveFavorite() {
    if (selected.length !== modality.pick) {
      Alert.alert('Aviso', `Selecione ${modality.pick} números antes de salvar.`);
      return;
    }
    const name = favoriteName.trim() || `Aposta ${new Date().toLocaleDateString('pt-BR')}`;
    await addFavorite(name);
    setFavoriteName('');
    Alert.alert('Salvo', 'Aposta salva nos favoritos.');
  }

  function handleAddToPool() {
    if (selected.length !== modality.pick) {
      Alert.alert('Aviso', `Selecione ${modality.pick} números para incluir no bolão.`);
      return;
    }
    addBet(selected);
    router.push('/(tabs)/bolao');
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: background }]} contentContainerStyle={styles.content}>
      <ModalitySelector value={modality.id} onChange={setModalityId} />
      <Text style={[styles.desc, { color: muted }]}>{modality.description}</Text>

      <View style={[styles.filters, { backgroundColor: surface, borderColor: border }]}>
        <FilterSwitch
          label="Só pares"
          value={onlyEven}
          onChange={(v) => {
            setOnlyEven(v);
            if (v) setOnlyOdd(false);
          }}
        />
        <FilterSwitch
          label="Só ímpares"
          value={onlyOdd}
          onChange={(v) => {
            setOnlyOdd(v);
            if (v) setOnlyEven(false);
          }}
        />
        <FilterSwitch label="Faixa baixa" value={rangeLow} onChange={setRangeLow} />
      </View>

      <NumberGrid
        min={modality.min}
        max={modality.max}
        cols={modality.gridCols}
        selected={selected}
        locked={locked}
        onToggle={handleToggle}
      />

      <View style={styles.counterRow}>
        <Text style={{ color: text, fontWeight: '700' }}>
          {selected.length} / {modality.pick}
        </Text>
        <Text style={{ color: muted, flex: 1, textAlign: 'right' }} numberOfLines={2}>
          {selected.length ? selected.map(formatNumber).join(' - ') : 'Nenhum número selecionado'}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <ActionButton label="Surpresinha" onPress={handleQuickPick} color={primary} />
        <ActionButton label="Limpar" onPress={handleClear} color={surface} textColor={text} outline borderColor={border} />
      </View>
      <View style={styles.actionsRow}>
        <ActionButton label="Conferir" onPress={handleConference} color={primary} />
        <ActionButton label="Copiar" onPress={handleCopy} color={surface} textColor={text} outline borderColor={border} />
        <ActionButton
          label="Compartilhar"
          onPress={handleShare}
          color={surface}
          textColor={text}
          outline
          borderColor={border}
        />
      </View>
      <View style={styles.actionsRow}>
        <ActionButton
          label="Adicionar ao Bolão"
          onPress={handleAddToPool}
          color={surface}
          textColor={text}
          outline
          borderColor={border}
          fullWidth
        />
      </View>

      {conference && (
        <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
          <Text style={{ color: text, fontWeight: '700' }}>
            Concurso {conference.contest} ({conference.date})
          </Text>
          <Text style={{ color: text, marginTop: 4 }}>
            {conference.hits.length} acerto(s):{' '}
            {conference.hits.length ? conference.hits.map(formatNumber).join(', ') : 'nenhum'}
          </Text>
          <Text style={{ color: muted, marginBottom: 8 }}>{conference.label}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {selected.map((n) => (
              <Ball key={n} value={n} state={conference.hits.includes(n) ? 'hit' : 'miss'} />
            ))}
          </View>
        </View>
      )}

      <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
        <Text style={{ color: text, fontWeight: '700', marginBottom: 8 }}>Salvar como favorita</Text>
        <TextInput
          value={favoriteName}
          onChangeText={setFavoriteName}
          placeholder="Nome da aposta (opcional)"
          placeholderTextColor={muted}
          style={[styles.input, { color: text, borderColor: border, backgroundColor: background }]}
        />
        <ActionButton label="Salvar favorito" onPress={handleSaveFavorite} color={primary} fullWidth />
      </View>
    </ScrollView>
  );
}

function FilterSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const text = useThemeColor({}, 'text');
  const primary = useThemeColor({}, 'primary');
  return (
    <View style={styles.filterRow}>
      <Text style={{ color: text }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: primary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 12, paddingBottom: 32 },
  desc: { marginBottom: 10 },
  filters: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12, gap: 6 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  box: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
});
