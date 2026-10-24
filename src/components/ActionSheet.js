// Simple bottom-sheet menu (Android dialogs only allow 3 buttons).
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../lib/theme';

/** items: [{ label, icon, onPress, danger }] */
export function ActionSheet({ visible, title, subtitle, items, onClose }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: t.card }]}>
          {title ? <Text style={{ color: t.text, fontSize: 17, fontWeight: '700' }}>{title}</Text> : null}
          {subtitle ? <Text style={{ color: t.muted, marginBottom: 8 }}>{subtitle}</Text> : null}
          {items.map((it) => (
            <Pressable
              key={it.label}
              onPress={() => {
                onClose();
                it.onPress();
              }}
              style={({ pressed }) => [styles.item, { borderColor: t.border, opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name={it.icon} size={22} color={it.danger ? t.danger : t.primary} />
              <Text style={{ color: it.danger ? t.danger : t.text, fontSize: 16, fontWeight: '600', marginLeft: 12 }}>{it.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' },
  sheet: { padding: 20, paddingBottom: 32, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14 },
});
