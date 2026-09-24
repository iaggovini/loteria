import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatNumber } from '@/constants/modalities';

import { useThemeColor } from './Themed';

export function NumberGrid({
  min,
  max,
  cols,
  selected,
  locked,
  onToggle,
}: {
  min: number;
  max: number;
  cols: number;
  selected: number[];
  locked: boolean;
  onToggle: (n: number) => void;
}) {
  const surface2 = useThemeColor({}, 'surface2');
  const primary = useThemeColor({}, 'primary');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');

  const numbers: number[] = [];
  for (let i = min; i <= max; i += 1) numbers.push(i);

  return (
    <View style={styles.grid}>
      {numbers.map((n) => {
        const isSelected = selected.includes(n);
        const disabled = locked && !isSelected;
        return (
          <Pressable
            key={n}
            disabled={disabled}
            onPress={() => onToggle(n)}
            style={[styles.cell, { width: `${100 / cols}%` }]}
          >
            <View
              style={[
                styles.ball,
                {
                  backgroundColor: isSelected ? primary : surface2,
                  borderColor: border,
                  opacity: disabled ? 0.35 : 1,
                },
              ]}
            >
              <Text style={{ color: isSelected ? '#ffffff' : text, fontWeight: '700', fontSize: 12 }}>
                {formatNumber(n)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { padding: 3, alignItems: 'center' },
  ball: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
