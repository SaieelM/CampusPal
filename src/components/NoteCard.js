import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { avgRating } from '../lib/notes';
import { useTheme } from '../lib/theme';
import { Card } from './ui';

const TYPE_ICON = { Notes: 'document-text', PYQ: 'help-circle', 'Lab Manual': 'flask', Assignment: 'clipboard' };

export function NoteCard({ note, onPress, downloaded }) {
  const t = useTheme();
  const rating = avgRating(note);
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: t.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Ionicons name={TYPE_ICON[note.type] || 'document'} size={24} color={t.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontWeight: '700', fontSize: 15 }} numberOfLines={2}>
          {note.title}
        </Text>
        <Text style={{ color: t.muted, fontSize: 13 }} numberOfLines={1}>
          {note.type} · {note.subject} · Sem {note.semester}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 }}>
          <Meta icon="arrow-up-circle" text={note.upvotes || 0} />
          <Meta icon="star" text={rating ? `${rating.toFixed(1)} (${note.ratingCount})` : '–'} color="#E5A800" />
          <Meta icon="download-outline" text={note.downloads || 0} />
          {downloaded ? <Meta icon="checkmark-circle" text="Offline" color={t.safe} /> : null}
        </View>
      </View>
    </Card>
  );
}

function Meta({ icon, text, color }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name={icon} size={14} color={color || t.muted} />
      <Text style={{ color: t.muted, fontSize: 12, marginLeft: 3 }}>{text}</Text>
    </View>
  );
}
