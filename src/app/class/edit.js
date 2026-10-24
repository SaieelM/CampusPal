// Create or edit a shared class timetable (used by the CR / class creator).
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { DateField } from '../../components/PickerFields';
import { SlotForm, SubjectForm } from '../../components/TimetableForms';
import { Banner, Body, Button, Card, Chip, ChipRow, Heading, Input, Loading, Row, Screen, confirm, toast } from '../../components/ui';
import { subjectTitle } from '../../lib/attendance';
import { isAdminEmail } from '../../lib/admins';
import { useAuth } from '../../lib/auth';
import { DuplicateNameError, createClass, fetchClass, updateClass } from '../../lib/classes';
import { useClass } from '../../lib/ClassContext';
import { DAY_SHORT, formatTime, isValidDateStr, minutes, todayStr } from '../../lib/dates';
import { MCA_SEM1_SAMPLE, MCA_SEM3_SAMPLE } from '../../lib/sampleTimetable';
import { latestVersion, newId } from '../../lib/timetable';
import { useTheme } from '../../lib/theme';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function currentAcademicYear() {
  const d = new Date();
  const y = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

/** e.g. "MCA Sem III – 2026-27" – a consistent format keeps class names unique. */
function suggestedName(course, semester, academicYear) {
  if (!course || !semester) return '';
  return `${course.toUpperCase()} Sem ${ROMAN[Number(semester)] || semester} – ${academicYear}`;
}

const EMPTY = {
  name: '',
  course: '',
  semester: '',
  academicYear: '',
  startDate: todayStr(),
  endDate: '',
  batches: [],
  subjects: [],
  slots: [],
};

export default function EditClass() {
  const t = useTheme();
  const { code } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { cls: joined, membership, setLocalClass } = useClass();
  const editing = Boolean(code);

  const [form, setForm] = useState(() => {
    const course = profile?.course || '';
    const semester = String(profile?.semester || '');
    const academicYear = currentAcademicYear();
    return { ...EMPTY, course, semester, academicYear, name: suggestedName(course, semester, academicYear) };
  });
  const admin = isAdminEmail(user?.email);
  const [original, setOriginal] = useState(null);
  const [effectiveFrom, setEffectiveFrom] = useState(todayStr());
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [day, setDay] = useState(1);
  const [batchInput, setBatchInput] = useState('');
  const [subjectModal, setSubjectModal] = useState(null); // { initial, index }
  const [slotModal, setSlotModal] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!editing) return;
    fetchClass(String(code))
      .then((c) => {
        if (!c) throw new Error('Class not found');
        setOriginal(c);
        const v = latestVersion(c);
        setForm({
          name: c.name,
          course: c.course,
          semester: String(c.semester),
          academicYear: c.academicYear || '',
          startDate: c.startDate,
          endDate: c.endDate || '',
          batches: c.batches || [],
          subjects: c.subjects || [],
          slots: v?.slots || [],
        });
        setEffectiveFrom(todayStr() < c.startDate ? c.startDate : todayStr());
      })
      .catch(() => {
        toast('Could not load the class. Check your internet.');
        router.back();
      })
      .finally(() => setLoading(false));
  }, [code, editing]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const subjectsById = useMemo(() => Object.fromEntries(form.subjects.map((s) => [s.id, s])), [form.subjects]);
  const daySlots = form.slots.filter((s) => s.day === day).sort((a, b) => minutes(a.start) - minutes(b.start));

  if (loading) return <Loading />;
  if (editing && original && original.createdBy !== user.uid) {
    return (
      <Screen edges={[]}>
        <Banner status="none" icon="lock-closed-outline" title="Only the class creator can edit">
          Ask your class representative to update the timetable. Pull down on the Attendance tab to get their changes.
        </Banner>
      </Screen>
    );
  }

  const loadSample = async (s) => {
    if (form.subjects.length && !(await confirm('Replace current entries?', `This will load the ${s.name} timetable.`, 'Load sample'))) return;
    setForm({ ...s, semester: String(s.semester), slots: s.versions[0].slots });
    toast('Sample loaded – please verify the times');
  };

  // ----- batches -----
  const addBatch = () => {
    const b = batchInput.trim();
    if (!b) return;
    if (form.batches.includes(b)) return toast('Batch already added');
    set('batches')([...form.batches, b]);
    setBatchInput('');
  };
  const removeBatch = async (b) => {
    if (!(await confirm(`Remove ${b}?`, 'Slots for this batch will be changed to "Everyone".', 'Remove'))) return;
    setForm((f) => ({
      ...f,
      batches: f.batches.filter((x) => x !== b),
      slots: f.slots.map((s) => (s.batch === b ? { ...s, batch: null } : s)),
    }));
  };

  // ----- subjects -----
  const saveSubject = (subject) => {
    setForm((f) => {
      const exists = f.subjects.some((s) => s.id === subject.id);
      return { ...f, subjects: exists ? f.subjects.map((s) => (s.id === subject.id ? subject : s)) : [...f.subjects, subject] };
    });
    setSubjectModal(null);
  };
  const deleteSubject = async (subject) => {
    const used = form.slots.filter((s) => s.subjectId === subject.id).length;
    const ok = await confirm(
      `Delete ${subject.name}?`,
      used ? `It is used in ${used} timetable slot(s); those slots will be removed too.` : 'This cannot be undone.',
      'Delete',
      true
    );
    if (!ok) return;
    setForm((f) => ({
      ...f,
      subjects: f.subjects.filter((s) => s.id !== subject.id),
      slots: f.slots.filter((s) => s.subjectId !== subject.id),
    }));
    setSubjectModal(null);
  };

  // ----- slots -----
  const saveSlot = (slot) => {
    setForm((f) => {
      const exists = f.slots.some((s) => s.id === slot.id);
      return { ...f, slots: exists ? f.slots.map((s) => (s.id === slot.id ? slot : s)) : [...f.slots, slot] };
    });
    setSlotModal(null);
  };
  const deleteSlot = (slot) => {
    setForm((f) => ({ ...f, slots: f.slots.filter((s) => s.id !== slot.id) }));
    setSlotModal(null);
  };
  const newSlot = () => {
    const last = daySlots[daySlots.length - 1];
    const start = last ? last.end : '09:30';
    const endMin = Math.min(minutes(start) + 60, 23 * 60 + 59);
    const end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    setSlotModal({ initial: { id: newId('slot'), day, start, end, subjectId: '', label: '', count: 1, batch: null, room: '' }, isNew: true });
  };

  // ----- save -----
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Give the class a name.';
    if (!form.course.trim()) e.course = 'Required.';
    if (!form.semester || Number.isNaN(Number(form.semester))) e.semester = 'Required.';
    if (!isValidDateStr(form.startDate)) e.startDate = 'Pick the semester start date.';
    setErrors(e);
    if (Object.keys(e).length) {
      toast('Please fix the highlighted fields');
      return false;
    }
    if (!form.subjects.length) {
      toast('Add at least one subject');
      return false;
    }
    if (!form.slots.some((s) => s.subjectId)) {
      toast('Add at least one lecture to the timetable');
      return false;
    }
    return true;
  };

  const payload = () => ({
    name: form.name.trim(),
    course: form.course.trim().toUpperCase(),
    semester: Number(form.semester),
    academicYear: form.academicYear.trim(),
    startDate: form.startDate,
    endDate: form.endDate || '',
    batches: form.batches,
    subjects: form.subjects,
  });

  const shareCode = (c, name) =>
    Share.share({ message: `Join "${name}" on CampusPal to track attendance & get notes.\nClass code: ${c}` });

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (!editing) {
        const data = { ...payload(), versions: [{ effectiveFrom: form.startDate, slots: form.slots }] };
        const newCode = await createClass(data, user.uid);
        Alert.alert('Class created 🎉', `Your class code is\n\n${newCode}\n\nShare it with your classmates. Next, join the class yourself.`, [
          { text: 'Share code', onPress: () => shareCode(newCode, data.name) },
          { text: 'Join now', onPress: () => router.replace({ pathname: '/class/join', params: { code: newCode } }) },
        ]);
      } else {
        const from = effectiveFrom < form.startDate ? form.startDate : effectiveFrom;
        // Keep older versions so past attendance stays as it was; replace anything from `from` onwards.
        const versions = [...(original.versions || []).filter((v) => v.effectiveFrom < from), { effectiveFrom: from, slots: form.slots }];
        const data = { ...payload(), versions };
        await updateClass(original.code, data, original.name);
        if (membership?.code === original.code) await setLocalClass({ ...joined, ...data, code: original.code, createdBy: original.createdBy });
        toast('Timetable updated for everyone');
        router.back();
      }
    } catch (e) {
      if (e instanceof DuplicateNameError) setErrors((x) => ({ ...x, name: e.message }));
      toast(e.message || 'Could not save. Check your internet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={[]}>
      {!editing ? (
        <Card style={{ backgroundColor: t.primarySoft, borderColor: t.primarySoft }}>
          <Body>
            You create the timetable once; classmates join with a code. Fill it from the timetable your college shared.
          </Body>
          {admin ? (
            <Row style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Button small title="Load Sem III sample" icon="flash-outline" variant="outline" onPress={() => loadSample(MCA_SEM3_SAMPLE)} />
              <Button small title="Load Sem I sample" icon="flash-outline" variant="outline" onPress={() => loadSample(MCA_SEM1_SAMPLE)} />
            </Row>
          ) : null}
        </Card>
      ) : (
        <Card style={{ backgroundColor: t.primarySoft, borderColor: t.primarySoft }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: t.muted, fontSize: 13 }}>Class code</Text>
              <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', letterSpacing: 1 }}>{original.code}</Text>
            </View>
            <Button small title="Share" icon="share-social-outline" variant="outline" onPress={() => shareCode(original.code, original.name)} />
          </Row>
        </Card>
      )}

      <Heading>Class details</Heading>
      <Input label="Class name" value={form.name} onChangeText={set('name')} error={errors.name} hint="Must be unique. Format: MCA Sem III – 2026-27" />
      <Row style={{ gap: 10 }}>
        <Input label="Course" autoCapitalize="characters" value={form.course} onChangeText={set('course')} error={errors.course} style={{ flex: 1 }} />
        <Input label="Semester" keyboardType="number-pad" value={form.semester} onChangeText={set('semester')} error={errors.semester} style={{ flex: 1 }} />
      </Row>
      <Input label="Academic year (optional)" value={form.academicYear} onChangeText={set('academicYear')} />
      <DateField label="Semester start date" value={form.startDate} onChange={set('startDate')} />
      {errors.startDate ? <Text style={{ color: t.danger, marginTop: -8, marginBottom: 10 }}>{errors.startDate}</Text> : null}

      <Heading>Lab batches</Heading>
      <Body muted style={{ marginBottom: 8 }}>Leave empty if your class has no batches.</Body>
      <ChipRow>
        {form.batches.map((b) => (
          <Chip key={b} label={b} icon="close" onPress={() => removeBatch(b)} />
        ))}
      </ChipRow>
      <Row style={{ gap: 8, alignItems: 'flex-end' }}>
        <Input label="New batch name" value={batchInput} onChangeText={setBatchInput} onSubmitEditing={addBatch} style={{ flex: 1, marginBottom: 0 }} />
        <Button small title="Add" onPress={addBatch} />
      </Row>

      <Heading
        right={
          <Button
            small
            title="Add"
            icon="add"
            variant="secondary"
            onPress={() => setSubjectModal({ initial: { id: newId('sub'), name: '', code: '', professor: '', type: 'theory', elective: false, group: '' } })}
          />
        }
      >
        Subjects ({form.subjects.length})
      </Heading>
      <Body muted style={{ marginBottom: 8 }}>Add theory and lab as separate subjects — the 50% rule applies to each.</Body>
      {form.subjects.map((s) => (
        <Card key={s.id} onPress={() => setSubjectModal({ initial: s, existing: true })} style={{ paddingVertical: 10 }}>
          <Text style={{ color: t.text, fontWeight: '700' }}>{subjectTitle(s)}</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>
            {[s.code, s.professor, s.elective ? `Elective: ${s.group}` : 'Compulsory'].filter(Boolean).join(' · ')}
          </Text>
        </Card>
      ))}

      <Heading right={<Button small title="Add slot" icon="add" variant="secondary" onPress={newSlot} />}>Weekly timetable</Heading>
      <ChipRow>
        {[1, 2, 3, 4, 5, 6].map((d) => (
          <Chip key={d} label={`${DAY_SHORT[d]} (${form.slots.filter((s) => s.day === d).length})`} selected={day === d} onPress={() => setDay(d)} />
        ))}
      </ChipRow>
      {daySlots.length === 0 ? <Body muted>No slots on this day.</Body> : null}
      {daySlots.map((s) => {
        const sub = s.subjectId ? subjectsById[s.subjectId] : null;
        return (
          <Pressable key={s.id} onPress={() => setSlotModal({ initial: s })}>
            <Card style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 86 }}>
                <Text style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>{formatTime(s.start)}</Text>
                <Text style={{ color: t.muted, fontSize: 13 }}>{formatTime(s.end)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: sub ? t.text : t.muted, fontWeight: '600' }}>{sub ? subjectTitle(sub) : s.label || 'Untitled'}</Text>
                <Text style={{ color: t.muted, fontSize: 12 }}>
                  {[s.batch || (sub ? 'Everyone' : 'Not tracked'), s.room, sub && s.count > 1 ? `counts ×${s.count}` : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.muted} />
            </Card>
          </Pressable>
        );
      })}

      {editing ? (
        <>
          <Heading>Apply changes from</Heading>
          <DateField value={effectiveFrom} onChange={setEffectiveFrom} />
          <Body muted style={{ marginTop: -6, marginBottom: 8 }}>
            Attendance before this date keeps using the old timetable.
          </Body>
        </>
      ) : null}

      <Button title={editing ? 'Save & update everyone' : 'Create class & get code'} onPress={save} loading={saving} style={{ marginTop: 16 }} />

      {subjectModal ? (
        <SubjectForm
          visible
          initial={subjectModal.initial}
          onClose={() => setSubjectModal(null)}
          onSave={saveSubject}
          onDelete={subjectModal.existing ? () => deleteSubject(subjectModal.initial) : undefined}
        />
      ) : null}
      {slotModal ? (
        <SlotForm
          visible
          initial={slotModal.initial}
          subjects={form.subjects}
          batches={form.batches}
          onClose={() => setSlotModal(null)}
          onSave={saveSlot}
          onDelete={slotModal.isNew ? undefined : () => deleteSlot(slotModal.initial)}
        />
      ) : null}
    </Screen>
  );
}
