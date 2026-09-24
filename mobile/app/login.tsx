import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { useThemeColor } from '@/components/Themed';
import { useAuth } from '@/state/AuthContext';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const { configured, user, signIn, signUp, requestPasswordReset, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const border = useThemeColor({}, 'border');

  if (!configured) {
    return (
      <View style={[styles.container, { backgroundColor: background }]}>
        <Text style={{ color: muted, textAlign: 'center' }}>
          Login não configurado. Preencha `constants/authConfig.ts` com a URL e a chave anônima do seu projeto
          Supabase para habilitar esta função.
        </Text>
      </View>
    );
  }

  if (user) {
    return (
      <View style={[styles.container, { backgroundColor: background }]}>
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
          <Text style={{ color: text, fontWeight: '700', marginBottom: 4 }}>Você está conectado</Text>
          <Text style={{ color: muted, marginBottom: 16 }}>{user.email}</Text>
          <ActionButton
            label="Sair"
            color={danger}
            onPress={async () => {
              await signOut();
              router.back();
            }}
            fullWidth
          />
        </View>
      </View>
    );
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const result = mode === 'signup' ? await signUp(email, password) : await signIn(email, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (mode === 'signup' && result.needsEmailConfirmation) {
        Alert.alert('Quase lá', 'Confira seu e-mail para confirmar a conta.');
        setMode('signin');
        setPassword('');
        return;
      }
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Informe seu e-mail para receber o link de redefinição.');
      return;
    }
    const result = await requestPasswordReset(email);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError('');
    Alert.alert('Verifique seu e-mail', 'Se existir uma conta, enviaremos instruções para o e-mail informado.');
  }

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <Text style={[styles.title, { color: text }]}>{mode === 'signup' ? 'Criar conta' : 'Entrar'}</Text>
        <Text style={{ color: muted, marginBottom: 16 }}>
          {mode === 'signup' ? 'Confirme seu e-mail para ativar a conta.' : 'Acesse sua conta com segurança.'}
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-mail"
          placeholderTextColor={muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, { color: text, borderColor: border, backgroundColor: background }]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          placeholderTextColor={muted}
          secureTextEntry
          style={[styles.input, { color: text, borderColor: border, backgroundColor: background }]}
        />
        {mode === 'signup' && (
          <Text style={[styles.hint, { color: muted }]}>
            Mínimo de 12 caracteres, com maiúscula, minúscula, número e símbolo.
          </Text>
        )}

        {!!error && <Text style={[styles.error, { color: danger }]}>{error}</Text>}

        <ActionButton
          label={submitting ? 'Enviando…' : mode === 'signup' ? 'Criar conta' : 'Entrar'}
          color={primary}
          onPress={handleSubmit}
          fullWidth
        />

        <View style={styles.linksRow}>
          <Pressable onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
            <Text style={{ color: primary }}>{mode === 'signup' ? 'Já tenho conta' : 'Criar conta'}</Text>
          </Pressable>
          {mode === 'signin' && (
            <Pressable onPress={handleForgotPassword}>
              <Text style={{ color: primary }}>Esqueci minha senha</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  card: { borderRadius: 14, borderWidth: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10 },
  hint: { fontSize: 12, marginBottom: 10 },
  error: { marginBottom: 10 },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
});
