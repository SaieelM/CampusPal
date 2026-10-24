import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Body, Button, Screen, Title, toast } from '../components/ui';
import { friendlyAuthError, useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

export default function VerifyEmail() {
  const t = useTheme();
  const { user, refreshUser, resendVerification, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  // Re-check automatically when the student comes back from their mail app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshUser().catch(() => {});
    });
    return () => sub.remove();
  }, [refreshUser]);

  const check = async () => {
    setBusy(true);
    try {
      const ok = await refreshUser();
      if (!ok) toast('Not verified yet – open the link in your email');
    } catch (e) {
      toast(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await resendVerification();
      toast('Verification email sent again');
    } catch (e) {
      toast(friendlyAuthError(e));
    }
  };

  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ paddingTop: 64 }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Ionicons name="mail-unread-outline" size={64} color={t.primary} />
      </View>
      <Title style={{ textAlign: 'center' }}>Verify your email</Title>
      <Body muted style={{ textAlign: 'center', marginBottom: 28 }}>
        We sent a link to{'\n'}
        <Body style={{ fontWeight: '700' }}>{user?.email}</Body>
        {'\n'}Open it, then come back here. Check your spam folder if you can’t find it.
      </Body>
      <Button title="I've verified – continue" onPress={check} loading={busy} />
      <Button title="Resend email" variant="secondary" onPress={resend} style={{ marginTop: 10 }} />
      <Button title="Use a different account" variant="ghost" onPress={signOut} style={{ marginTop: 10 }} />
    </Screen>
  );
}
