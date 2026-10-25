import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';

import { Body, Button, Input, Screen, Title } from '../../components/ui';
import { friendlyAuthError, isCollegeEmail, useAuth } from '../../lib/auth';
import { ALLOWED_EMAIL_DOMAIN } from '../../lib/config';
import { useTheme } from '../../lib/theme';

export default function Signup() {
  const t = useTheme();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Enter your name.';
    if (!isCollegeEmail(form.email)) e.email = `Use your college email ending with @${ALLOWED_EMAIL_DOMAIN}.`;
    if (form.password.length < 6) e.password = 'At least 6 characters.';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await signUp(form);
      // Navigation to the "verify your email" screen happens automatically.
    } catch (err) {
      setErrors({ confirm: friendlyAuthError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ paddingTop: 32 }}>
      <Title>Create your account</Title>
      <Body muted style={{ marginBottom: 20 }}>
        Only students with a Goa University email can join.
      </Body>
      <Input label="Full name" value={form.name} onChangeText={set('name')} error={errors.name} autoComplete="name" />
      <Input
        label="College email"
        placeholder={`mca2025.0000.name@${ALLOWED_EMAIL_DOMAIN}`}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={form.email}
        onChangeText={set('email')}
        error={errors.email}
      />
      <Input label="Password" secureTextEntry value={form.password} onChangeText={set('password')} error={errors.password} hint="At least 6 characters" />
      <Input label="Confirm password" secureTextEntry value={form.confirm} onChangeText={set('confirm')} error={errors.confirm} onSubmitEditing={submit} />
      <Button title="Sign up" onPress={submit} loading={busy} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
        <Text style={{ color: t.muted, fontSize: 15 }}>Already have an account? </Text>
        <Link href="/login" style={{ color: t.primary, fontWeight: '700', fontSize: 15 }}>
          Log in
        </Link>
      </View>
    </Screen>
  );
}
