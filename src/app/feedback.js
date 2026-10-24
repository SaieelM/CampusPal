import { useState } from 'react';
import { router } from 'expo-router';

import { Body, Button, Chip, ChipRow, Input, Label, Screen, toast } from '../components/ui';
import { useAuth } from '../lib/auth';
import { sendFeedback } from '../lib/notes';

const TYPES = [
  { key: 'bug', label: '🐞 Bug' },
  { key: 'feature', label: '💡 Feature idea' },
  { key: 'other', label: '💬 Other' },
];

export default function Feedback() {
  const { user } = useAuth();
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (message.trim().length < 5) return setError('Tell us a little more.');
    setBusy(true);
    try {
      await sendFeedback(user, { type, message });
      toast('Thanks! We read every message.');
      router.back();
    } catch {
      setError('Could not send. Check your internet connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Body muted style={{ marginBottom: 14 }}>Found a problem or have an idea? It goes straight to the CampusPal team.</Body>
      <Label>Type</Label>
      <ChipRow>
        {TYPES.map((t) => (
          <Chip key={t.key} label={t.label} selected={type === t.key} onPress={() => setType(t.key)} />
        ))}
      </ChipRow>
      <Input
        label="Message"
        multiline
        value={message}
        onChangeText={(v) => {
          setMessage(v);
          setError('');
        }}
        error={error}
      />
      <Button title="Send" icon="send" onPress={submit} loading={busy} />
    </Screen>
  );
}
