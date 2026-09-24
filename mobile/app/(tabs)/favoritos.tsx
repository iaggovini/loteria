import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { FavoriteItem } from '@/components/FavoriteItem';
import { useThemeColor } from '@/components/Themed';
import { useAppState } from '@/state/AppStateContext';

export default function FavoritosScreen() {
  const { favorites, removeFavorite, applyFavorite } = useAppState();
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <FavoriteItem
            favorite={item}
            onApply={() => {
              applyFavorite(item);
              router.push('/(tabs)/simulador');
            }}
            onRemove={() => removeFavorite(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text style={{ color: muted, textAlign: 'center', marginTop: 40 }}>
            Nenhuma aposta favorita salva. Monte uma aposta no Simulador e salve por aqui.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 12, flexGrow: 1 },
});
