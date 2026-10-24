// Add a lecture that isn't on the timetable (make-up class, extra lab, …).
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { DateField, TimeField } from '../../components/PickerFields';
import { Button, Chip, ChipRow, Label, Row, Screen, Stepper, toast } from '../../components/ui';
import { subjectTitle } from '../../lib/attendance';
import { useClass } from '../../lib/ClassContext';
import { minutes, todayStr } from '../../lib/dates';
import { mySubjects, newId } from '../../lib/timetable';
import { useMarking } from '../../lib/useMarking';

export default function ExtraLecture() {
  const params = useLocalSearchParams();
  const { cls, membership } = useClass();
  const { mark } = useMarking();
  const subjects = mySubjects(cls, membership);
  const [date, setDate] = useState(params.date ? String(params.date) : todayStr());
  const [subjectId, setSubjectId] = useState(null);
  const [start, setStart] = useState('17:00');
  const [end, setEnd] = useState('18:00');
  const [count, setCount] = useState(1);
  const [status, setStatus] = useState('present');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!subjectId) return toast('Pick a subject');
    if (date > todayStr()) return toast('You can add it once the lecture has happened');
    if (date < cls.startDate) return toast('That date is before the semester started');
    if (minutes(end) <= minutes(start)) return toast('End time must be after the start time');
    setBusy(true);
    try {
      const subject = subjects.find((s) => s.id === subjectId);
      await mark({ key: newId('extra'), date, subject, count, extra: true, start, end }, status);
      toast('Extra lecture added');
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Label>Subject</Label>
      <ChipRow>
        {subjects.map((s) => (
          <Chip key={s.id} label={subjectTitle(s)} selected={subjectId === s.id} onPress={() => setSubjectId(s.id)} />
        ))}
      </ChipRow>
      <DateField label="Date" value={date} onChange={setDate} />
      <Row style={{ gap: 10 }}>
        <TimeField label="Starts" value={start} onChange={setStart} style={{ flex: 1 }} />
        <TimeField label="Ends" value={end} onChange={setEnd} style={{ flex: 1 }} />
      </Row>
      <Label>Counts as</Label>
      <Row style={{ marginBottom: 14 }}>
        <Stepper value={count} onChange={setCount} min={1} max={6} />
      </Row>
      <Label>Your attendance</Label>
      <ChipRow>
        <Chip label="Present" icon="checkmark-circle" selected={status === 'present'} onPress={() => setStatus('present')} />
        <Chip label="Absent" icon="close-circle" selected={status === 'absent'} onPress={() => setStatus('absent')} />
      </ChipRow>
      <Button title="Add lecture" onPress={save} loading={busy} />
    </Screen>
  );
}
