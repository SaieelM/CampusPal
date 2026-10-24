import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Banner, Body, Button, Card, Chip, ChipRow, Heading, Input, Label, Screen, confirm, toast } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { fetchClass, normaliseCode, recordMember } from '../../lib/classes';
import { useClass } from '../../lib/ClassContext';
import { formatDate, todayStr } from '../../lib/dates';
import { setupNotifications } from '../../lib/notifications';
import { electiveGroups } from '../../lib/timetable';
import { useTheme } from '../../lib/theme';

export default function JoinClass() {
  const t = useTheme();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { joinClass } = useClass();
  const [code, setCode] = useState(params.code ? String(params.code) : '');
  const [found, setFound] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState(null);
  const [electives, setElectives] = useState([]);

  const find = async (value = code) => {
    setError('');
    setFound(null);
    if (!normaliseCode(value)) return setError('Enter the class code shared by your CR.');
    setBusy(true);
    try {
      const cls = await fetchClass(value);
      if (!cls) setError('No class found with this code. Check for typos.');
      else setFound(cls);
    } catch {
      setError('Could not reach the server. Check your internet connection.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads async data on mount
    if (params.code) find(String(params.code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = found ? electiveGroups(found) : [];
  const toggleElective = (g) => setElectives((list) => (list.includes(g) ? list.filter((x) => x !== g) : [...list, g]));

  const submit = async () => {
    if (found.batches?.length && !batch) return toast('Select the batch the college assigned you');
    const chosen = groups.filter((g) => electives.includes(g.name)).map((g) => g.name);
    const summary = [
      found.batches?.length ? `Batch: ${batch}` : null,
      `Electives: ${chosen.length ? chosen.join(', ') : 'none'}`,
    ]
      .filter(Boolean)
      .join('\n');
    const ok = await confirm(
      'Confirm your batch & electives',
      `${summary}\n\nThese are assigned by the college and will be locked. Make sure they're correct.`,
      'Join class'
    );
    if (!ok) return;
    setBusy(true);
    try {
      await setupNotifications();
      const m = { code: found.code, batch: batch || null, electives: chosen, joinedAt: todayStr() };
      await joinClass(found, m);
      await recordMember(found.code, user, m);
      toast(`Joined ${found.name}`);
      router.dismissTo('/attendance');
      if (found.startDate < todayStr()) router.push('/class/catchup');
    } catch (e) {
      toast(e.message || 'Could not join the class');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      <Body muted style={{ marginBottom: 16 }}>
        Enter the code your class representative shared. Your timetable will be set up automatically.
      </Body>
      <Input
        label="Class code"
        placeholder="MCA3-7KQ2"
        autoCapitalize="characters"
        value={code}
        onChangeText={(v) => {
          setCode(v);
          setFound(null);
        }}
        error={error}
        onSubmitEditing={() => find()}
      />
      {!found ? <Button title="Find class" onPress={() => find()} loading={busy} /> : null}

      {found ? (
        <>
          <Card style={{ backgroundColor: t.primarySoft, borderColor: t.primarySoft }}>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '700' }}>{found.name}</Text>
            <Text style={{ color: t.muted, marginTop: 2 }}>
              {found.course} · Semester {found.semester} · {found.subjects?.length || 0} subjects
            </Text>
            <Text style={{ color: t.muted }}>Semester started {formatDate(found.startDate)}</Text>
          </Card>

          <Banner status="none" icon="lock-closed-outline">
            Batch and electives are assigned by the college. They are locked after you join.
          </Banner>

          {found.batches?.length ? (
            <>
              <Heading>Your assigned batch</Heading>
              <ChipRow>
                {found.batches.map((b) => (
                  <Chip key={b} label={b} selected={batch === b} onPress={() => setBatch(b)} />
                ))}
              </ChipRow>
            </>
          ) : null}

          {groups.length ? (
            <>
              <Heading>Your electives</Heading>
              <Label>Select every elective you are enrolled in</Label>
              {groups.map((g) => {
                const selected = electives.includes(g.name);
                return (
                  <Card
                    key={g.name}
                    onPress={() => toggleElective(g.name)}
                    style={{ borderColor: selected ? t.primary : t.border, borderWidth: selected ? 2 : 1, paddingVertical: 12 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: selected ? t.primary : t.disabled,
                          backgroundColor: selected ? t.primary : 'transparent',
                          marginRight: 10,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: t.text, fontWeight: '600', fontSize: 15 }}>{g.name}</Text>
                        <Text style={{ color: t.muted, fontSize: 13 }}>
                          {g.subjects.map((s) => (s.type === 'lab' ? 'Lab' : 'Theory')).join(' + ')}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </>
          ) : null}

          <Button title="Join class" onPress={submit} loading={busy} style={{ marginTop: 12 }} />
          <Button title="Use a different code" variant="ghost" onPress={() => setFound(null)} style={{ marginTop: 6 }} />
        </>
      ) : null}
    </Screen>
  );
}
