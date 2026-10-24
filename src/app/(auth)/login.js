import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Body, Button, Input, Screen, Title, toast } from '../../components/ui';
import { friendlyAuthError, useAuth } from '../../lib/auth';
import { ALLOWED_EMAIL_DOMAIN } from '../../lib/config';
import { useTheme } from '../../lib/theme';

export default function Login() {
  const t = useTheme();
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      await signIn({ email, password });
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return setError('Type your email above, then tap "Forgot password".');
    try {
      await resetPassword(email);
      toast('Password reset email sent');
    } catch (e) {
      setError(friendlyAuthError(e));
    }
  };

  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ paddingTop: 48 }}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="school" size={40} color={t.primaryText} />
        </View>
        <Title style={{ marginTop: 14 }}>CampusPal</Title>
        <Body muted>Stay eligible. Stay prepared.</Body>
      </View>

      <Input
        label="College email"
        placeholder={`yourname@${ALLOWED_EMAIL_DOMAIN}`}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        label="Password"
        placeholder="Your password"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
        error={error}
      />
      <Button title="Log in" onPress={submit} loading={busy} />
      <Button title="Forgot password?" variant="ghost" onPress={forgot} style={{ marginTop: 6 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
        <Text style={{ color: t.muted, fontSize: 15 }}>New here? </Text>
        <Link href="/signup" style={{ color: t.primary, fontWeight: '700', fontSize: 15 }}>
          Create an account
        </Link>
      </View>
    </Screen>
  );
}
