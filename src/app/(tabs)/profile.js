import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

import { Card, Heading, Screen, Title, confirm } from '../../components/ui';
import { isAdminEmail } from '../../lib/admins';
import { useAuth } from '../../lib/auth';
import { useClass } from '../../lib/ClassContext';
import { notificationsEnabled, setNotificationsEnabled } from '../../lib/notifications';
import { useTheme } from '../../lib/theme';

function Item({ icon, label, sub, onPress, right, danger }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name={icon} size={22} color={danger ? t.danger : t.primary} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: danger ? t.danger : t.text, fontSize: 16, fontWeight: '500' }}>{label}</Text>
        {sub ? <Text style={{ color: t.muted, fontSize: 13 }}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={t.muted} /> : null)}
    </Pressable>
  );
}

export default function Profile() {
  const t = useTheme();
  const { user, profile, signOut } = useAuth();
  const { cls, membership } = useClass();
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    notificationsEnabled().then(setNotify);
  }, []);

  const toggleNotify = async (v) => {
    setNotify(v);
    await setNotificationsEnabled(v, cls, membership);
  };

  const logout = async () => {
    if (await confirm('Log out?', 'Your attendance stays saved on this phone.', 'Log out')) signOut();
  };

  const initials = (profile.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Screen>
      <Title>Profile</Title>
      <Card style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: t.primaryText, fontSize: 20, fontWeight: '800' }}>{initials}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '700' }}>{profile.name}</Text>
          <Text style={{ color: t.muted }} numberOfLines={1}>{user.email}</Text>
          <Text style={{ color: t.muted }}>
            {profile.course} · Semester {profile.semester}
          </Text>
        </View>
      </Card>

      <Heading>Attendance</Heading>
      <Card style={{ paddingVertical: 0 }}>
        <Item
          icon="people-outline"
          label={cls ? cls.name : 'Join your class'}
          sub={cls ? `Code ${cls.code}${membership?.batch ? ` · ${membership.batch}` : ''}` : 'Get your timetable from your CR'}
          onPress={() => router.push(cls ? '/class/settings' : '/class/join')}
        />
        <Item
          icon="notifications-outline"
          label="Lecture reminders"
          sub="10 min before each lecture + evening nudge"
          right={<Switch value={notify} onValueChange={toggleNotify} trackColor={{ true: t.primary }} />}
        />
        {!cls ? <Item icon="create-outline" label="Create class timetable" sub="For class representatives" onPress={() => router.push('/class/edit')} /> : null}
      </Card>

      <Heading>Notes</Heading>
      <Card style={{ paddingVertical: 0 }}>
        <Item icon="cloud-upload-outline" label="My uploads" onPress={() => router.push('/notes/mine')} />
        <Item icon="add-circle-outline" label="Upload notes" onPress={() => router.push('/notes/upload')} />
      </Card>

      {isAdminEmail(user.email) ? (
        <>
          <Heading>Admin</Heading>
          <Card style={{ paddingVertical: 0 }}>
            <Item icon="shield-checkmark-outline" label="Admin tools" sub="Demo data, all classes, reported notes, feedback" onPress={() => router.push('/admin')} />
          </Card>
        </>
      ) : null}

      <Heading>Account</Heading>
      <Card style={{ paddingVertical: 0 }}>
        <Item icon="person-outline" label="Edit profile" sub="Name, course, semester" onPress={() => router.push('/profile-edit')} />
        <Item icon="chatbubble-ellipses-outline" label="Report a bug / Suggest a feature" onPress={() => router.push('/feedback')} />
        <Item icon="log-out-outline" label="Log out" danger onPress={logout} />
      </Card>

      <Text style={{ color: t.muted, textAlign: 'center', marginTop: 16, fontSize: 13 }}>
        CampusPal v{Constants.expoConfig?.version || '1.0.0'} · Made at GBS
      </Text>
    </Screen>
  );
}
