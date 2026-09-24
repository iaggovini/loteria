import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatNumber } from '@/constants/modalities';
import { ModalitySelector } from '@/components/ModalitySelector';
import { StatBlock } from '@/components/StatBlock';
import { useThemeColor } from '@/components/Themed';
import { useAppState } from '@/state/AppStateContext';
import { computeStats } from '@/utils/stats';

export default function EstatisticasScreen() {
  const { modality, setModalityId, history } = useAppState();
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');

  if (!history.length) {
    return (
      <View style={[styles.container, { backgroundColor: background }]}>
        <ModalitySelector value={modality.id} onChange={setModalityId} />
        <Text style={{ color: muted, textAlign: 'center', marginTop: 40 }}>Sem dados para estatísticas.</Text>
      </View>
    );
  }

  const { hot, cold, delay, maxFreq } = computeStats(history, modality);

  return (
    <ScrollView style={[styles.container, { backgroundColor: background }]} contentContainerStyle={styles.content}>
      <ModalitySelector value={modality.id} onChange={setModalityId} />
      <StatBlock
        title={`Mais sorteadas (${history.length} concursos)`}
        items={hot.map(([n, c]) => ({ label: formatNumber(n), sub: `${c}×`, pct: (c / maxFreq) * 100 }))}
      />
      <StatBlock
        title="Menos sorteadas"
        items={cold.map(([n, c]) => ({
          label: formatNumber(n),
          sub: `${c}×`,
          pct: maxFreq ? (c / maxFreq) * 100 : 0,
        }))}
        mutedBar
      />
      <StatBlock
        title="Maior atraso"
        items={delay.map((d) => ({
          label: formatNumber(d.num),
          sub: d.draws === history.length ? 'não saiu no período' : `${d.draws} sorteio(s) atrás`,
        }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 12, paddingBottom: 24 },
});
