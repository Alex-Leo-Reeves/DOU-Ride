import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {
  AlertTriangle,
  Users,
  Gauge,
  Wrench,
  Frown,
  Ticket,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react-native';
import { Colors, FontSize, BorderRadius, Spacing, Shadows } from '../config/theme';
import { api } from '../services/api';

const INCIDENT_TYPES = [
  { type: 'overloading', label: 'Overloading (Too many riders)', icon: Users },
  { type: 'reckless_driving', label: 'Reckless / Overspeeding', icon: Gauge },
  { type: 'damaged_vehicle', label: 'Rough / Damaged Keke', icon: Wrench },
  { type: 'unruly_behavior', label: 'Hostile / Arrogant Attitude', icon: Frown },
  { type: 'no_ticket', label: 'Refused Fare Structure', icon: Ticket },
  { type: 'refused_pin', label: 'Refused Boarding PIN', icon: KeyRound },
  { type: 'verbal_abuse', label: 'Verbal Harassment', icon: AlertTriangle },
  { type: 'queue_jumping', label: 'Park Queue Violation', icon: ShieldAlert },
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
    if (!selectedType) {
      Alert.alert('Selection Required', 'Please choose the violation type to report.');
      return;
    }
    setIsSubmitting(true);
    const res = await api.post(
      '/api/reports/create',
      {
        targetId,
        targetRole: 'driver',
        incidentType: selectedType,
        description: description.trim() || undefined,
      },
      token
    );
    setIsSubmitting(false);
    if (res.error) {
      Alert.alert('Report Submission Failed', res.error as string);
    } else {
      setSubmitted(true);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setSelectedType(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {submitted ? (
            <View style={styles.submittedContainer}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={42} color={Colors.success} strokeWidth={2.5} />
              </View>
              <Text style={styles.submittedTitle}>Report Logged</Text>
              <Text style={styles.submittedText}>
                Your report against {targetName} has been immediately transmitted to Dennis Osadebay University Student Affairs.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleResetAndClose} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>DISMISS</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <View style={styles.alertIconCircle}>
                  <AlertTriangle size={20} color={Colors.warningDark} strokeWidth={2.5} />
                </View>
                <Text style={styles.title}>File Incident Report</Text>
              </View>
              <Text style={styles.subtitle}>Reporting Vehicle / Driver: <Text style={{ fontWeight: '800', color: Colors.slate900 }}>{targetName}</Text></Text>

              <Text style={styles.sectionLabel}>Select Operational Offense</Text>
              <View style={styles.chipGrid}>
                {INCIDENT_TYPES.map((incident) => {
                  const selected = selectedType === incident.type;
                  const IconComp = incident.icon;
                  return (
                    <TouchableOpacity
                      key={incident.type}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setSelectedType(incident.type)}
                      activeOpacity={0.8}
                    >
                      <IconComp
                        size={16}
                        color={selected ? Colors.white : Colors.slate700}
                        strokeWidth={2.2}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.chipLabel, selected && styles.chipLabelActive]}>
                        {incident.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Incident Notes / Additional Details</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Explain what happened at the park or during the trip..."
                placeholderTextColor={Colors.slate400}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.primaryBtn, (!selectedType || isSubmitting) && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={!selectedType || isSubmitting}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {isSubmitting ? 'TRANSMITTING REPORT...' : 'SUBMIT TO STUDENT AFFAIRS'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.black60,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 36,
    maxHeight: '88%',
    ...Shadows.xl,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: Colors.slate300,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.slate900,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.slate500,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    marginTop: 4,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
  },
  chipActive: {
    backgroundColor: Colors.slate900,
    borderColor: Colors.slate900,
  },
  chipLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate700,
  },
  chipLabelActive: {
    color: Colors.white,
  },
  textArea: {
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.slate900,
    minHeight: 80,
    marginBottom: Spacing.lg,
  },
  primaryBtn: {
    backgroundColor: Colors.emergencyRed,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
  },
  cancelBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  cancelBtnText: {
    color: Colors.slate500,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  submittedContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  submittedTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.slate900,
    marginBottom: Spacing.xs,
  },
  submittedText: {
    fontSize: FontSize.sm,
    color: Colors.slate600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
});
