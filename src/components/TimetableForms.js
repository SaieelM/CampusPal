// Modal forms used by the class timetable editor.
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { DAY_NAMES, minutes } from '../lib/dates';
import { subjectTitle } from '../lib/attendance';
import { useTheme } from '../lib/theme';
import { TimeField } from './PickerFields';
import { Button, Chip, ChipRow, Input, Label, Row, Stepper } from './ui';

function Sheet({ visible, title, onClose, children }) {
  const t = useTheme();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <Row style={{ justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '700' }}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={t.muted} />
          </Pressable>
        </Row>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function SubjectForm({ visible, initial, onSave, onDelete, onClose }) {
  const [s, setS] = useState(initial);
  const [error, setError] = useState('');
  const set = (k) => (v) => setS((x) => ({ ...x, [k]: v }));

  const save = () => {
    if (!s.name.trim()) return setError('Subject name is required.');
    onSave({
      ...s,
      name: s.name.trim(),
      code: (s.code || '').trim().toUpperCase(),
      professor: (s.professor || '').trim(),
      group: s.elective ? (s.group || '').trim() || s.name.trim() : '',
    });
  };

  return (
    <Sheet visible={visible} title={initial.name ? 'Edit subject' : 'Add subject'} onClose={onClose}>
      <Input label="Subject name" value={s.name} onChangeText={set('name')} error={error} />
      <Input label="Course code (optional)" autoCapitalize="characters" value={s.code} onChangeText={set('code')} />
      <Input label="Professor (optional)" value={s.professor} onChangeText={set('professor')} />
      <Label>Type</Label>
      <ChipRow>
        <Chip label="Theory" icon="book-outline" selected={s.type === 'theory'} onPress={() => set('type')('theory')} />
        <Chip label="Lab" icon="flask-outline" selected={s.type === 'lab'} onPress={() => set('type')('lab')} />
      </ChipRow>
      <Label>Is it an elective?</Label>
      <ChipRow>
        <Chip label="Compulsory" selected={!s.elective} onPress={() => set('elective')(false)} />
        <Chip label="Elective" selected={s.elective} onPress={() => set('elective')(true)} />
      </ChipRow>
      {s.elective ? (
        <Input
          label="Elective name"
          value={s.group}
          onChangeText={set('group')}
          hint="Give the theory and lab of the same elective the SAME name, so students pick them together."
        />
      ) : null}
      <Button title="Save subject" onPress={save} />
      {onDelete ? <Button title="Delete subject" variant="ghost" onPress={onDelete} style={{ marginTop: 8 }} /> : null}
    </Sheet>
  );
}

export function SlotForm({ visible, initial, subjects, batches, onSave, onDelete, onClose }) {
  const t = useTheme();
  const [s, setS] = useState(initial);
  const [error, setError] = useState('');
  const set = (k) => (v) => setS((x) => ({ ...x, [k]: v }));
  const isOther = s.subjectId === null;

  const save = () => {
    if (!isOther && !s.subjectId) return setError('Pick a subject.');
    if (isOther && !(s.label || '').trim()) return setError('Give this slot a name, e.g. Mentoring.');
    if (minutes(s.end) <= minutes(s.start)) return setError('End time must be after the start time.');
    onSave({ ...s, label: isOther ? s.label.trim() : '', room: (s.room || '').trim() });
  };

  return (
    <Sheet visible={visible} title={`${onDelete ? 'Edit' : 'Add'} slot · ${DAY_NAMES[s.day]}`} onClose={onClose}>
      <Label>What happens in this slot?</Label>
      <ChipRow>
        <Chip label="A subject lecture" selected={!isOther} onPress={() => set('subjectId')('')} />
        <Chip label="Other (not tracked)" selected={isOther} onPress={() => set('subjectId')(null)} />
      </ChipRow>

      {isOther ? (
        <Input label="Name" value={s.label} onChangeText={set('label')} />
      ) : (
        <>
          <Label>Subject</Label>
          <ChipRow>
            {subjects.length === 0 ? <Text style={{ color: t.muted }}>Add subjects first.</Text> : null}
            {subjects.map((sub) => (
              <Chip key={sub.id} label={subjectTitle(sub)} selected={s.subjectId === sub.id} onPress={() => set('subjectId')(sub.id)} />
            ))}
          </ChipRow>
        </>
      )}

      <Row style={{ gap: 10 }}>
        <TimeField label="Starts" value={s.start} onChange={set('start')} style={{ flex: 1 }} />
        <TimeField label="Ends" value={s.end} onChange={set('end')} style={{ flex: 1 }} />
      </Row>

      {!isOther ? (
        <>
          <Label>Counts as how many lectures?</Label>
          <View style={{ marginBottom: 14 }}>
            <Stepper value={s.count} onChange={set('count')} min={1} max={6} />
            <Text style={{ color: t.muted, fontSize: 13, marginTop: 4 }}>
              Use 2 if a 2-hour session is marked as two attendances.
            </Text>
          </View>
          {batches.length ? (
            <>
              <Label>Who attends?</Label>
              <ChipRow>
                <Chip label="Everyone" selected={!s.batch} onPress={() => set('batch')(null)} />
                {batches.map((b) => (
                  <Chip key={b} label={b} selected={s.batch === b} onPress={() => set('batch')(b)} />
                ))}
              </ChipRow>
            </>
          ) : null}
        </>
      ) : null}

      <Input label="Room (optional)" autoCapitalize="characters" value={s.room} onChangeText={set('room')} error={error} />
      <Button title="Save slot" onPress={save} />
      {onDelete ? <Button title="Delete slot" variant="ghost" onPress={onDelete} style={{ marginTop: 8 }} /> : null}
    </Sheet>
  );
}
