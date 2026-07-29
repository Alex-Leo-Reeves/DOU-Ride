import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useQueueStore } from '../../stores/queueStore';
import { useRideStore } from '../../stores/rideStore';
import { useAuthStore } from '../../stores/authStore';
import { API } from '../../config/api';

export default function StudentQueueScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { entries, isLoading, fetchQueueStatus, leaveQueue } = useQueueStore();
  const { currentTripId, tripStatus, boardingPin } = useRideStore();
  const queue = entries[0];

  useEffect(() => {
    const interval = setInterval(() => fetchQueueStatus(user?.userId ?? '', user?.token), 15000);
    return () => clearInterval(interval);
  }, []);

  if (tripStatus === 'accepted' || tripStatus === 'boarding') {
    navigation.replace(Routes.studentQueueCalled);
    return null;
  }

  const handleLeave = async () => {
    if (queue) { await leaveQueue(queue.queueId, user?.token); }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.ticketNum}>#{queue?.queueId?.substring(0, 4) ?? '--'}</Text>
        <Text style={styles.destName}>{queue?.destinationName ?? ''}</Text>

        {queue ? (
          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statValue}>{queue.position}</Text><Text style={styles.statLabel}>Ahead</Text></View>
            <View style={styles.divider} />
            <View style={styles.stat}><Text style={styles.statValue}>{Math.ceil((queue.estimatedWait ?? 0) / 60)}m</Text><Text style={styles.statLabel}>Wait</Text></View>
          </View>
        ) : (
          <ActivityIndicator color={Colors.black} />
        )}

        <ActivityIndicator color={Colors.black} style={{ marginTop: 32 }} />
        <Text style={styles.waitText}>Waiting for your turn...</Text>
        <Text style={styles.hintText}>You'll be notified when it's time to board.</Text>

        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
          <Text style={styles.leaveBtnText}>Leave Queue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  ticketNum: { fontSize: 80, fontWeight: 'bold', color: Colors.black },
  destName: { fontSize: FontSize.xl, color: Colors.grey, marginBottom: 48 },
  statsRow: { flexDirection: 'row', borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.md, padding: 24, width: '100%', justifyContent: 'space-evenly' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: FontSize.sm, color: Colors.grey },
  divider: { width: 1, backgroundColor: Colors.black },
  waitText: { fontSize: FontSize.lg, color: Colors.grey, marginTop: 16 },
  hintText: { fontSize: FontSize.sm, color: Colors.lightGrey, marginTop: 4 },
  leaveBtn: { marginTop: 32, padding: 12 },
  leaveBtnText: { color: Colors.error, fontWeight: 'bold', fontSize: FontSize.md },
});
