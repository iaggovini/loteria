import { useAppState } from '@/state/AppStateContext';

// O tema não segue o esquema do sistema: o usuário controla dark/light pelo
// toggle do app (persistido via AsyncStorage), igual ao comportamento do site.
export function useColorScheme(): 'light' | 'dark' {
  return useAppState().theme;
}
