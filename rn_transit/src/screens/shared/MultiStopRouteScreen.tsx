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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';

interface Stop {
  id: string;
  name: string;
  address: string;
  order: number;
}

const SUGGESTED_STOPS = [
  { id: 's1', name: 'Main Campus Gate', address: 'University Road' },
  { id: 's2', name: 'Faculty of Science', address: 'Science Block' },
  { id: 's3', name: 'Engineering Complex', address: 'Engineering Road' },
  { id: 's4', name: 'Library', address: 'Library Avenue' },
  { id: 's5', name: 'Student Hostel', address: 'Hostel Road' },
  { id: 's6', name: 'Sports Complex', address: 'Sports Drive' },
  { id: 's7', name: 'Admin Building', address: 'Administrative Zone' },
  { id: 's8', name: 'Medical Centre', address: 'Health Road' },
];

const MultiStopRouteScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [stops, setStops] = useState<Stop[]>([
    { id: '1', name: 'Main Campus Gate', address: 'University Road', order: 1 },
  ]);
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [savedRoutes, setSavedRoutes] = useState<string[]>([]);

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
    [stops.length],
  );

  const removeStop = useCallback((id: string) => {
    setStops((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      return filtered.map((s, idx) => ({ ...s, order: idx + 1 }));
    });
  }, []);

  const moveStop = useCallback(
    (id: string, direction: 'up' | 'down') => {
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
    },
    [],
  );

  const clearAll = useCallback(() => {
    setStops([{ id: '1', name: 'Main Campus Gate', address: 'University Road', order: 1 }]);
    setRouteName('');
  }, []);

  const saveRoute = useCallback(() => {
    if (!routeName.trim()) {
      Alert.alert('Route Name Required', 'Please enter a name for this route before saving.');
      return;
    }
    if (stops.length < 2) {
      Alert.alert('Too Few Stops', 'Please add at least 2 stops to save a route.');
      return;
    }
    setSavedRoutes((prev) => [...prev, routeName.trim()]);
    Alert.alert('Route Saved', `Route "${routeName.trim()}" has been saved with ${stops.length} stops.`);
    setRouteName('');
  }, [routeName, stops.length]);

  const filteredSuggestions = SUGGESTED_STOPS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchText.toLowerCase()) &&
      !stops.find((st) => st.name === s.name),
  );

  const renderStopItem = ({ item }: { item: Stop }) => (
    <View style={styles.stopCard}>
      <View style={styles.stopOrderBadge}>
        <Text style={styles.stopOrderText}>{item.order}</Text>
      </View>
      <View style={styles.stopInfo}>
        <Text style={styles.stopName}>{item.name}</Text>
        <Text style={styles.stopAddress}>{item.address}</Text>
      </View>
      <View style={styles.stopActions}>
        <TouchableOpacity
          style={[styles.stopActionButton, item.order === 1 && styles.stopActionDisabled]}
          onPress={() => moveStop(item.id, 'up')}
          disabled={item.order === 1}
          activeOpacity={0.7}
        >
          <Text style={[styles.stopActionText, item.order === 1 && styles.stopActionTextDisabled]}>
            ↑
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.stopActionButton,
            item.order === stops.length && styles.stopActionDisabled,
          ]}
          onPress={() => moveStop(item.id, 'down')}
          disabled={item.order === stops.length}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.stopActionText,
              item.order === stops.length && styles.stopActionTextDisabled,
            ]}
          >
            ↓
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.stopActionButton, styles.stopActionRemove]}
          onPress={() => removeStop(item.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.stopActionText, styles.stopActionRemoveText]}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSuggestionItem = ({
    item,
  }: {
    item: { id: string; name: string; address: string };
  }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => addStop(item.name, item.address)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionIcon}>
        <Text style={styles.suggestionIconText}>+</Text>
      </View>
      <View style={styles.suggestionInfo}>
        <Text style={styles.suggestionName}>{item.name}</Text>
        <Text style={styles.suggestionAddress}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Multi-Stop Route</Text>
        <Text style={styles.subtitle}>Plan a route with multiple stops</Text>
      </View>

      {/* Route Name */}
      <View style={styles.nameContainer}>
        <TextInput
          style={styles.nameInput}
          placeholder="Route name (optional)"
          placeholderTextColor={Colors.grey}
          value={routeName}
          onChangeText={setRouteName}
        />
      </View>

      {/* Add Stop */}
      <View style={styles.addStopContainer}>
        <TextInput
          style={styles.addStopInput}
          placeholder="Search and add stops..."
          placeholderTextColor={Colors.grey}
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            setShowSuggestions(text.length > 0);
          }}
          onFocus={() => setShowSuggestions(searchText.length > 0)}
        />
        {showSuggestions && (
          <View style={styles.suggestionsContainer}>
            {filteredSuggestions.length > 0 ? (
              <FlatList
                data={filteredSuggestions}
                keyExtractor={(item) => item.id}
                renderItem={renderSuggestionItem}
                keyboardShouldPersistTaps="handled"
                style={styles.suggestionsList}
              />
            ) : (
              <View style={styles.noSuggestions}>
                <Text style={styles.noSuggestionsText}>
                  {searchText.trim()
                    ? 'No matching locations found'
                    : 'Type to search locations'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Stops List */}
      <View style={styles.stopsSection}>
        <View style={styles.stopsHeader}>
          <Text style={styles.stopsTitle}>
            Stops ({stops.length})
          </Text>
          {stops.length > 1 && (
            <TouchableOpacity onPress={clearAll} activeOpacity={0.7}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={stops}
          keyExtractor={(item) => item.id}
          renderItem={renderStopItem}
          contentContainerStyle={styles.stopsList}
          ListEmptyComponent={
            <View style={styles.emptyStops}>
              <Text style={styles.emptyStopsText}>
                Add stops to plan your route
              </Text>
            </View>
          }
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            {stops.length} stop{stops.length !== 1 ? 's' : ''} •{' '}
            {stops.length > 1
              ? `${stops[0].name} → ${stops[stops.length - 1].name}`
              : 'Add more stops'}
          </Text>
        </View>
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[styles.footerButton, styles.saveButton]}
            onPress={saveRoute}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Save Route</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerButton, styles.previewButton]}
            onPress={() => {
              if (stops.length < 2) {
                Alert.alert('Insufficient Stops', 'Add at least 2 stops to preview.');
                return;
              }
              Alert.alert('Route Preview', `Previewing route: ${stops.map((s) => s.name).join(' → ')}`);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.previewButtonText}>Preview Route</Text>
          </TouchableOpacity>
        </View>
        {savedRoutes.length > 0 && (
          <Text style={styles.savedCount}>
            {savedRoutes.length} route{savedRoutes.length !== 1 ? 's' : ''} saved
          </Text>
        )}
      </View>
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
  nameContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
  },
  nameInput: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  addStopContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
    zIndex: 100,
  },
  addStopInput: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  suggestionsContainer: {
    marginTop: Spacing.xs,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    ...Shadows.md,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  suggestionIconText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.black,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.black,
  },
  suggestionAddress: {
    fontSize: FontSize.sm,
    color: Colors.grey,
  },
  noSuggestions: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  noSuggestionsText: {
    fontSize: FontSize.sm,
    color: Colors.grey,
  },
  stopsSection: {
    flex: 1,
  },
  stopsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  stopsTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.black,
  },
  clearAllText: {
    fontSize: FontSize.sm,
    fontWeight: 'bold',
    color: Colors.error,
  },
  stopsList: {
    padding: Spacing.lg,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  stopOrderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  stopOrderText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.white,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.black,
  },
  stopAddress: {
    fontSize: FontSize.sm,
    color: Colors.grey,
  },
  stopActions: {
    flexDirection: 'row',
    gap: 4,
  },
  stopActionButton: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  stopActionDisabled: {
    opacity: 0.3,
  },
  stopActionText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.black,
  },
  stopActionTextDisabled: {
    color: Colors.lightGrey,
  },
  stopActionRemove: {
    borderColor: Colors.error,
    backgroundColor: Colors.ultraLightGrey,
  },
  stopActionRemoveText: {
    color: Colors.error,
  },
  emptyStops: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyStopsText: {
    fontSize: FontSize.md,
    color: Colors.grey,
  },
  footer: {
    borderTopWidth: 2,
    borderTopColor: Colors.black,
    padding: Spacing.lg,
  },
  summaryCard: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.ultraLightGrey,
  },
  summaryText: {
    fontSize: FontSize.sm,
    color: Colors.black,
    fontWeight: '500',
    textAlign: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  footerButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.black,
  },
  saveButton: {
    backgroundColor: Colors.black,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.white,
  },
  previewButton: {
    backgroundColor: Colors.white,
  },
  previewButtonText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.black,
  },
  savedCount: {
    fontSize: FontSize.xs,
    color: Colors.grey,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default MultiStopRouteScreen;