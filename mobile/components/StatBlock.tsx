import { StyleSheet, Text, View } from 'react-native';

import { useThemeColor } from './Themed';

interface StatBlockItem {
  label: string;
  sub: string;
  pct?: number;
}

export function StatBlock({
  title,
  items,
  mutedBar,
}: {
  title: string;
  items: StatBlockItem[];
  mutedBar?: boolean;
}) {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const primary = useThemeColor({}, 'primary');

  return (
    <View style={[styles.block, { backgroundColor: surface, borderColor: border }]}>
      <Text style={[styles.title, { color: text }]}>{title}</Text>
      {items.map((item, i) => (
        <View key={`${item.label}-${i}`} style={styles.row}>
          <Text style={[styles.label, { color: text }]}>{item.label}</Text>
          {item.pct !== undefined && (
            <View style={[styles.barWrap, { backgroundColor: border }]}>
              <View
                style={[
                  styles.bar,
                  { width: `${item.pct}%`, backgroundColor: mutedBar ? muted : primary },
                ]}
              />
            </View>
          )}
          <Text style={[styles.sub, { color: muted }]}>{item.sub}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  title: { fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  label: { width: 32, fontWeight: '700' },
  barWrap: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  sub: { minWidth: 84, textAlign: 'right', fontSize: 12 },
});
