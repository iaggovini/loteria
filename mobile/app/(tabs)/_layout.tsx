import { SymbolView } from 'expo-symbols';
import { router, Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAppState } from '@/state/AppStateContext';
import { useAuth } from '@/state/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { toggleTheme } = useAppState();
  const { configured, user } = useAuth();
  const palette = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tabIconSelected,
        tabBarInactiveTintColor: palette.tabIconDefault,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.text,
        headerLeft: configured
          ? () => (
              <Pressable onPress={() => router.push('/login')} style={{ marginLeft: 16 }}>
                <Text style={{ color: palette.primary, fontWeight: '600' }} numberOfLines={1}>
                  {user ? user.email?.split('@')[0] : 'Entrar'}
                </Text>
              </Pressable>
            )
          : undefined,
        headerRight: () => (
          <Pressable onPress={toggleTheme} style={{ marginRight: 16 }}>
            <Text style={{ fontSize: 18 }}>{colorScheme === 'dark' ? '☀️' : '🌙'}</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resultados',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'list.bullet', android: 'list', web: 'list' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="estatisticas"
        options={{
          title: 'Estatísticas',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="simulador"
        options={{
          title: 'Simulador',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'square.grid.3x3.fill', android: 'grid_view', web: 'grid_view' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bolao"
        options={{
          title: 'Bolão',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'star.fill', android: 'star', web: 'star' }} tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
