// Upload notes: scan pages with the camera (→ PDF) or pick an existing PDF.
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { Banner, Body, Button, Card, Chip, ChipRow, Heading, Input, Label, ProgressBar, Row, Screen, confirm, toast } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useClass } from '../../lib/ClassContext';
import { NOTE_TYPES, MAX_UPLOAD_MB, isCloudinaryConfigured } from '../../lib/config';
import { checkSize, createNote, imagesToPdf, uploadPdf } from '../../lib/notes';
import { useTheme } from '../../lib/theme';

const MAX_PAGES = 30;
const IMG_OPTS = { mediaTypes: ['images'], quality: 0.5, base64: true };

export default function UploadNotes() {
  const t = useTheme();
  const { user, profile } = useAuth();
  const { cls } = useClass();
  const [pages, setPages] = useState([]); // camera/gallery images
  const [pdf, setPdf] = useState(null); // picked PDF { uri, name, size }
  const [form, setForm] = useState({ title: '', subject: '', courseCode: '', professor: '', type: 'Notes', semester: profile.semester });
  const [errors, setErrors] = useState({});
  const [stage, setStage] = useState(null); // null | 'pdf' | 'upload' | 'save'
  const [progress, setProgress] = useState(0);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // Subject shortcuts from the joined class timetable.
  const suggestions = useMemo(() => {
    const seen = new Map();
    for (const s of cls?.subjects || []) if (!seen.has(s.name)) seen.set(s.name, s);
    return [...seen.values()];
  }, [cls]);

  const scanPage = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return toast('Camera permission is needed to scan notes');
    const res = await ImagePicker.launchCameraAsync(IMG_OPTS);
    if (!res.canceled) {
      setPdf(null);
      setPages((p) => [...p, ...res.assets].slice(0, MAX_PAGES));
    }
  };

  const pickImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ ...IMG_OPTS, allowsMultipleSelection: true, selectionLimit: MAX_PAGES });
    if (!res.canceled) {
      setPdf(null);
      setPages((p) => [...p, ...res.assets].slice(0, MAX_PAGES));
    }
  };

  const pickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    try {
      checkSize(a.size);
    } catch (e) {
      return toast(e.message);
    }
    setPages([]);
    setPdf({ uri: a.uri, name: a.name, size: a.size });
    if (!form.title) set('title')(a.name.replace(/\.pdf$/i, ''));
  };

  const removePage = (i) => setPages((p) => p.filter((_, idx) => idx !== i));

  const chooseSubject = (s) =>
    setForm((f) => ({ ...f, subject: s.name, courseCode: s.code || f.courseCode, professor: s.professor || f.professor }));

  const submit = async () => {
    const e = {};
    if (!pages.length && !pdf) e.file = 'Scan pages or choose a PDF first.';
    if (!form.title.trim()) e.title = 'Give it a title, e.g. "Unit 2 – Virtualisation".';
    if (!form.subject.trim()) e.subject = 'Which subject is this for?';
    setErrors(e);
    if (Object.keys(e).length) return;
    if (!isCloudinaryConfigured) return toast('Uploads are not configured yet (Cloudinary values missing in .env)');

    try {
      let file = pdf;
      if (!file) {
        setStage('pdf');
        const made = await imagesToPdf(pages);
        file = { uri: made.uri, name: `${form.title.trim().slice(0, 40) || 'notes'}.pdf`, size: made.size };
      }
      checkSize(file.size);
      setStage('upload');
      setProgress(0);
      const uploaded = await uploadPdf(file, setProgress);
      setStage('save');
      const id = await createNote({ ...form, course: profile.course }, uploaded, user);
      toast('Uploaded – thanks for sharing!');
      router.replace(`/notes/${id}`);
    } catch (err) {
      setStage(null);
      const retry = await confirm('Upload failed', `${err.message || 'Something went wrong.'}\n\nTry again?`, 'Retry');
      if (retry) submit();
    }
  };

  const busy = stage !== null;
  const stageText = { pdf: 'Creating PDF from your pages…', upload: `Uploading… ${Math.round(progress * 100)}%`, save: 'Saving…' }[stage];

  return (
    <Screen edges={['bottom']}>
      {!isCloudinaryConfigured ? (
        <Banner status="warning" title="Uploads not set up">
          Add your Cloudinary cloud name and upload preset to the .env file to enable uploads.
        </Banner>
      ) : null}

      <Heading>1. Add your notes</Heading>
      <Row style={{ gap: 8, marginBottom: 8 }}>
        <Button title="Scan page" icon="camera" onPress={scanPage} style={{ flex: 1 }} disabled={busy} />
        <Button title="Gallery" icon="images" variant="secondary" onPress={pickImages} style={{ flex: 1 }} disabled={busy} />
      </Row>
      <Button title="Choose a PDF file" icon="document-attach" variant="outline" onPress={pickPdf} disabled={busy} />
      {errors.file ? <Text style={{ color: t.danger, marginTop: 6 }}>{errors.file}</Text> : null}

      {pages.length ? (
        <>
          <Label>{`${pages.length} page${pages.length === 1 ? '' : 's'} · tap × to remove · will be combined into one PDF`}</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 4 }}>
            {pages.map((p, i) => (
              <View key={`${p.uri}-${i}`} style={{ marginRight: 10 }}>
                <Image source={{ uri: p.uri }} style={{ width: 90, height: 120, borderRadius: 8, backgroundColor: t.border }} />
                <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center' }}>Page {i + 1}</Text>
                <Pressable
                  onPress={() => removePage(i)}
                  hitSlop={8}
                  style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#000a', borderRadius: 12, padding: 2 }}
                  accessibilityLabel={`Remove page ${i + 1}`}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}
      {pdf ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Ionicons name="document" size={28} color={t.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: t.text, fontWeight: '600' }} numberOfLines={1}>{pdf.name}</Text>
            <Text style={{ color: t.muted, fontSize: 13 }}>{pdf.size ? `${(pdf.size / 1024 / 1024).toFixed(1)} MB` : ''}</Text>
          </View>
          <Pressable onPress={() => setPdf(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={24} color={t.muted} />
          </Pressable>
        </Card>
      ) : null}
      <Body muted style={{ marginTop: 6, fontSize: 13 }}>Max {MAX_UPLOAD_MB} MB per upload.</Body>

      <Heading>2. Describe it</Heading>
      <Input label="Title" value={form.title} onChangeText={set('title')} error={errors.title} />
      {suggestions.length ? (
        <>
          <Label>Subject (tap to fill)</Label>
          <ChipRow>
            {suggestions.map((s) => (
              <Chip key={s.id} label={s.name} selected={form.subject === s.name} onPress={() => chooseSubject(s)} />
            ))}
          </ChipRow>
        </>
      ) : null}
      <Input label={suggestions.length ? 'Or type the subject' : 'Subject'} value={form.subject} onChangeText={set('subject')} error={errors.subject} />
      <Row style={{ gap: 10 }}>
        <Input label="Course code" autoCapitalize="characters" value={form.courseCode} onChangeText={set('courseCode')} style={{ flex: 1 }} />
        <Input label="Professor (optional)" value={form.professor} onChangeText={set('professor')} style={{ flex: 1 }} />
      </Row>
      <Label>Type</Label>
      <ChipRow>
        {NOTE_TYPES.map((ty) => (
          <Chip key={ty} label={ty} selected={form.type === ty} onPress={() => set('type')(ty)} />
        ))}
      </ChipRow>
      <Label>Semester</Label>
      <ChipRow>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
          <Chip key={s} label={`Sem ${s}`} selected={form.semester === s} onPress={() => set('semester')(s)} />
        ))}
      </ChipRow>

      {busy ? (
        <Card>
          <Text style={{ color: t.text, fontWeight: '600', marginBottom: 8 }}>{stageText}</Text>
          <ProgressBar value={stage === 'upload' ? progress : stage === 'save' ? 1 : 0.1} />
        </Card>
      ) : null}
      <Button title="Upload" icon="cloud-upload" onPress={submit} loading={busy} style={{ marginTop: 8 }} />
      <Body muted style={{ marginTop: 10, fontSize: 13, textAlign: 'center' }}>
        Only upload your own notes or material you’re allowed to share.
      </Body>
    </Screen>
  );
}
