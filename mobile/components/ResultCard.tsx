import { StyleSheet, Text, View } from 'react-native';

import { Contest } from '@/services/api';

import { Ball } from './Ball';
import { useThemeColor } from './Themed';

export function ResultCard({ result }: { result: Contest }) {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const warning = useThemeColor({}, 'warning');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.header}>
        <Text style={[styles.contest, { color: text }]}>Concurso {result.contest}</Text>
        <Text style={[styles.date, { color: muted }]}>{result.date}</Text>
      </View>
      {result.accumulated && <Text style={[styles.badge, { color: warning }]}>Acumulou</Text>}
      <View style={styles.balls}>
        {result.balls.map((n) => (
          <Ball key={n} value={n} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  contest: { fontWeight: '700', fontSize: 15 },
  date: { fontSize: 13 },
  badge: { fontWeight: '700', marginBottom: 6, fontSize: 12 },
  balls: { flexDirection: 'row', flexWrap: 'wrap' },
});
