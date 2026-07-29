import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { Colors, FontSize, BorderRadius, Spacing } from '../config/theme';
import { api } from '../services/api';

const INCIDENT_TYPES = [
  { type: 'overloading', label: 'Overloading', icon: '👥' },
  { type: 'reckless_driving', label: 'Reckless Driving', icon: '🏎️' },
  { type: 'damaged_vehicle', label: 'Damaged Vehicle', icon: '🔧' },
  { type: 'unruly_behavior', label: 'Unruly Behavior', icon: '😤' },
  { type: 'no_ticket', label: 'No Ticket / Fare', icon: '🎫' },
  { type: 'refused_pin', label: 'Refused Boarding PIN', icon: '🔢' },
  { type: 'verbal_abuse', label: 'Verbal Abuse', icon: '⚠️' },
  { type: 'queue_jumping', label: 'Queue Jumping', icon: '🔢' },
];

interface ReportDriverSheetProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
  token?: string | null;
}

export function ReportDriverSheet({ visible, onClose, targetId, targetName, token }: ReportDriverSheetProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);
    const res = await api.post('/api/reports/create', {
      targetId,
      targetRole: 'driver',
      incidentType: selectedType,
      description: description.trim() || undefined,
    }, token);
    setIsSubmitting(false);
    if (res.error) {
      Alert.alert('Error', res.error as string);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {submitted ? (
            <View style={styles.submittedContainer}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.submittedTitle}>Report Submitted</Text>
              <Text style={styles.submittedText}>Report filed against {targetName}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                <Text style={styles.primaryBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Report Driver</Text>
              <Text style={styles.subtitle}>Reporting: {targetName}</Text>

              <Text style={styles.sectionLabel}>Offense Type</Text>
              <View style={styles.chipRow}>
                {INCIDENT_TYPES.map((incident) => {
                  const selected = selectedType === incident.type;
                  return (
                    <TouchableOpacity
                      key={incident.type}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setSelectedType(incident.type)}
                    >
                      <Text style={styles.chipIcon}>{incident.icon}</Text>
                      <Text style={[styles.chipLabel, selected && styles.chipLabelActive]}>
                        {incident.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Additional details (optional)"
                placeholderTextColor={Colors.grey}
                multiline
                maxLength={200}
              />

              <TouchableOpacity
                style={[styles.submitBtn, (!selectedType || isSubmitting) && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={!selectedType || isSubmitting}
              >
                <Text style={styles.submitBtnText}>
                  {isSubmitting ? 'Submitting...' : 'SUBMIT REPORT'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.grey,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: Colors.grey, marginBottom: 16 },
  sectionLabel: { fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.ultraLightGrey,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
  },
  chipActive: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  chipIcon: { fontSize: 16, marginRight: 4 },
  chipLabel: { fontSize: 12, fontWeight: '500', color: Colors.black },
  chipLabelActive: { color: Colors.white, fontWeight: 'bold' },
  textArea: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    padding: 14,
    fontSize: FontSize.md,
    height: 80,
    textAlignVertical: 'top',
    color: Colors.black,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: Colors.error,
    paddingVertical: 16,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.6 },
  submitBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { marginTop: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.grey, fontSize: FontSize.md },
  submittedContainer: { alignItems: 'center', paddingVertical: 24 },
  checkIcon: { fontSize: 60, marginBottom: 16 },
  submittedTitle: { fontSize: 20, fontWeight: 'bold' },
  submittedText: { fontSize: 14, color: Colors.grey, textAlign: 'center', marginBottom: 24 },
  primaryBtn: {
    backgroundColor: Colors.black,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
  },
  primaryBtnText: { color: Colors.white, fontWeight: 'bold' },
});
