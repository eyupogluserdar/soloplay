import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';
import { colors, typography } from '../theme/theme';

export const PromptModal = ({
  visible,
  title,
  placeholder,
  defaultValue = '',
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  defaultValue?: string;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (visible) setValue(defaultValue);
  }, [visible, defaultValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            value={value}
            onChangeText={setValue}
            autoFocus
          />
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.btn} onPress={onCancel}>
              <Text style={styles.btnText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => onSubmit(value)}>
              <Text style={[styles.btnText, { color: colors.background }]}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  content: { width: '80%', backgroundColor: colors.surface, borderRadius: 16, padding: 20 },
  title: { ...typography.title, fontSize: 18, marginBottom: 15, textAlign: 'center' },
  input: { backgroundColor: colors.surfaceLight, color: colors.text, borderRadius: 8, padding: 12, marginBottom: 20 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.surfaceLight, alignItems: 'center' },
  btnText: { color: colors.text, fontWeight: 'bold' }
});
