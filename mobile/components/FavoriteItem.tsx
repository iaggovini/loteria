import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatNumber } from '@/constants/modalities';
import { Favorite } from '@/services/storage';

import { useThemeColor } from './Themed';

export function FavoriteItem({
  favorite,
  onApply,
  onRemove,
}: {
  favorite: Favorite;
  onApply: () => void;
  onRemove: () => void;
}) {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');
  const primary = useThemeColor({}, 'primary');

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.info}>
        <Text style={[styles.name, { color: text }]}>{favorite.name}</Text>
        <Text style={[styles.meta, { color: muted }]}>
          {favorite.modalityName} · {favorite.numbers.map(formatNumber).join(' - ')}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={[styles.btn, { backgroundColor: primary }]} onPress={onApply}>
          <Text style={styles.btnText}>Usar</Text>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: danger }]} onPress={onRemove}>
          <Text style={styles.btnText}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  info: { flex: 1 },
  name: { fontWeight: '700', marginBottom: 4 },
  meta: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 6 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnText: { color: '#ffffff', fontWeight: '600', fontSize: 12 },
});
