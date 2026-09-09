import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { API } from '../../config/api';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { PortalResultCard } from './components/PortalResultCard';

// Only import WebView on native platforms
let WebView: any = null;
let SCRAPER_JS: string = '';
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
    SCRAPER_JS = require('./components/PortalScraperScript').SCRAPER_JS;
  } catch (_) {}
}

export interface PortalScrapeResult {
  matricNumber: string;
  fullName: string;
  department: string;
  faculty: string;
  level: string;
  email: string;
  profileImageBase64?: string;
}

type PortalRouteParams = {
  PortalVerification: { fromLogin?: boolean } | undefined;
};

export default function PortalVerificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<PortalRouteParams, 'PortalVerification'>>();
  const { login } = useAuthStore();

  const [showWebView, setShowWebView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PortalScrapeResult | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [existingUser, setExistingUser] = useState<{
    exists: boolean;
    email?: string;
  } | null>(null);

  // Web-only: manual entry state
  const [webManualEntry, setWebManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualMatric, setManualMatric] = useState('');
  const [manualDept, setManualDept] = useState('');
  const [manualFaculty, setManualFaculty] = useState('');
  const [manualLevel, setManualLevel] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  // Native-only refs
  const webViewRef = useRef<any>(null);
  const scrapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrapeCount = useRef(0);

  const DOU_PORTAL_URL = API.douPortalUrl;
  const fromLogin = route.params?.fromLogin ?? false;

  // === Native-only handlers ===
  const injectScraper = useCallback(() => {
    if (Platform.OS === 'web' || !webViewRef.current || result) return;
    scrapeCount.current += 1;
    if (scrapeCount.current > 15) return;
    webViewRef.current.injectJavaScript(SCRAPER_JS);
  }, [result]);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.error) return;
      const studentName = data.name || '';
      const matricNo = data.matric || '';
      if (studentName && matricNo) {
        setResult({
          matricNumber: matricNo,
          fullName: studentName,
          department: data.department || '',
          faculty: data.faculty || '',
          level: data.level || '',
          email: data.email || '',
          profileImageBase64: data.profileImage || undefined,
        });
      }
    } catch (_) {}
  }, []);

  const handleNavigationStateChange = useCallback(
    (navState: any) => {
      if (navState.loading) return;
      if (navState.url && navState.url.startsWith('https://') && !navState.url.includes('login') && !result) {
        if (scrapeTimerRef.current) clearTimeout(scrapeTimerRef.current);
        scrapeTimerRef.current = setTimeout(injectScraper, 2000);
      }
    },
    [injectScraper, result],
  );

  // === Shared handlers ===
  const checkExistingAccount = useCallback(async (matric: string) => {
    try {
      const res = await api.post('/api/auth/portal-check', { matricNumber: matric });
      if (res.exists) {
        setExistingUser({ exists: true, email: res.email as string });
      } else {
        setExistingUser({ exists: false });
      }
    } catch {
      setExistingUser({ exists: false });
    }
  }, []);

  useEffect(() => {
    if (result && result.matricNumber) {
      checkExistingAccount(result.matricNumber);
    }
  }, [result, checkExistingAccount]);

  const goToRegistration = () => {
    if (!result) return;
    navigation.navigate('StudentRegister', { portalData: result });
  };

  const handleLogin = async () => {
    if (!result || !existingUser?.email) return;
    setLoginLoading(true);
    setLoginError('');
    navigation.navigate('Login', { prefilledEmail: existingUser.email });
    setLoginLoading(false);
  };

  const retry = () => {
    setResult(null);
    setExistingUser(null);
    setLoginError('');
    scrapeCount.current = 0;
    if (Platform.OS !== 'web') {
      setTimeout(injectScraper, 1000);
    }
  };

  // === Web: open portal in new tab, then show manual entry form ===
  const handleWebPortalOpen = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(DOU_PORTAL_URL, '_blank');
    }
    setWebManualEntry(true);
    setShowWebView(true);
  };

  const handleWebManualSubmit = () => {
    if (!manualName.trim() || !manualMatric.trim()) return;
    setResult({
      matricNumber: manualMatric.trim(),
      fullName: manualName.trim(),
      department: manualDept.trim(),
      faculty: manualFaculty.trim(),
      level: manualLevel.trim(),
      email: manualEmail.trim(),
    });
    setWebManualEntry(false);
  };

  // === Render ===
  return (
    <SafeAreaView style={styles.container}>
      {showWebView ? (
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.webViewHeader}>
            <TouchableOpacity
              onPress={() => { setShowWebView(false); setResult(null); setExistingUser(null); setWebManualEntry(false); }}
            >
              <Text style={styles.webViewBack}>← Close</Text>
            </TouchableOpacity>
            {isLoading && <ActivityIndicator color={Colors.black} size="small" />}
            {!result ? (
              <TouchableOpacity onPress={retry}>
                <Text style={styles.retryBtn}>↻ Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Result preview */}
          {result && (
            <ScrollView style={styles.resultContainer}>
              <PortalResultCard
                result={result}
                existingUser={existingUser}
                loginLoading={loginLoading}
                loginError={loginError}
                onLogin={handleLogin}
                onRegister={goToRegistration}
                onCancel={() => { setShowWebView(false); setResult(null); setExistingUser(null); }}
              />
            </ScrollView>
          )}

          {/* Platform-specific content */}
          {Platform.OS === 'web' ? (
            // WEB: Manual entry form (portal opened in new tab)
            !result && webManualEntry ? (
              <ScrollView style={styles.webFormContainer} contentContainerStyle={styles.webFormContent}>
                <Text style={styles.webFormTitle}>📋 Enter Your Portal Details</Text>
                <Text style={styles.webFormSubtitle}>
                  The DOU Portal has been opened in a new tab. Log in there, then copy your details below.
                </Text>

                <TextInput style={styles.webInput} placeholder="Full Name *" value={manualName} onChangeText={setManualName} placeholderTextColor={Colors.grey} />
                <TextInput style={styles.webInput} placeholder="Matric Number *" value={manualMatric} onChangeText={setManualMatric} placeholderTextColor={Colors.grey} />
                <TextInput style={styles.webInput} placeholder="Department" value={manualDept} onChangeText={setManualDept} placeholderTextColor={Colors.grey} />
                <TextInput style={styles.webInput} placeholder="Faculty" value={manualFaculty} onChangeText={setManualFaculty} placeholderTextColor={Colors.grey} />
                <TextInput style={styles.webInput} placeholder="Level (e.g. 400)" value={manualLevel} onChangeText={setManualLevel} placeholderTextColor={Colors.grey} />
                <TextInput style={styles.webInput} placeholder="Email" value={manualEmail} onChangeText={setManualEmail} keyboardType="email-address" placeholderTextColor={Colors.grey} />

                <TouchableOpacity
                  style={[styles.webSubmitBtn, (!manualName.trim() || !manualMatric.trim()) && styles.webSubmitBtnDisabled]}
                  onPress={handleWebManualSubmit}
                  disabled={!manualName.trim() || !manualMatric.trim()}
                >
                  <Text style={styles.webSubmitBtnText}>Verify Details</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { if (typeof window !== 'undefined') window.open(DOU_PORTAL_URL, '_blank'); }} style={{ marginTop: 12 }}>
                  <Text style={styles.reopenLink}>🔗 Re-open DOU Portal</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null
          ) : (
            // NATIVE: WebView with auto-scraping
            WebView ? (
              <View style={{ flex: result ? 0 : 1, height: result ? 200 : undefined }}>
                <WebView
                  ref={webViewRef}
                  source={{ uri: DOU_PORTAL_URL }}
                  style={{ flex: 1 }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  onLoadStart={() => setIsLoading(true)}
                  onLoadEnd={() => setIsLoading(false)}
                  onNavigationStateChange={handleNavigationStateChange}
                  onMessage={handleMessage}
                />
              </View>
            ) : (
              <View style={styles.unsupportedContainer}>
                <Text style={styles.unsupportedText}>WebView not available on this platform.</Text>
              </View>
            )
          )}

          {!result && Platform.OS !== 'web' && (
            <View style={styles.webViewFooter}>
              <Text style={styles.footerText}>
                Log into the portal. Your profile will be auto-detected.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.icon}>🎓</Text>
          <Text style={styles.title}>Verify via DOU Portal</Text>
          <Text style={styles.subtitle}>
            {fromLogin
              ? 'Log into the DOU Portal to auto-fill your details and sign in.'
              : Platform.OS === 'web'
                ? 'The DOU Portal will open in a new tab. Copy your details back here to verify.'
                : 'Open the DOU Student Portal to verify your details automatically.'}
          </Text>
          <TouchableOpacity
            style={styles.openButton}
            onPress={Platform.OS === 'web' ? handleWebPortalOpen : () => { setShowWebView(true); scrapeCount.current = 0; }}
          >
            <Text style={styles.openButtonText}>
              {Platform.OS === 'web' ? 'Open Portal & Enter Details' : 'Open Portal'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={styles.skipText}>
              {fromLogin ? 'Back to Login' : 'Skip portal verification'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.black, textAlign: 'center' },
  subtitle: { fontSize: FontSize.md, color: Colors.grey, textAlign: 'center', marginVertical: 16, lineHeight: 22 },
  openButton: { backgroundColor: Colors.black, paddingVertical: 16, paddingHorizontal: 48, borderRadius: BorderRadius.md, ...Shadows.lg },
  openButtonText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: 'bold' },
  skipText: { color: Colors.grey, fontSize: FontSize.sm, textDecorationLine: 'underline' },
  webViewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderBottomWidth: 2, borderBottomColor: Colors.black, backgroundColor: Colors.white,
  },
  webViewBack: { fontSize: FontSize.md, color: Colors.black, fontWeight: '600' },
  retryBtn: { fontSize: FontSize.md, color: Colors.black, fontWeight: '600' },
  resultContainer: { maxHeight: 320, backgroundColor: '#f0f8f0' },
  webViewFooter: { padding: 12, backgroundColor: Colors.black },
  footerText: { color: Colors.white, fontSize: FontSize.sm, textAlign: 'center' },
  // Web manual entry styles
  webFormContainer: { flex: 1, backgroundColor: Colors.white },
  webFormContent: { padding: 24 },
  webFormTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.black, marginBottom: 8 },
  webFormSubtitle: { fontSize: FontSize.md, color: Colors.grey, marginBottom: 24, lineHeight: 22 },
  webInput: {
    borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.sm,
    padding: 14, fontSize: FontSize.md, marginBottom: 12, color: Colors.black,
    backgroundColor: Colors.white,
  },
  webSubmitBtn: { backgroundColor: Colors.black, padding: 16, borderRadius: BorderRadius.sm, alignItems: 'center', marginTop: 8 },
  webSubmitBtnDisabled: { opacity: 0.4 },
  webSubmitBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.lg },
  reopenLink: { color: Colors.black, fontSize: FontSize.md, textAlign: 'center', textDecorationLine: 'underline', fontWeight: '600' },
  unsupportedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  unsupportedText: { fontSize: FontSize.md, color: Colors.grey, textAlign: 'center' },
});


