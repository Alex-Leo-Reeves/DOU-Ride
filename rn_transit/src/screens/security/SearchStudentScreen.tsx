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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { AdminStudent } from '../../types';

// Mock student data for search demonstration
const MOCK_STUDENTS: AdminStudent[] = [
  { id: '1', name: 'John Doe', matricNumber: '2024/12345', department: 'Computer Science' },
  { id: '2', name: 'Jane Smith', matricNumber: '2024/12346', department: 'Mathematics' },
  { id: '3', name: 'Samuel Green', matricNumber: '2024/12347', department: 'Physics' },
  { id: '4', name: 'Alice Johnson', matricNumber: '2024/12348', department: 'Engineering' },
  { id: '5', name: 'Bob Williams', matricNumber: '2024/12349', department: 'Medicine' },
  { id: '6', name: 'Carol Brown', matricNumber: '2024/12350', department: 'Law' },
  { id: '7', name: 'David Lee', matricNumber: '2024/12351', department: 'Business Admin' },
  { id: '8', name: 'Eve Davis', matricNumber: '2024/12352', department: 'Arts' },
];

const SearchStudentScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<AdminStudent[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);

    // Simulate API search delay
    setTimeout(() => {
      const query = searchQuery.trim().toLowerCase();
      const filtered = MOCK_STUDENTS.filter(
        (student) =>
          student.matricNumber.toLowerCase().includes(query) ||
          student.name.toLowerCase().includes(query) ||
          student.department.toLowerCase().includes(query),
      );
      setResults(filtered);
      setLoading(false);
    }, 500);
  }, [searchQuery]);

  const handleSelectStudent = (student: AdminStudent) => {
    // Navigate to security result with student data
    navigation.navigate(Routes.securityResult, {
      scanData: JSON.stringify({
        type: 'student',
        userId: student.id,
        fullName: student.name,
        matricNumber: student.matricNumber,
        department: student.department,
        validUntil: '2025-06-30',
      }),
      timestamp: new Date().toISOString(),
    });
  };

  const handleViewPass = (student: AdminStudent) => {
    // Quick scan action - same result flow
    handleSelectStudent(student);
  };

  const renderStudentItem = ({ item }: { item: AdminStudent }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => handleSelectStudent(item)}
      activeOpacity={0.7}
    >
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentMatric}>{item.matricNumber}</Text>
        <Text style={styles.studentDept}>{item.department}</Text>
      </View>
      <TouchableOpacity
        style={styles.viewPassButton}
        onPress={() => handleViewPass(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.viewPassButtonText}>View Pass</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🔍</Text>
      {searched ? (
        <>
          <Text style={styles.emptyStateTitle}>No Results Found</Text>
          <Text style={styles.emptyStateText}>
            No student matches "{searchQuery}".{'\n'}Try a different matric number or name.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyStateTitle}>Search Students</Text>
          <Text style={styles.emptyStateText}>
            Enter a matric number or student name to search
          </Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search Student</Text>
        <Text style={styles.subtitle}>Find student by matric number or name</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter matric number or name..."
          placeholderTextColor={Colors.grey}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.searchButton, !searchQuery.trim() && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={!searchQuery.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Guide */}
      <View style={styles.guideBar}>
        <Text style={styles.guideText}>
          Enter full matric number (e.g. 2024/12345) or student name
        </Text>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.black} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderStudentItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.black,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.grey,
    marginTop: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
  },
  searchInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  searchButton: {
    backgroundColor: Colors.black,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.black,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.white,
  },
  guideBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.ultraLightGrey,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
  },
  guideText: {
    fontSize: FontSize.sm,
    color: Colors.grey,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.grey,
    marginTop: Spacing.md,
  },
  resultsList: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  studentInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  studentName: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.black,
  },
  studentMatric: {
    fontSize: FontSize.sm,
    color: Colors.grey,
    marginTop: 2,
  },
  studentDept: {
    fontSize: FontSize.sm,
    color: Colors.grey,
    marginTop: 1,
  },
  viewPassButton: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
  },
  viewPassButtonText: {
    fontSize: FontSize.sm,
    fontWeight: 'bold',
    color: Colors.black,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.grey,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default SearchStudentScreen;