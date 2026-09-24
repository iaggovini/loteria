import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { MODALITIES, ModalityId } from '@/constants/modalities';

import { useThemeColor } from './Themed';

export function ModalitySelector({
  value,
  onChange,
}: {
  value: ModalityId;
  onChange: (id: ModalityId) => void;
}) {
  const surface = useThemeColor({}, 'surface');
  const primary = useThemeColor({}, 'primary');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {Object.values(MODALITIES).map((m) => {
        const active = m.id === value;
        return (
          <Pressable
            key={m.id}
            onPress={() => onChange(m.id)}
            style={[
              styles.chip,
              { backgroundColor: active ? primary : surface, borderColor: border },
            ]}
          >
            <Text style={{ color: active ? '#ffffff' : text, fontWeight: '600' }}>{m.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
});
