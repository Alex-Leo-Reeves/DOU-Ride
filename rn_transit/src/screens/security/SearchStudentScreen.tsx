import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  ChevronLeft,
  User,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { AdminStudent } from '../../types';
import { DouCard } from '../../components/DouCard';
import { ReportDriverSheet } from '../../components/ReportDriverSheet';

const MOCK_STUDENTS: AdminStudent[] = [
  { id: '1', name: 'Ozegbe Mike', matricNumber: 'DOU/2023/SCI/041', department: 'Computer Science' },
  { id: '2', name: 'Anthonia Okafor', matricNumber: 'DOU/2024/LAW/108', department: 'Faculty of Law' },
  { id: '3', name: 'Chukwudi Emeka', matricNumber: 'DOU/2022/ENG/019', department: 'Mechanical Engineering' },
  { id: '4', name: 'Blessing Adeyemi', matricNumber: 'DOU/2024/ARTS/055', department: 'Mass Communication' },
  { id: '5', name: 'Odaiche Famous', matricNumber: 'DOU/2023/NUR/202', department: 'Nursing Science' },
  { id: '6', name: 'Favour Nwosu', matricNumber: 'DOU/2024/AGR/012', department: 'Faculty of Agriculture' },
];

export default function SearchStudentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<AdminStudent[]>(MOCK_STUDENTS);
  const [loading, setLoading] = useState(false);
  const [reportingStudent, setReportingStudent] = useState<AdminStudent | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setResults(MOCK_STUDENTS);
      return;
    }
    const q = text.trim().toLowerCase();
    const filtered = MOCK_STUDENTS.filter(
      (s) =>
        s.matricNumber.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
    );
    setResults(filtered);
  }, []);

  const handleSelectStudent = (student: AdminStudent) => {
    navigation.navigate(Routes.securityResult, {
      scanData: JSON.stringify({
        type: 'student',
        userId: student.id,
        fullName: student.name,
        matricNumber: student.matricNumber,
        department: student.department,
        validUntil: '2026-12-31',
        status: 'cleared',
      }),
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={22} color={Colors.slate900} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Student ID Lookup</Text>
          <Text style={styles.headerSub}>Gate Security Registry</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.slate400} strokeWidth={2.5} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search by Matric No (e.g. 2024), Name, or Dept..."
            placeholderTextColor={Colors.slate400}
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.sectionHeader}>REGISTERED STUDENTS ({results.length})</Text>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Matching Students</Text>
              <Text style={styles.emptySub}>
                Check the matriculation number or search for full names.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <DouCard variant="elevated" style={styles.studentCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.avatarCircle}>
                  <User size={20} color={Colors.primaryAccent} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentMatric}>{item.matricNumber}</Text>
                  <Text style={styles.studentDept}>{item.department}</Text>
                </View>
                <View style={styles.clearedBadge}>
                  <Text style={styles.clearedBadgeText}>ENROLLED</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.inspectBtn}
                  onPress={() => handleSelectStudent(item)}
                  activeOpacity={0.8}
                >
                  <ShieldCheck size={14} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={styles.inspectBtnText}>Gate Clearance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reportBtn}
                  onPress={() => setReportingStudent(item)}
                  activeOpacity={0.8}
                >
                  <AlertTriangle size={14} color={Colors.warningDark} strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={styles.reportBtnText}>Report Offense</Text>
                </TouchableOpacity>
              </View>
            </DouCard>
          )}
        />
      </View>

      {/* Incident Report Modal for Gate Security */}
      {reportingStudent && (
        <ReportDriverSheet
          visible={!!reportingStudent}
          onClose={() => setReportingStudent(null)}
          targetId={reportingStudent.id}
          targetName={`${reportingStudent.name} (${reportingStudent.matricNumber})`}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 14 : Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.slate900,
  },
  headerSub: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.slate900,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate500,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  studentCard: {
    padding: Spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentName: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  studentMatric: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryAccent,
    marginTop: 1,
  },
  studentDept: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 1,
  },
  clearedBadge: {
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  clearedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.successDark,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  inspectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate900,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  inspectBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  reportBtnText: {
    color: Colors.warningDark,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.slate800,
  },
  emptySub: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    marginTop: 4,
  },
});