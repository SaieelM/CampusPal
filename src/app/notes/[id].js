// Note details: open/download, upvote, rate, report, delete (own uploads).
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Banner, Body, Button, Card, EmptyState, Heading, Loading, Row, Screen, confirm, toast } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { formatDate, toDateStr } from '../../lib/dates';
import {
  avgRating,
  deleteNote,
  downloadNote,
  getDownloads,
  getMyVote,
  getNote,
  isDownloaded,
  openPdf,
  removeDownload,
  reportNote,
  vote,
} from '../../lib/notes';
import { useTheme } from '../../lib/theme';

const REPORT_REASONS = ['Wrong subject / mislabelled', 'Blurry or unreadable', 'Spam or inappropriate'];

export default function NoteDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [note, setNote] = useState(undefined);
  const [myVote, setMyVote] = useState({ upvoted: false, stars: 0 });
  const [local, setLocal] = useState(null);
  const [busy, setBusy] = useState(null);
  const [offline, setOffline] = useState(false);
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    setLocal(await isDownloaded(id));
    try {
      const [n, v] = await Promise.all([getNote(id), getMyVote(id, user.uid)]);
      // Notes hidden after reports are only visible to the person who uploaded them.
      setNote(n && n.hidden && n.uploadedBy !== user.uid ? null : n);
      setMyVote(v);
      setOffline(false);
    } catch {
      // Offline: show what we know from the downloaded copy.
      const d = (await getDownloads())[id];
      setNote(d ? { ...d, offlineOnly: true } : null);
      setOffline(true);
    }
  }, [id, user.uid]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads async data on mount
    load();
  }, [load]);

  if (note === undefined) return <Loading />;
  if (note === null) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="document-outline" title="Note not available" message="It may have been removed or hidden after reports." />
      </Screen>
    );
  }

  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast(e.message || 'Something went wrong. Check your internet.');
    } finally {
      setBusy(null);
    }
  };

  const download = () =>
    run('download', async () => {
      const entry = await downloadNote(note);
      setLocal(entry);
      toast('Saved for offline reading');
      await openPdf(entry.uri, note.title);
    });

  const changeVote = (patch) =>
    run('vote', async () => {
      // Optimistic update so the tap feels instant.
      const prev = myVote;
      const next = { ...myVote, ...patch };
      setMyVote(next);
      setNote((n) => ({
        ...n,
        upvotes: (n.upvotes || 0) + (next.upvoted ? 1 : 0) - (prev.upvoted ? 1 : 0),
        ratingSum: (n.ratingSum || 0) + next.stars - prev.stars,
        ratingCount: (n.ratingCount || 0) + (next.stars ? 1 : 0) - (prev.stars ? 1 : 0),
      }));
      try {
        await vote(note.id, user.uid, patch);
      } catch (e) {
        setMyVote(prev);
        load();
        throw e;
      }
    });

  const report = (reason) =>
    run('report', async () => {
      setReporting(false);
      const res = await reportNote(note.id, user.uid, reason);
      toast(res === 'already' ? 'You already reported this' : 'Thanks – reported for review');
    });

  const remove = async () => {
    if (!(await confirm('Delete this upload?', 'Students will no longer see it.', 'Delete', true))) return;
    run('delete', async () => {
      await deleteNote(note);
      toast('Deleted');
      router.back();
    });
  };

  const mine = note.uploadedBy === user.uid;
  const rating = avgRating(note);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: note.type || 'Notes' }} />
      {offline ? (
        <Banner status="warning" icon="cloud-offline-outline">
          You’re offline. You can still open your downloaded copy.
        </Banner>
      ) : null}

      <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>{note.title}</Text>
      <Body muted style={{ marginTop: 4 }}>
        {[note.subject, note.courseCode, `Semester ${note.semester}`].filter(Boolean).join(' · ')}
      </Body>
      {!note.offlineOnly ? (
        <Body muted style={{ fontSize: 13, marginTop: 2 }}>
          {note.professor ? `Prof. ${note.professor} · ` : ''}Uploaded by {note.uploaderName} on {formatDate(toDateStr(new Date(note.createdAt)), { withDay: false })}
          {note.pages ? ` · ${note.pages} pages` : ''}
        </Body>
      ) : null}

      <View style={{ marginTop: 16, gap: 10 }}>
        {local ? (
          <>
            <Button title="Open" icon="book-outline" onPress={() => openPdf(local.uri, note.title)} />
            <Button
              title="Remove download"
              variant="ghost"
              small
              onPress={async () => {
                await removeDownload(note.id);
                setLocal(null);
              }}
            />
          </>
        ) : (
          <Button title="Download & open" icon="cloud-download-outline" onPress={download} loading={busy === 'download'} disabled={offline} />
        )}
        {!note.offlineOnly && note.fileUrl ? (
          <Button title="View online" icon="open-outline" variant="secondary" onPress={() => Linking.openURL(note.fileUrl)} disabled={offline} />
        ) : null}
      </View>

      {!note.offlineOnly ? (
        <>
          <Heading>Was this helpful?</Heading>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Pressable
                onPress={() => changeVote({ upvoted: !myVote.upvoted })}
                disabled={offline}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                accessibilityLabel="Upvote"
              >
                <Ionicons name={myVote.upvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'} size={32} color={myVote.upvoted ? t.primary : t.muted} />
                <Text style={{ color: t.text, fontWeight: '700', fontSize: 16, marginLeft: 6 }}>{note.upvotes || 0}</Text>
              </Pressable>
              <Text style={{ color: t.muted }}>
                {rating ? `★ ${rating.toFixed(1)} from ${note.ratingCount}` : 'No ratings yet'} · {note.downloads || 0} downloads
              </Text>
            </Row>
            <Text style={{ color: t.muted, marginTop: 10, marginBottom: 4 }}>Your rating</Text>
            <Row style={{ gap: 6 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} onPress={() => changeVote({ stars: myVote.stars === s ? 0 : s })} disabled={offline} hitSlop={6} accessibilityLabel={`${s} stars`}>
                  <Ionicons name={s <= myVote.stars ? 'star' : 'star-outline'} size={32} color="#E5A800" />
                </Pressable>
              ))}
            </Row>
          </Card>

          {mine ? (
            <Button title="Delete my upload" icon="trash-outline" variant="ghost" onPress={remove} loading={busy === 'delete'} />
          ) : reporting ? (
            <Card>
              <Text style={{ color: t.text, fontWeight: '700', marginBottom: 8 }}>What’s wrong?</Text>
              {REPORT_REASONS.map((r) => (
                <Button key={r} title={r} variant="secondary" small onPress={() => report(r)} style={{ marginBottom: 8 }} />
              ))}
              <Button title="Cancel" variant="ghost" small onPress={() => setReporting(false)} />
            </Card>
          ) : (
            <Button title="Report a problem" icon="flag-outline" variant="ghost" onPress={() => setReporting(true)} disabled={offline} />
          )}
        </>
      ) : null}
    </Screen>
  );
}
