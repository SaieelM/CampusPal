// The student's own class membership: code, batch, electives, leave class.
import { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Banner, Body, Button, Card, Chip, ChipRow, Heading, Row, Screen, confirm, toast } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { leaveClass } from '../../lib/classes';
import { useClass } from '../../lib/ClassContext';
import { formatDate } from '../../lib/dates';
import { electiveGroups } from '../../lib/timetable';
import { useTheme } from '../../lib/theme';

export default function ClassSettings() {
  const t = useTheme();
  const { user } = useAuth();
  const { cls, membership, updateMembership, reload, syncFromServer } = useClass();
  const [changing, setChanging] = useState(false);
  const [batch, setBatch] = useState(membership?.batch || null);
  const [electives, setElectives] = useState(membership?.electives || []);

  if (!cls || !membership) {
    return (
      <Screen edges={[]}>
        <Body muted>You haven’t joined a class yet.</Body>
      </Screen>
    );
  }

  const groups = electiveGroups(cls);
  const isCreator = cls.createdBy === user.uid;

  const startChange = async () => {
    const ok = await confirm(
      'Change batch or electives?',
      'These are assigned by the college. Only change them if you selected the wrong ones when joining. Your past attendance is kept.',
      'I need to fix them'
    );
    if (ok) setChanging(true);
  };

  const saveChange = async () => {
    if (cls.batches?.length && !batch) return toast('Select your batch');
    await updateMembership({ ...membership, batch, electives });
    setChanging(false);
    toast('Updated');
  };

  const leave = async () => {
    const ok = await confirm('Leave this class?', 'Your attendance for this class will be deleted from this phone.', 'Leave', true);
    if (!ok) return;
    await leaveClass({ deleteAttendance: true });
    await reload();
    router.back();
  };

  return (
    <Screen edges={[]}>
      <Card style={{ backgroundColor: t.primarySoft, borderColor: t.primarySoft }}>
        <Text style={{ color: t.text, fontSize: 18, fontWeight: '700' }}>{cls.name}</Text>
        <Text style={{ color: t.muted }}>
          {cls.course} · Semester {cls.semester} · started {formatDate(cls.startDate, { withDay: false })}
        </Text>
        <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <View>
            <Text style={{ color: t.muted, fontSize: 13 }}>Class code</Text>
            <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', letterSpacing: 1 }}>{cls.code}</Text>
          </View>
          <Button
            small
            title="Invite"
            icon="share-social-outline"
            variant="outline"
            onPress={() => Share.share({ message: `Join "${cls.name}" on CampusPal.\nClass code: ${cls.code}` })}
          />
        </Row>
      </Card>

      <Heading>Your batch & electives</Heading>
      {!changing ? (
        <Card>
          <Text style={{ color: t.text }}>
            <Text style={{ fontWeight: '700' }}>Batch: </Text>
            {membership.batch || '—'}
          </Text>
          <Text style={{ color: t.text, marginTop: 4 }}>
            <Text style={{ fontWeight: '700' }}>Electives: </Text>
            {membership.electives?.length ? membership.electives.join(', ') : 'None'}
          </Text>
          <Button small title="Selected wrongly? Fix it" variant="ghost" onPress={startChange} style={{ alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 0 }} />
        </Card>
      ) : (
        <>
          <Banner status="warning">Only change these if they don’t match what the college assigned you.</Banner>
          {cls.batches?.length ? (
            <ChipRow>
              {cls.batches.map((b) => (
                <Chip key={b} label={b} selected={batch === b} onPress={() => setBatch(b)} />
              ))}
            </ChipRow>
          ) : null}
          <ChipRow>
            {groups.map((g) => (
              <Chip
                key={g.name}
                label={g.name}
                selected={electives.includes(g.name)}
                onPress={() => setElectives((l) => (l.includes(g.name) ? l.filter((x) => x !== g.name) : [...l, g.name]))}
              />
            ))}
          </ChipRow>
          <Row style={{ gap: 8 }}>
            <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setChanging(false)} />
            <Button title="Save" style={{ flex: 1 }} onPress={saveChange} />
          </Row>
        </>
      )}

      <Heading>Timetable</Heading>
      <Button
        title="Check for timetable updates"
        icon="refresh"
        variant="secondary"
        onPress={async () => toast((await syncFromServer()) ? 'Timetable updated' : 'Already up to date')}
      />
      {isCreator ? (
        <Button
          title="Edit timetable (you created this class)"
          icon="create-outline"
          variant="outline"
          style={{ marginTop: 10 }}
          onPress={() => router.push({ pathname: '/class/edit', params: { code: cls.code } })}
        />
      ) : (
        <Body muted style={{ marginTop: 8 }}>Only the class creator can edit the timetable.</Body>
      )}

      <Button title="Leave class" variant="ghost" onPress={leave} style={{ marginTop: 28 }} />
    </Screen>
  );
}
