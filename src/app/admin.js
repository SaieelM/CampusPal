// Admin tools: demo data, all classes (with delete), reported notes, feedback.
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { Banner, Body, Button, Card, EmptyState, Heading, Loading, Row, Screen, confirm, toast } from '../components/ui';
import { isAdminEmail } from '../lib/admins';
import { useAuth } from '../lib/auth';
import { deleteClass, leaveClass, listAllClasses, memberCount, recordMember } from '../lib/classes';
import { useClass } from '../lib/ClassContext';
import { isCloudinaryConfigured } from '../lib/config';
import { formatDate, toDateStr, todayStr } from '../lib/dates';
import { createDemoNotes, demoNotesExist, ensureDemoClasses, generateDemoAttendance } from '../lib/demo';
import { deleteNote, listFeedback, listReportedNotes, restoreNote } from '../lib/notes';
import { useTheme } from '../lib/theme';

const fmtMillis = (ms) => (ms ? formatDate(toDateStr(new Date(ms)), { withDay: false }) : '—');

export default function Admin() {
  const t = useTheme();
  const { user } = useAuth();
  const { joinClass, membership, reload } = useClass();
  const [classes, setClasses] = useState(null);
  const [counts, setCounts] = useState({});
  const [reported, setReported] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [demoStage, setDemoStage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const admin = isAdminEmail(user?.email);

  const load = useCallback(async () => {
    setError('');
    try {
      const [c, r, f] = await Promise.all([listAllClasses(), listReportedNotes(), listFeedback()]);
      setClasses(c);
      setReported(r);
      setFeedback(f);
      const entries = await Promise.all(c.map(async (x) => [x.code, await memberCount(x.code)]));
      setCounts(Object.fromEntries(entries));
    } catch (e) {
      setError(
        e?.code === 'permission-denied'
          ? 'Permission denied. Add your email to adminEmails() in firestore.rules and publish the rules.'
          : 'Could not load. Check your internet connection.'
      );
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads async data on mount
    if (admin) load();
  }, [admin, load]);

  if (!admin) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="lock-closed-outline" title="Admins only" message="Your account isn't on the admin list." />
      </Screen>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loadDemo = async () => {
    const ok = await confirm(
      'Load demo data?',
      'Creates the MCA Sem III and Sem I demo classes and demo notes, and switches THIS phone to the Sem III demo class with attendance history since 10 Aug.',
      'Load demo'
    );
    if (!ok) return;
    try {
      setDemoStage('Creating demo classes…');
      const { sem3 } = await ensureDemoClasses(user.uid);

      setDemoStage('Generating attendance history…');
      const { membership: m } = await generateDemoAttendance(sem3);
      const full = { ...m, joinedAt: todayStr() };
      await joinClass(sem3, full);
      await recordMember(sem3.code, user, full);

      if (!isCloudinaryConfigured) {
        toast('Demo classes ready. Notes skipped: Cloudinary is not configured.');
      } else if (await demoNotesExist()) {
        toast('Demo data ready (demo notes already existed)');
      } else {
        await createDemoNotes(user, (done, total) => setDemoStage(`Uploading demo notes ${done}/${total}…`));
        toast('Demo data ready');
      }
      await load();
    } catch (e) {
      toast(e?.message || 'Could not load demo data');
    } finally {
      setDemoStage('');
    }
  };

  const removeClass = async (c) => {
    const n = counts[c.code];
    const ok = await confirm(
      `Delete "${c.name}"?`,
      `${n ? `${n} student${n === 1 ? ' has' : 's have'} joined it. ` : ''}Students keep the attendance on their phones but will be asked to join another class. This can't be undone.`,
      'Delete',
      true
    );
    if (!ok) return;
    setBusyId(c.code);
    try {
      await deleteClass(c);
      if (membership?.code === c.code) {
        await leaveClass({ deleteAttendance: true });
        await reload();
      }
      setClasses((list) => list.filter((x) => x.code !== c.code));
      toast('Class deleted');
    } catch (e) {
      toast(e?.code === 'permission-denied' ? 'Permission denied – check the admin list in firestore.rules' : 'Could not delete');
    } finally {
      setBusyId(null);
    }
  };

  const restore = async (n) => {
    setBusyId(n.id);
    try {
      await restoreNote(n.id);
      setReported((list) => list.filter((x) => x.id !== n.id));
      toast('Note restored');
    } finally {
      setBusyId(null);
    }
  };

  const removeNote = async (n) => {
    if (!(await confirm('Delete this note?', n.title, 'Delete', true))) return;
    setBusyId(n.id);
    try {
      await deleteNote(n);
      setReported((list) => list.filter((x) => x.id !== n.id));
      toast('Note deleted');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen edges={[]} refreshing={refreshing} onRefresh={onRefresh}>
      {error ? <Banner status="danger">{error}</Banner> : null}

      <Heading>Demo data</Heading>
      <Card>
        <Body>Two demo classes from the GBS timetable, attendance history on this phone and six demo notes.</Body>
        {demoStage ? <Text style={{ color: t.primary, marginTop: 8, fontWeight: '600' }}>{demoStage}</Text> : null}
        <Button title="Load demo data" icon="flash-outline" onPress={loadDemo} loading={Boolean(demoStage)} style={{ marginTop: 10 }} />
      </Card>

      <Heading>{`All classes${classes ? ` (${classes.length})` : ''}`}</Heading>
      {classes === null && !error ? <Loading /> : null}
      {classes?.length === 0 ? <Body muted>No classes yet.</Body> : null}
      {classes?.map((c) => (
        <Card key={c.code}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ color: t.text, fontWeight: '700', fontSize: 15 }}>{c.name}</Text>
              <Text style={{ color: t.muted, fontSize: 13 }}>
                {c.code} · {c.course} Sem {c.semester} · {counts[c.code] ?? '…'} joined
              </Text>
              <Text style={{ color: t.muted, fontSize: 12 }}>
                Created {fmtMillis(c.createdAt)} · Updated {fmtMillis(c.updatedAt)}
                {c.createdBy === user.uid ? ' · by you' : ''}
              </Text>
            </View>
            <Button small variant="ghost" title="Delete" icon="trash-outline" loading={busyId === c.code} onPress={() => removeClass(c)} />
          </Row>
        </Card>
      ))}

      <Heading>{`Reported notes${reported ? ` (${reported.length})` : ''}`}</Heading>
      {reported?.length === 0 ? <Body muted>Nothing reported.</Body> : null}
      {reported?.map((n) => (
        <Card key={n.id}>
          <Text style={{ color: t.text, fontWeight: '700' }} onPress={() => router.push(`/notes/${n.id}`)}>
            {n.title}
          </Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>
            {n.subject} · {n.reports} report{n.reports === 1 ? '' : 's'}
            {n.hidden ? ' · hidden' : ''}
          </Text>
          <Row style={{ gap: 8, marginTop: 8 }}>
            <Button small variant="secondary" title="Restore" style={{ flex: 1 }} loading={busyId === n.id} onPress={() => restore(n)} />
            <Button small variant="ghost" title="Delete" style={{ flex: 1 }} onPress={() => removeNote(n)} />
          </Row>
        </Card>
      ))}

      <Heading>{`Feedback${feedback ? ` (${feedback.length})` : ''}`}</Heading>
      {feedback?.length === 0 ? <Body muted>No feedback yet.</Body> : null}
      {feedback?.map((f) => (
        <Card key={f.id}>
          <Text style={{ color: t.muted, fontSize: 12 }}>
            {f.type} · {f.email} · {fmtMillis(f.createdAt)}
          </Text>
          <Text style={{ color: t.text, marginTop: 4 }}>{f.message}</Text>
        </Card>
      ))}
    </Screen>
  );
}
