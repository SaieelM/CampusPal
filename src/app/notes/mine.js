import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';

import { NoteCard } from '../../components/NoteCard';
import { Button, EmptyState, Loading, Screen, Body } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { myUploads } from '../../lib/notes';

export default function MyUploads() {
  const { user } = useAuth();
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      myUploads(user.uid)
        .then((n) => {
          setNotes(n);
          setError(false);
        })
        .catch(() => setError(true));
    }, [user.uid])
  );

  if (error) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="cloud-offline-outline" title="Can't load your uploads" message="Check your internet connection." />
      </Screen>
    );
  }
  if (!notes) return <Loading />;

  const totalUp = notes.reduce((n, x) => n + (x.upvotes || 0), 0);
  const totalDl = notes.reduce((n, x) => n + (x.downloads || 0), 0);

  return (
    <Screen edges={[]}>
      {notes.length === 0 ? (
        <EmptyState icon="cloud-upload-outline" title="No uploads yet" message="Share your notes and help your juniors.">
          <Button title="Upload notes" icon="cloud-upload" onPress={() => router.push('/notes/upload')} />
        </EmptyState>
      ) : (
        <>
          <Body muted style={{ marginBottom: 12 }}>
            {notes.length} upload{notes.length === 1 ? '' : 's'} · {totalUp} upvotes · {totalDl} downloads
          </Body>
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} onPress={() => router.push(`/notes/${n.id}`)} />
          ))}
        </>
      )}
    </Screen>
  );
}
