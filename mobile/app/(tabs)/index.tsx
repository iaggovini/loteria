import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useThemeColor } from '@/components/Themed';
import { ModalitySelector } from '@/components/ModalitySelector';
import { ResultCard } from '@/components/ResultCard';
import { useAppState } from '@/state/AppStateContext';

export default function ResultadosScreen() {
  const { modality, setModalityId, history, dataSource, loadingResults, refreshResults, loadMoreResults } =
    useAppState();
  const [loadingMore, setLoadingMore] = useState(false);

  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      await loadMoreResults();
    } finally {
      setLoadingMore(false);
    }
  }, [loadMoreResults, loadingMore]);

  const latest = history[0];

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <ModalitySelector value={modality.id} onChange={setModalityId} />
      <Text style={[styles.source, { color: muted }]}>
        {dataSource === 'api' ? 'Fonte: API Caixa (tempo real)' : 'Fonte: dados locais (API indisponível)'}
      </Text>

      {loadingResults && !history.length ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={primary} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.contest)}
          renderItem={({ item }) => <ResultCard result={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loadingResults} onRefresh={refreshResults} tintColor={primary} />
          }
          ListHeaderComponent={
            latest ? (
              <View style={[styles.nextDraw, { backgroundColor: surface }]}>
                <Text style={[styles.nextTitle, { color: text }]}>Próximo sorteio</Text>
                <Text style={{ color: muted }}>
                  Concurso {latest.nextContest ?? '—'} · {latest.nextDate || 'data a confirmar'}
                </Text>
                <Text style={{ color: muted }}>
                  Prêmio estimado:{' '}
                  {latest.nextPrize != null
                    ? latest.nextPrize.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : '—'}
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            history.length ? (
              <Pressable
                style={[styles.loadMore, { backgroundColor: surface }]}
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                <Text style={{ color: text, fontWeight: '600' }}>
                  {loadingMore ? 'Carregando…' : 'Carregar mais concursos'}
                </Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            !loadingResults ? (
              <Text style={{ color: muted, textAlign: 'center', marginTop: 40 }}>
                Não foi possível carregar resultados. Tente novamente mais tarde.
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  source: { textAlign: 'center', fontSize: 12, marginBottom: 8 },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  nextDraw: { borderRadius: 12, padding: 14, marginBottom: 14 },
  nextTitle: { fontWeight: '700', marginBottom: 4 },
  loadMore: { borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
});
