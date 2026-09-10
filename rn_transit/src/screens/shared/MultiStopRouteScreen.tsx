import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  StyleSheet,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Route,
  MapPin,
  Flag,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  CheckCircle2,
  Navigation,
  Car,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { DouCard } from '../../components/DouCard';

interface Stop {
  id: string;
  name: string;
  address: string;
  order: number;
}

const SUGGESTED_STOPS = [
  { id: 's1', name: 'Main Campus Gate', address: 'University Road' },
  { id: 's2', name: 'Faculty of Science', address: 'Science Complex' },
  { id: 's3', name: 'Faculty of Law Walkway', address: 'Law Building' },
  { id: 's4', name: 'ETF Lecture Theatre', address: 'Academic Quad' },
  { id: 's5', name: 'NDDC Female Hostel', address: 'Hostel Block A' },
  { id: 's6', name: 'School Park Terminal', address: 'Transit Hub' },
  { id: 's7', name: 'DOU Medical Center', address: 'Health Clinic Road' },
  { id: 's8', name: 'Library & ICT Complex', address: 'Senate Drive' },
];

export default function MultiStopRouteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [stops, setStops] = useState<Stop[]>([
    { id: '1', name: 'School Park Terminal', address: 'Transit Hub', order: 1 },
    { id: '2', name: 'Faculty of Science', address: 'Science Complex', order: 2 },
    { id: '3', name: 'NDDC Female Hostel', address: 'Hostel Block A', order: 3 },
  ]);
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [routeName, setRouteName] = useState('');

  const addStop = useCallback(
    (name: string, address: string) => {
      const newStop: Stop = {
        id: `stop-${Date.now()}`,
        name,
        address,
        order: stops.length + 1,
      };
      setStops((prev) => [...prev, newStop]);
      setSearchText('');
      setShowSuggestions(false);
    },
    [stops.length]
  );

  const removeStop = useCallback((id: string) => {
    setStops((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      return filtered.map((s, idx) => ({ ...s, order: idx + 1 }));
    });
  }, []);

  const moveStop = useCallback((id: string, direction: 'up' | 'down') => {
    setStops((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (
        (direction === 'up' && idx === 0) ||
        (direction === 'down' && idx === prev.length - 1)
      ) {
        return prev;
      }
      const newStops = [...prev];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newStops[idx], newStops[targetIdx]] = [newStops[targetIdx], newStops[idx]];
      return newStops.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }, []);

  const saveRoute = useCallback(() => {
    if (!routeName.trim()) {
      Alert.alert('Route Name Required', 'Please enter a name for this transit itinerary.');
      return;
    }
    if (stops.length < 2) {
      Alert.alert('Too Few Stops', 'Add at least 2 stops to plot a transit path.');
      return;
    }
    Alert.alert('Route Saved', `"${routeName.trim()}" with ${stops.length} campus stops is ready.`);
    setRouteName('');
  }, [routeName, stops.length]);

  const filteredSuggestions = SUGGESTED_STOPS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchText.toLowerCase()) &&
      !stops.find((st) => st.name === s.name)
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Multi-Stop Transit Path</Text>
          <Text style={styles.headerSubtitle}>Route planner for 4-passenger Keke drop-offs</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Route Overview Banner */}
        <DouCard variant="accent" padding={Spacing.md} style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewIconWrap}>
              <Route size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.overviewTitle}>Optimized Keke Sequence</Text>
              <Text style={styles.overviewSub}>
                {stops.length} stops • Estimated transit time: ~{stops.length * 3} mins
              </Text>
            </View>
            <View style={styles.farePill}>
              <Text style={styles.farePillText}>₦{stops.length * 100}</Text>
            </View>
          </View>
        </DouCard>

        {/* Timeline Sequence */}
        <Text style={styles.sectionLabel}>Stop Sequence</Text>
        <View style={styles.timelineBox}>
          {stops.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === stops.length - 1;

            return (
              <View key={stop.id} style={styles.timelineItem}>
                {/* Node & Connector */}
                <View style={styles.nodeColumn}>
                  <View
                    style={[
                      styles.nodeCircle,
                      isFirst && styles.nodeFirst,
                      isLast && styles.nodeLast,
                    ]}
                  >
                    {isFirst ? (
                      <Car size={12} color={Colors.white} />
                    ) : isLast ? (
                      <Flag size={12} color={Colors.white} />
                    ) : (
                      <Text style={styles.nodeOrderText}>{stop.order}</Text>
                    )}
                  </View>
                  {!isLast && <View style={styles.nodeConnector} />}
                </View>

                {/* Stop Content Card */}
                <DouCard variant="elevated" padding={Spacing.sm} style={styles.stopCard}>
                  <View style={styles.stopCardContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopName}>{stop.name}</Text>
                      <Text style={styles.stopAddress}>{stop.address}</Text>
                    </View>

                    {/* Order Controls */}
                    <View style={styles.controlsRow}>
                      <TouchableOpacity
                        style={[styles.controlBtn, isFirst && styles.controlBtnDisabled]}
                        onPress={() => moveStop(stop.id, 'up')}
                        disabled={isFirst}
                      >
                        <ChevronUp size={16} color={isFirst ? Colors.slate300 : Colors.slate700} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.controlBtn, isLast && styles.controlBtnDisabled]}
                        onPress={() => moveStop(stop.id, 'down')}
                        disabled={isLast}
                      >
                        <ChevronDown size={16} color={isLast ? Colors.slate300 : Colors.slate700} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.controlBtn, { backgroundColor: Colors.error + '10' }]}
                        onPress={() => removeStop(stop.id)}
                      >
                        <Trash2 size={14} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </DouCard>
              </View>
            );
          })}
        </View>

        {/* Add Stop Search Box */}
        <Text style={styles.sectionLabel}>Add Waypoint / Stop</Text>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search campus landmarks (e.g. Science, Hostel)..."
            placeholderTextColor={Colors.slate400}
            value={searchText}
            onChangeText={(txt) => {
              setSearchText(txt);
              setShowSuggestions(txt.length > 0);
            }}
          />
        </View>

        {showSuggestions && (
          <View style={styles.suggestionsList}>
            {filteredSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionRow}
                onPress={() => addStop(item.name, item.address)}
              >
                <Plus size={16} color={Colors.primary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.suggestionName}>{item.name}</Text>
                  <Text style={styles.suggestionAddress}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Save Route Section */}
        <Text style={styles.sectionLabel}>Save as Itinerary</Text>
        <View style={styles.saveWrap}>
          <TextInput
            style={styles.saveInput}
            placeholder="Itinerary Name (e.g. Morning Hostel Run)"
            placeholderTextColor={Colors.slate400}
            value={routeName}
            onChangeText={setRouteName}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveRoute}>
            <Save size={16} color={Colors.white} />
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  content: {
    padding: Spacing.lg,
  },
  overviewCard: {
    marginBottom: Spacing.md,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  overviewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  overviewSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 2,
  },
  farePill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  farePillText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
    marginBottom: 8,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineBox: {
    marginBottom: Spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  nodeColumn: {
    alignItems: 'center',
    width: 24,
  },
  nodeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.slate700,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeFirst: {
    backgroundColor: Colors.primary,
  },
  nodeLast: {
    backgroundColor: Colors.success,
  },
  nodeOrderText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  nodeConnector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.slate200,
    marginVertical: 4,
  },
  stopCard: {
    flex: 1,
    marginBottom: Spacing.sm,
  },
  stopCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stopName: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  stopAddress: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  controlBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnDisabled: {
    opacity: 0.4,
  },
  searchWrap: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: Spacing.xs,
    ...Shadows.sm,
  },
  searchInput: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate900,
    padding: 0,
  },
  suggestionsList: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  suggestionName: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate900,
  },
  suggestionAddress: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  saveWrap: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  saveInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate900,
    ...Shadows.sm,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    ...Shadows.sm,
  },
  saveBtnText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
});