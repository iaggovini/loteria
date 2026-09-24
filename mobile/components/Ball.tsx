import { StyleSheet, Text, View } from 'react-native';

import { formatNumber } from '@/constants/modalities';

import { useThemeColor } from './Themed';

export type BallState = 'default' | 'hit' | 'miss';

export function Ball({ value, state = 'default' }: { value: number; state?: BallState }) {
  const surface2 = useThemeColor({}, 'surface2');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const text = useThemeColor({}, 'text');

  const backgroundColor = state === 'hit' ? success : state === 'miss' ? danger : surface2;
  const color = state === 'default' ? text : '#ffffff';

  return (
    <View style={[styles.ball, { backgroundColor }]}>
      <Text style={[styles.text, { color }]}>{formatNumber(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ball: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 3,
  },
  text: {
    fontWeight: '700',
    fontSize: 12,
  },
});
