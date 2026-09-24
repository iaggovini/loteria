import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { AUTH_CONFIG } from '@/constants/authConfig';

export function isAuthConfigured(): boolean {
  return /^https:\/\/.+\.supabase\.co$/i.test(AUTH_CONFIG.supabaseUrl) && AUTH_CONFIG.supabaseAnonKey.length > 20;
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  client = createClient(AUTH_CONFIG.supabaseUrl, AUTH_CONFIG.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
