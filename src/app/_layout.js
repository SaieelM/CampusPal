import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from '../lib/expoNotifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/auth';
import { ClassProvider } from '../lib/ClassContext';
import { isFirebaseConfigured, missingConfig } from '../lib/config';
import { initDb } from '../lib/db';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  useEffect(() => {
    initDb();
  }, []);

  if (!isFirebaseConfigured) return <SetupNeeded />;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ClassProvider>
          <RootStack />
        </ClassProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function useNotificationTaps() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url);
    });
    return () => sub.remove();
  }, []);
}

function RootStack() {
  const t = useTheme();
  const { user, verified, profile, initialising } = useAuth();
  useNotificationTaps();

  if (initialising) return <Loading message="Starting CampusPal…" />;

  const loggedIn = Boolean(user);
  const ready = loggedIn && verified && Boolean(profile);

  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Protected guard={!loggedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={loggedIn && !verified}>
          <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={loggedIn && verified && !profile}>
          <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={ready}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="class/join" options={{ title: 'Join your class' }} />
          <Stack.Screen name="class/edit" options={{ title: 'Class timetable' }} />
          <Stack.Screen name="class/catchup" options={{ title: 'Catch up' }} />
          <Stack.Screen name="class/extra" options={{ title: 'Add extra lecture', presentation: 'modal' }} />
          <Stack.Screen name="class/settings" options={{ title: 'My class' }} />
          <Stack.Screen name="class/week" options={{ title: 'Week view' }} />
          <Stack.Screen name="subjects" options={{ title: 'Subjects' }} />
          <Stack.Screen name="admin" options={{ title: 'Admin' }} />
          <Stack.Screen name="subject/[id]" options={{ title: 'Subject' }} />
          <Stack.Screen name="notes/upload" options={{ title: 'Upload notes' }} />
          <Stack.Screen name="notes/[id]" options={{ title: 'Notes' }} />
          <Stack.Screen name="notes/mine" options={{ title: 'My uploads' }} />
          <Stack.Screen name="feedback" options={{ title: 'Feedback', presentation: 'modal' }} />
          <Stack.Screen name="profile-edit" options={{ title: 'Edit profile' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

/** Shown until the .env file is filled in. */
function SetupNeeded() {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 12 }}>CampusPal setup needed</Text>
      <Text style={{ fontSize: 16, lineHeight: 22, marginBottom: 16 }}>
        Fill in the Firebase values in <Text style={{ fontWeight: '700' }}>campuspal/.env</Text>, then stop and
        restart <Text style={{ fontFamily: 'monospace' }}>npx expo start --clear</Text>.
      </Text>
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Missing:</Text>
      {missingConfig.map((m) => (
        <View key={m} style={{ paddingVertical: 4 }}>
          <Text>• {m}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
