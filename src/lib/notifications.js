// Local notifications only (they work in Expo Go and offline):
//  • a reminder 10 minutes before each of the student's lectures
//  • an evening nudge to mark the day's attendance
//  • instant alerts when a course falls below the ordinance minimum
import { Platform } from 'react-native';
import * as Notifications from './expoNotifications';

import { kvGet, kvSet } from './db';
import { minutes, todayStr } from './dates';
import { latestVersion, slotKind, subjectMap, versionFor } from './timetable';

const CHANNEL_ID = 'reminders';
export const REMINDER_MINUTES_BEFORE = 10;
const EVENING_NUDGE = { hour: 18, minute: 0 };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications() {
  try {
    if (Platform.OS === 'android') {
      // On Android 13+ the permission prompt only appears once a channel exists.
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Lecture reminders & attendance alerts',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const res = await Notifications.requestPermissionsAsync();
      return res.status === 'granted';
    }
    return true;
  } catch {
    return false;
  }
}

export async function notificationsEnabled() {
  return (await kvGet('notificationsEnabled', true)) !== false;
}

export async function setNotificationsEnabled(enabled, cls, membership) {
  await kvSet('notificationsEnabled', enabled);
  if (enabled) {
    await setupNotifications();
    await scheduleLectureReminders(cls, membership);
  } else {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

// Our days: 1 = Monday … 7 = Sunday. Expo weekly trigger: 1 = Sunday … 7 = Saturday.
const toExpoWeekday = (day) => (day % 7) + 1;

/** Re-creates every scheduled reminder from the current timetable. */
export async function scheduleLectureReminders(cls, membership) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!cls || !membership || !(await notificationsEnabled())) return;

    const version = versionFor(cls, todayStr()) || latestVersion(cls);
    if (!version) return;
    const subjects = subjectMap(cls);
    const teachingDays = new Set();

    for (const slot of version.slots || []) {
      if (slotKind(slot, subjects, membership) !== 'mine') continue;
      teachingDays.add(slot.day);
      const subject = subjects[slot.subjectId];
      let at = minutes(slot.start) - REMINDER_MINUTES_BEFORE;
      if (at < 0) at = 0;
      await Notifications.scheduleNotificationAsync({
        identifier: `lecture-${slot.id}`,
        content: {
          title: `${subject.name}${subject.type === 'lab' ? ' Lab' : ''} in ${REMINDER_MINUTES_BEFORE} min`,
          body: `${slot.start}–${slot.end}${slot.room ? ` · Room ${slot.room}` : ''}`,
          data: { url: '/attendance' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(slot.day),
          hour: Math.floor(at / 60),
          minute: at % 60,
          channelId: CHANNEL_ID,
        },
      });
    }

    for (const day of teachingDays) {
      await Notifications.scheduleNotificationAsync({
        identifier: `nudge-${day}`,
        content: {
          title: 'Mark today\'s attendance',
          body: 'Takes 10 seconds and keeps your skip predictions accurate.',
          data: { url: '/attendance' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(day),
          hour: EVENING_NUDGE.hour,
          minute: EVENING_NUDGE.minute,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch (e) {
    console.warn('Could not schedule reminders', e);
  }
}

/** Shows a notification right away (used for attendance shortage alerts). */
export async function notifyNow(title, body) {
  try {
    if (!(await notificationsEnabled())) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { url: '/attendance' } },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  } catch {
    // Notifications are a bonus; never block the user on them.
  }
}
