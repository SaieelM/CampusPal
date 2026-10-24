import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { NoteCard } from '../../components/NoteCard';
import { Banner, Chip, ChipRow, EmptyState, Input, Loading, Row, Screen, Title, Button } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { NOTE_TYPES } from '../../lib/config';
import { cachedNotes, getDownloads, listNotes, noteScore, openPdf } from '../../lib/notes';
import { useTheme } from '../../lib/theme';

export default function Notes() {
  const t = useTheme();
  const { profile } = useAuth();
  const [tab, setTab] = useState('browse'); // browse | offline
  const [notes, setNotes] = useState(null);
  const [offline, setOffline] = useState(false);
  const [downloads, setDownloads] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState(profile?.semester || 'all');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('top');

  const load = useCallback(async () => {
    setDownloads(await getDownloads());
    try {
      setNotes(await listNotes(profile.course));
      setOffline(false);
    } catch {
      setNotes(await cachedNotes(profile.course));
      setOffline(true);
    }
  }, [profile.course]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const semesters = useMemo(() => {
    const set = new Set((notes || []).map((n) => n.semester));
    if (profile?.semester) set.add(profile.semester);
    return [...set].sort((a, b) => a - b);
  }, [notes, profile]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (notes || [])
      .filter((n) => semester === 'all' || n.semester === semester)
      .filter((n) => type === 'all' || n.type === type)
      .filter(
        (n) =>
          !q ||
          [n.title, n.subject, n.courseCode, n.professor, n.uploaderName].some((f) => (f || '').toLowerCase().includes(q))
      )
      .sort((a, b) => (sort === 'new' ? b.createdAt - a.createdAt : noteScore(b) - noteScore(a)));
  }, [notes, semester, type, search, sort]);

  const downloadedList = Object.values(downloads).sort((a, b) => b.savedAt - a.savedAt);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Screen refreshing={refreshing} onRefresh={onRefresh} contentStyle={{ paddingBottom: 100 }}>
        <Title>Notes & PYQs</Title>
        <Text style={{ color: t.muted, marginBottom: 12 }}>Shared by {profile.course} students · rated by your peers</Text>

        <ChipRow>
          <Chip label="Browse" icon="search" selected={tab === 'browse'} onPress={() => setTab('browse')} />
          <Chip label={`Downloaded (${downloadedList.length})`} icon="cloud-download-outline" selected={tab === 'offline'} onPress={() => setTab('offline')} />
        </ChipRow>

        {tab === 'offline' ? (
          downloadedList.length === 0 ? (
            <EmptyState icon="cloud-offline-outline" title="No downloads yet" message="Download notes to read them without internet." />
          ) : (
            downloadedList.map((d) => (
              <Pressable key={d.id} onPress={() => router.push(`/notes/${d.id}`)} onLongPress={() => openPdf(d.uri, d.title)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: t.border, marginBottom: 10 }}>
                  <Ionicons name="document" size={22} color={t.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: t.text, fontWeight: '700' }} numberOfLines={1}>{d.title}</Text>
                    <Text style={{ color: t.muted, fontSize: 13 }}>{d.type} · {d.subject}</Text>
                  </View>
                  <Button small title="Open" variant="secondary" onPress={() => openPdf(d.uri, d.title)} />
                </View>
              </Pressable>
            ))
          )
        ) : (
          <>
            {offline ? (
              <Banner status="warning" icon="cloud-offline-outline">
                You’re offline – showing the last loaded list. Your downloaded notes still open.
              </Banner>
            ) : null}
            <Input placeholder="Search notes" value={search} onChangeText={setSearch} style={{ marginBottom: 10 }} />
            <ChipRow style={{ marginBottom: 6 }}>
              <Chip label="All sems" selected={semester === 'all'} onPress={() => setSemester('all')} />
              {semesters.map((s) => (
                <Chip key={s} label={`Sem ${s}`} selected={semester === s} onPress={() => setSemester(s)} />
              ))}
            </ChipRow>
            <ChipRow style={{ marginBottom: 6 }}>
              <Chip label="All types" selected={type === 'all'} onPress={() => setType('all')} />
              {NOTE_TYPES.map((ty) => (
                <Chip key={ty} label={ty} selected={type === ty} onPress={() => setType(ty)} />
              ))}
            </ChipRow>
            <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: t.muted }}>{visible.length} result{visible.length === 1 ? '' : 's'}</Text>
              <Pressable onPress={() => setSort(sort === 'top' ? 'new' : 'top')} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="swap-vertical" size={16} color={t.primary} />
                <Text style={{ color: t.primary, fontWeight: '600', marginLeft: 4 }}>{sort === 'top' ? 'Top rated' : 'Newest'}</Text>
              </Pressable>
            </Row>

            {notes === null ? (
              <Loading />
            ) : visible.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title={notes.length ? 'No matching notes' : 'No notes yet'}
                message={notes.length ? 'Try another filter or search.' : 'Be the first to upload notes for your class!'}
              />
            ) : (
              visible.map((n) => <NoteCard key={n.id} note={n} downloaded={Boolean(downloads[n.id])} onPress={() => router.push(`/notes/${n.id}`)} />)
            )}
          </>
        )}
      </Screen>

      <Pressable
        onPress={() => router.push('/notes/upload')}
        accessibilityLabel="Upload notes"
        style={({ pressed }) => ({
          position: 'absolute',
          right: 20,
          bottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: t.primary,
          paddingHorizontal: 20,
          height: 56,
          borderRadius: 28,
          elevation: 4,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="cloud-upload" size={22} color={t.primaryText} />
        <Text style={{ color: t.primaryText, fontWeight: '700', fontSize: 16, marginLeft: 8 }}>Upload</Text>
      </Pressable>
    </View>
  );
}
