import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, BorderRadius, Shadows } from '../../config/theme';

const steps = [
  { icon: '📤', title: 'Step 1', description: 'Tap the Share button at the bottom of Safari', detail: 'Look for the square icon with an upward arrow.' },
  { icon: '📲', title: 'Step 2', description: 'Scroll down and tap "Add to Home Screen"', detail: 'In the share menu, find "Add to Home Screen".' },
  { icon: '✏️', title: 'Step 3', description: 'Confirm the name and tap "Add"', detail: 'Keep the name as "DOU Transit" or customize it.' },
  { icon: '✅', title: 'Done! ✓', description: 'DOU Transit is now on your home screen', detail: 'The app works like a native app now.' },
];

export default function PwaInstallScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
        <View style={styles.logo}>
          <Text style={styles.logoText}>DOU</Text>
        </View>

        <View style={styles.stepContainer}>
          <View style={styles.stepIconBox}><Text style={styles.stepIcon}>{steps[currentStep].icon}</Text></View>
          <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
          <Text style={styles.stepDescription}>{steps[currentStep].description}</Text>
          <Text style={styles.stepDetail}>{steps[currentStep].detail}</Text>
        </View>

        <View style={styles.dots}><View style={[styles.dot, { backgroundColor: currentStep === 0 ? Colors.black : Colors.lightGrey }]} /></View>

        <View style={styles.bottom}>
          <TouchableOpacity onPress={() => setDontShowAgain(!dontShowAgain)} style={styles.checkboxRow}>
            <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]} />
            <Text style={styles.checkboxLabel}>Don't show this again</Text>
          </TouchableOpacity>
          <View style={styles.buttons}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.outlinedBtn} onPress={() => setCurrentStep(s => s - 1)}><Text style={styles.outlinedBtnText}>Back</Text></TouchableOpacity>
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { if (currentStep < steps.length - 1) setCurrentStep(s => s + 1); else navigation.goBack(); }}>
              <Text style={styles.primaryBtnText}>{currentStep < steps.length - 1 ? 'Next' : 'Got it!'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: { alignSelf: 'flex-end', padding: 8 },
  closeText: { fontSize: 20, color: Colors.black },
  logo: { width: 100, height: 100, borderRadius: 22, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center', ...Shadows.lg },
  logoText: { color: Colors.white, fontSize: 22, fontWeight: 'bold' },
  stepContainer: { alignItems: 'center', paddingHorizontal: 16 },
  stepIconBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  stepIcon: { fontSize: 36 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: Colors.grey, letterSpacing: 1, marginBottom: 8 },
  stepDescription: { fontSize: 20, fontWeight: 'bold', color: Colors.black, textAlign: 'center', marginBottom: 12 },
  stepDetail: { fontSize: FontSize.md, color: Colors.grey, textAlign: 'center', lineHeight: 22 },
  dots: { flexDirection: 'row', marginVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  bottom: { width: '100%' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: Colors.black, marginRight: 12 },
  checkboxChecked: { backgroundColor: Colors.black },
  checkboxLabel: { fontSize: FontSize.md, color: Colors.grey },
  buttons: { flexDirection: 'row', gap: 12 },
  outlinedBtn: { flex: 1, borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.md, padding: 16, alignItems: 'center' },
  outlinedBtnText: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.black },
  primaryBtn: { flex: 1, backgroundColor: Colors.black, borderRadius: BorderRadius.md, padding: 16, alignItems: 'center', ...Shadows.md },
  primaryBtnText: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.white },
});
