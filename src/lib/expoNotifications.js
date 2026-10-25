// Only the *local* notification parts of expo-notifications, loaded safely.
//
// Importing the package root also loads its push-topic native module
// (ExpoTopicSubscriptionModule), which Expo Go on Android doesn't register
// (expo/expo#52175). We never use push, so we import the pieces we need
// directly — and only if their native modules exist, so a missing module
// turns reminders off instead of crashing the app.
import { requireOptionalNativeModule } from 'expo';

// Plain JS enums (no native code), safe to import directly.
export { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
export { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';

// Native modules behind the files loaded below.
const REQUIRED_NATIVE = [
  'ExpoNotificationsHandlerModule',
  'ExpoNotificationPermissionsModule',
  'ExpoNotificationChannelManager',
  'ExpoNotificationScheduler',
  'ExpoNotificationsEmitter',
];

export const notificationsAvailable = REQUIRED_NATIVE.every((name) => requireOptionalNativeModule(name) != null);

function load() {
  return {
    ...require('expo-notifications/build/NotificationsHandler'),
    ...require('expo-notifications/build/NotificationPermissions'),
    ...require('expo-notifications/build/setNotificationChannelAsync'),
    ...require('expo-notifications/build/scheduleNotificationAsync'),
    ...require('expo-notifications/build/cancelAllScheduledNotificationsAsync'),
    ...require('expo-notifications/build/NotificationsEmitter'),
  };
}

const N = notificationsAvailable ? load() : null;
const noop = async () => {};
const denied = async () => ({ status: 'denied', granted: false, canAskAgain: false });

export const setNotificationHandler = N ? N.setNotificationHandler : () => {};
export const getPermissionsAsync = N ? N.getPermissionsAsync : denied;
export const requestPermissionsAsync = N ? N.requestPermissionsAsync : denied;
export const setNotificationChannelAsync = N ? N.setNotificationChannelAsync : noop;
export const scheduleNotificationAsync = N ? N.scheduleNotificationAsync : noop;
export const cancelAllScheduledNotificationsAsync = N ? N.cancelAllScheduledNotificationsAsync : noop;
export const addNotificationResponseReceivedListener = N
  ? N.addNotificationResponseReceivedListener
  : () => ({ remove() {} });
