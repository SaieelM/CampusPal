import { useState } from 'react';

import { guessSemester, parseCollegeEmail, useAuth } from '../lib/auth';
import { Button, Chip, ChipRow, Input, Label, toast } from './ui';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

/** Shared by first-time setup and "Edit profile". */
export function ProfileForm({ submitLabel, onDone }) {
  const { user, profile, saveProfile } = useAuth();
  const hints = parseCollegeEmail(user?.email);
  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [course, setCourse] = useState(profile?.course || hints.course || '');
  const [semester, setSemester] = useState(profile?.semester || guessSemester(hints.batchYear) || null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e = {};
    if (!name.trim()) e.name = 'Enter your name.';
    if (!course.trim()) e.course = 'Enter your course, e.g. MCA.';
    if (!semester) e.semester = 'Pick your semester.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await saveProfile({ name, course, semester, batchYear: hints.batchYear || profile?.batchYear || null });
      onDone?.();
    } catch (err) {
      toast(err.message || 'Could not save. Check your internet.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Input label="Full name" value={name} onChangeText={setName} error={errors.name} />
      <Input
        label="Course"
        value={course}
        onChangeText={setCourse}
        autoCapitalize="characters"
        error={errors.course}
        hint={hints.course ? `Detected from your email: ${hints.course}${hints.batchYear ? `, batch ${hints.batchYear}` : ''}` : undefined}
      />
      <Label>Current semester</Label>
      <ChipRow>
        {SEMESTERS.map((s) => (
          <Chip key={s} label={`Sem ${s}`} selected={semester === s} onPress={() => setSemester(s)} />
        ))}
      </ChipRow>
      {errors.semester ? <Label>{errors.semester}</Label> : null}
      <Button title={submitLabel} onPress={submit} loading={busy} style={{ marginTop: 8 }} />
    </>
  );
}
