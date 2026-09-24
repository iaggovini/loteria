import { Pressable, StyleSheet, Text } from 'react-native';

export function ActionButton({
  label,
  onPress,
  color,
  textColor = '#ffffff',
  outline = false,
  borderColor,
  fullWidth = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  color: string;
  textColor?: string;
  outline?: boolean;
  borderColor?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionBtn,
        fullWidth && { flex: undefined, width: '100%' },
        { backgroundColor: color, opacity: disabled ? 0.5 : 1 },
        outline && { borderWidth: 1, borderColor },
      ]}
    >
      <Text style={{ color: textColor, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
