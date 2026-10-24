import { useColorScheme } from 'react-native';

const light = {
  dark: false,
  bg: '#F4F6FA',
  card: '#FFFFFF',
  text: '#14213D',
  muted: '#5B6475',
  border: '#E1E5EE',
  primary: '#1F4E79',
  primaryText: '#FFFFFF',
  primarySoft: '#E3ECF7',
  safe: '#1B873F',
  safeSoft: '#E3F5E9',
  warning: '#B26A00',
  warningSoft: '#FFF3DC',
  danger: '#C62828',
  dangerSoft: '#FDE8E8',
  disabled: '#A9B0BD',
  input: '#FFFFFF',
};

const dark = {
  dark: true,
  bg: '#0E1420',
  card: '#182131',
  text: '#EEF2F8',
  muted: '#9AA5B8',
  border: '#2A3548',
  primary: '#5B9BD5',
  primaryText: '#0E1420',
  primarySoft: '#1E3550',
  safe: '#4CC27A',
  safeSoft: '#173527',
  warning: '#F2B347',
  warningSoft: '#3A2E12',
  danger: '#F2706A',
  dangerSoft: '#3D1C1C',
  disabled: '#4D586B',
  input: '#121A27',
};

export function useTheme() {
  return useColorScheme() === 'dark' ? dark : light;
}

export const statusColor = (t, status) =>
  ({ safe: t.safe, warning: t.warning, danger: t.danger, none: t.muted })[status] || t.muted;

export const statusSoft = (t, status) =>
  ({ safe: t.safeSoft, warning: t.warningSoft, danger: t.dangerSoft, none: t.bg })[status] || t.bg;
