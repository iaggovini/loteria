import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { Ball } from '@/components/Ball';
import { useThemeColor } from '@/components/Themed';
import { formatNumber, getPrizeLabel } from '@/constants/modalities';
import { useAppState } from '@/state/AppStateContext';
import { POOL_TEMPLATES, PoolTemplateKey, usePool } from '@/state/PoolContext';

interface ConferRow {
  betId: string;
  hits: number[];
  label: string;
}

export default function BolaoScreen() {
  const { modality, history } = useAppState();
  const {
    name,
    setName,
    organizer,
    setOrganizer,
    contestNumber,
    setContestNumber,
    betPrice,
    setBetPrice,
    bets,
    participants,
    addRandomBets,
    applyTemplate,
    removeBet,
    clearBets,
    addParticipant,
    removeParticipant,
  } = usePool();

  const [genCount, setGenCount] = useState('5');
  const [participantName, setParticipantName] = useState('');
  const [participantShares, setParticipantShares] = useState('1');
  const [conferRows, setConferRows] = useState<ConferRow[] | null>(null);
  const [conferBest, setConferBest] = useState(0);

  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const border = useThemeColor({}, 'border');
  const success = useThemeColor({}, 'success');

  const latest = history[0];
  const totalShares = participants.reduce((s, p) => s + p.shares, 0) || 1;
  const total = bets.length * betPrice;
  const perShare = total / totalShares;

  function handleTemplate(key: PoolTemplateKey) {
    if (bets.length > 0) {
      Alert.alert(
        'Aplicar modelo?',
        `As ${bets.length} apostas atuais serão substituídas pelo modelo "${POOL_TEMPLATES[key].name}".`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Aplicar', onPress: () => applyTemplate(key) },
        ]
      );
      return;
    }
    applyTemplate(key);
  }

  function handleClear() {
    if (!bets.length) return;
    Alert.alert('Limpar bolão', `Remover todas as ${bets.length} apostas do bolão?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: clearBets },
    ]);
  }

  function handleGenerate() {
    addRandomBets(Math.min(30, Math.max(1, Number(genCount) || 5)));
  }

  function handleAddParticipant() {
    const trimmed = participantName.trim();
    if (!trimmed) {
      Alert.alert('Aviso', 'Digite o nome do participante.');
      return;
    }
    addParticipant(trimmed, Math.max(1, Number(participantShares) || 1));
    setParticipantName('');
    setParticipantShares('1');
  }

  function handleConfer() {
    if (!latest) {
      Alert.alert('Aviso', 'Carregue os resultados antes de conferir.');
      return;
    }
    if (!bets.length) {
      Alert.alert('Aviso', 'Adicione apostas ao bolão antes de conferir.');
      return;
    }
    const drawn = new Set(latest.balls);
    let best = 0;
    const rows = bets.map((bet) => {
      const hits = bet.numbers.filter((n) => drawn.has(n));
      if (hits.length > best) best = hits.length;
      return { betId: bet.id, hits, label: getPrizeLabel(modality, hits.length) };
    });
    setConferRows(rows);
    setConferBest(best);
  }

  function buildPoolText(): string {
    const lines = [
      `🎰 ${name || 'Bolão'}`,
      organizer ? `Organizador: ${organizer}` : '',
      contestNumber ? `Concurso Nº: ${contestNumber}` : '',
      `Jogo: ${modality.name}`,
      '─────────────────────',
    ].filter(Boolean);

    bets.forEach((bet, i) => {
      lines.push(`Aposta ${i + 1}: ${bet.numbers.map(formatNumber).join(' - ')}`);
    });

    lines.push('─────────────────────');
    lines.push(`Total: R$ ${total.toFixed(2)}`);

    if (participants.length) {
      lines.push('Participantes:');
      participants.forEach((p, i) => {
        const cost = (p.shares / totalShares) * total;
        lines.push(`  ${i + 1}. ${p.name} — R$ ${cost.toFixed(2)}`);
      });
    }

    return lines.join('\n');
  }

  async function handleShare() {
    if (!bets.length) {
      Alert.alert('Aviso', 'Adicione apostas ao bolão antes de compartilhar.');
      return;
    }
    await Share.share({ message: buildPoolText() });
  }

  async function handleCopy() {
    if (!bets.length) {
      Alert.alert('Aviso', 'Adicione apostas ao bolão antes de copiar.');
      return;
    }
    await Clipboard.setStringAsync(buildPoolText());
    Alert.alert('Copiado', 'Bolão copiado para a área de transferência.');
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: background }]} contentContainerStyle={styles.content}>
      <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
        <Text style={[styles.boxTitle, { color: text }]}>Dados do bolão · {modality.name}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nome do bolão"
          placeholderTextColor={muted}
          style={[styles.input, { color: text, borderColor: border, backgroundColor: background }]}
        />
        <TextInput
          value={organizer}
          onChangeText={setOrganizer}
          placeholder="Organizador"
          placeholderTextColor={muted}
          style={[styles.input, { color: text, borderColor: border, backgroundColor: background }]}
        />
        <TextInput
          value={contestNumber}
          onChangeText={setContestNumber}
          placeholder="Concurso Nº (opcional)"
          placeholderTextColor={muted}
          keyboardType="numeric"
          style={[styles.input, { color: text, borderColor: border, backgroundColor: background }]}
        />
        <View style={styles.priceRow}>
          <Text style={{ color: text }}>Preço por aposta (R$)</Text>
          <TextInput
            value={String(betPrice)}
            onChangeText={(v) => setBetPrice(Math.max(0, Number(v) || 0))}
            keyboardType="numeric"
            style={[styles.priceInput, { color: text, borderColor: border, backgroundColor: background }]}
          />
        </View>
      </View>

      <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
        <Text style={[styles.boxTitle, { color: text }]}>Modelos prontos</Text>
        <View style={styles.templateGrid}>
          {Object.entries(POOL_TEMPLATES).map(([key, tpl]) => (
            <View key={key} style={styles.templateSlot}>
              <ActionButton
                label={`${tpl.name} (${tpl.bets})`}
                onPress={() => handleTemplate(key as PoolTemplateKey)}
                color={background}
                textColor={text}
                outline
                borderColor={border}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
        <Text style={[styles.boxTitle, { color: text }]}>Gerar surpresinhas</Text>
        <View style={styles.priceRow}>
          <TextInput
            value={genCount}
            onChangeText={setGenCount}
            keyboardType="numeric"
            style={[styles.priceInput, { color: text, borderColor: border, backgroundColor: background }]}
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <ActionButton label="Gerar apostas" onPress={handleGenerate} color={primary} fullWidth />
          </View>
        </View>
      </View>

      <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.boxTitle, { color: text, marginBottom: 0 }]}>{bets.length} aposta(s)</Text>
          {bets.length > 0 && (
            <View style={{ width: 90 }}>
              <ActionButton label="Limpar" onPress={handleClear} color={danger} />
            </View>
          )}
        </View>
        {!bets.length ? (
          <Text style={{ color: muted, marginTop: 8 }}>
            Nenhuma aposta. Use o Simulador ou gere surpresinhas acima.
          </Text>
        ) : (
          bets.map((bet, i) => {
            const conferRow = conferRows?.find((r) => r.betId === bet.id);
            const hitSet = conferRow ? new Set(conferRow.hits) : undefined;
            return (
              <View key={bet.id} style={styles.betRow}>
                <Text style={{ color: muted, width: 60, fontSize: 12 }}>Aposta {i + 1}</Text>
                <View style={styles.betBalls}>
                  {bet.numbers.map((n) => (
                    <Ball key={n} value={n} state={hitSet ? (hitSet.has(n) ? 'hit' : 'miss') : 'default'} />
                  ))}
                </View>
                <RemoveButton onPress={() => removeBet(bet.id)} color={danger} />
              </View>
            );
          })
        )}
      </View>

      <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
        <Text style={[styles.boxTitle, { color: text }]}>Participantes</Text>
        <View style={styles.priceRow}>
          <TextInput
            value={participantName}
            onChangeText={setParticipantName}
            placeholder="Nome"
            placeholderTextColor={muted}
            style={[styles.input, { flex: 1, marginBottom: 0, color: text, borderColor: border, backgroundColor: background }]}
          />
          <TextInput
            value={participantShares}
            onChangeText={setParticipantShares}
            keyboardType="numeric"
            placeholder="Cotas"
            placeholderTextColor={muted}
            style={[styles.priceInput, { marginLeft: 8, color: text, borderColor: border, backgroundColor: background }]}
          />
        </View>
        <ActionButton label="Adicionar participante" onPress={handleAddParticipant} color={primary} fullWidth />

        {participants.map((p, i) => (
          <View key={p.id} style={styles.participantRow}>
            <Text style={{ color: muted, width: 20 }}>{i + 1}</Text>
            <Text style={{ color: text, flex: 1 }} numberOfLines={1}>
              {p.name}
            </Text>
            <Text style={{ color: muted, marginRight: 8, fontSize: 12 }}>
              {p.shares} cota(s) · {((p.shares / totalShares) * 100).toFixed(0)}%
            </Text>
            <RemoveButton onPress={() => removeParticipant(p.id)} color={danger} />
          </View>
        ))}
      </View>

      {bets.length > 0 && (
        <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.boxTitle, { color: text }]}>Resumo</Text>
          <View style={styles.summaryGrid}>
            <SummaryItem label="Apostas" value={String(bets.length)} color={text} mutedColor={muted} />
            <SummaryItem label="Total" value={`R$ ${total.toFixed(2)}`} color={text} mutedColor={muted} />
            <SummaryItem label="Cotas" value={String(totalShares)} color={text} mutedColor={muted} />
            <SummaryItem label="Por cota" value={`R$ ${perShare.toFixed(2)}`} color={primary} mutedColor={muted} highlight />
          </View>
        </View>
      )}

      <View style={styles.actionsRow}>
        <ActionButton label="Conferir bolão" onPress={handleConfer} color={primary} />
        <ActionButton label="Copiar" onPress={handleCopy} color={surface} textColor={text} outline borderColor={border} />
        <ActionButton label="Compartilhar" onPress={handleShare} color={surface} textColor={text} outline borderColor={border} />
      </View>

      {conferRows && (
        <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
          <Text style={{ color: text, fontWeight: '700' }}>
            Conferência — Concurso {latest?.contest} ({latest?.date})
          </Text>
          <Text style={{ color: conferBest > 0 ? success : muted, marginVertical: 6 }}>
            {conferBest > 0
              ? `Melhor resultado do bolão: ${conferBest} acerto(s)`
              : 'Nenhum acerto neste bolão para este concurso.'}
          </Text>
          {conferRows.map((row, i) => (
            <Text key={row.betId} style={{ color: muted, marginTop: 4 }}>
              Aposta {i + 1}: {row.hits.length} acerto(s) — {row.label}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function RemoveButton({ onPress, color }: { onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.removeBtn, { borderColor: color }]}>
      <Text style={{ color, fontWeight: '700' }}>✕</Text>
    </Pressable>
  );
}

function SummaryItem({
  label,
  value,
  color,
  mutedColor,
  highlight,
}: {
  label: string;
  value: string;
  color: string;
  mutedColor: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={{ color, fontWeight: '700', fontSize: highlight ? 18 : 16 }}>{value}</Text>
      <Text style={{ color: mutedColor, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, paddingBottom: 32, gap: 12 },
  box: { borderRadius: 12, borderWidth: 1, padding: 14 },
  boxTitle: { fontWeight: '700', marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  priceInput: { borderWidth: 1, borderRadius: 8, padding: 10, width: 80, textAlign: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateSlot: { width: '48%' },
  betRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  betBalls: { flexDirection: 'row', flexWrap: 'wrap', flex: 1 },
  removeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  participantRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  summaryItem: { minWidth: 80 },
  actionsRow: { flexDirection: 'row', gap: 8 },
});
