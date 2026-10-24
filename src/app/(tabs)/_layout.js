import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../lib/theme';

const icon = (name) =>
  function TabIcon({ color, focused, size }) {
    return <Ionicons name={focused ? name : `${name}-outline`} color={color} size={size} />;
  };

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: icon('checkmark-done-circle') }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes', tabBarIcon: icon('document-text') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-circle') }} />
    </Tabs>
  );
}
