// Date and time fields that open the native picker.
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { formatDate, formatTime, parseDate, toDateStr, toTimeStr } from '../lib/dates';
import { useTheme } from '../lib/theme';
import { Label } from './ui';

function Field({ label, text, icon, onPress, style }) {
  const t = useTheme();
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Label>{label}</Label> : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={{
          minHeight: 50,
          borderWidth: 1.5,
          borderColor: t.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: t.input,
        }}
      >
        <Ionicons name={icon} size={18} color={t.muted} style={{ marginRight: 8 }} />
        <Text style={{ color: t.text, fontSize: 16 }}>{text}</Text>
      </Pressable>
    </View>
  );
}

function usePicker(mode, valueDate, onPicked) {
  const [showIOS, setShowIOS] = useState(false);
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: valueDate,
        mode,
        is24Hour: false,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onPicked(date);
        },
      });
    } else {
      setShowIOS((s) => !s);
    }
  };
  const iosPicker = showIOS ? (
    <DateTimePicker
      value={valueDate}
      mode={mode}
      display="spinner"
      onChange={(e, date) => date && onPicked(date)}
    />
  ) : null;
  return { open, iosPicker };
}

export function DateField({ label, value, onChange, style }) {
  const date = value ? parseDate(value) : new Date();
  const { open, iosPicker } = usePicker('date', date, (d) => onChange(toDateStr(d)));
  return (
    <>
      <Field label={label} text={value ? formatDate(value) : 'Select date'} icon="calendar-outline" onPress={open} style={style} />
      {iosPicker}
    </>
  );
}

export function TimeField({ label, value, onChange, style }) {
  const date = new Date();
  if (value) {
    const [h, m] = value.split(':').map(Number);
    date.setHours(h, m, 0, 0);
  }
  const { open, iosPicker } = usePicker('time', date, (d) => onChange(toTimeStr(d)));
  return (
    <>
      <Field label={label} text={value ? formatTime(value) : 'Select time'} icon="time-outline" onPress={open} style={style} />
      {iosPicker}
    </>
  );
}
