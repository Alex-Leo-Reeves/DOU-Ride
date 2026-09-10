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
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Globe,
  Lock,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { Colors, FontSize, BorderRadius, Shadows, Spacing } from '../../config/theme';
import { API } from '../../config/api';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { PortalResultCard } from './components/PortalResultCard';
import { DouCard } from '../../components/DouCard';
import { Routes } from '../../config/routes';

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

  // Manual fallback state
  const [manualMatric, setManualMatric] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualDept, setManualDept] = useState('');
  const [manualFaculty, setManualFaculty] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  const webViewRef = useRef<any>(null);

  const checkMatric = useCallback(async (matric: string) => {
    try {
      const res: any = await api.get(`/api/auth/check-matric?matricNumber=${encodeURIComponent(matric)}`);
      if (res && res.exists) {
        setExistingUser({ exists: true, email: res.email || undefined });
      } else {
        setExistingUser({ exists: false });
      }
    } catch {
      setExistingUser({ exists: false });
    }
  }, []);

  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'PORTAL_DATA' && data.payload) {
          setShowWebView(false);
          setIsLoading(false);
          setResult(data.payload);
          checkMatric(data.payload.matricNumber);
        }
      } catch {}
    },
    [checkMatric]
  );

  const handleManualSubmit = async () => {
    if (!manualMatric.trim() || !manualName.trim()) return;
    setIsLoading(true);
    const manualResult: PortalScrapeResult = {
      matricNumber: manualMatric.trim().toUpperCase(),
      fullName: manualName.trim(),
      department: manualDept.trim() || '',
      faculty: manualFaculty.trim() || '',
      level: '300',
      email: manualEmail.trim() || `${manualMatric.replace(/\//g, '').toLowerCase()}@dou.edu.ng`,
    };
    setResult(manualResult);
    await checkMatric(manualResult.matricNumber);
    setIsLoading(false);
  };



  const handleLoginExisting = async () => {
    if (!existingUser?.email) return;
    setLoginLoading(true);
    setLoginError('');
    navigation.navigate(Routes.login, { prefilledEmail: existingUser.email });
    setLoginLoading(false);
  };

  const handleRegisterNew = () => {
    if (!result) return;
    navigation.navigate(Routes.studentRegister, { portalData: result });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Portal Instant Verification</Text>
          <Text style={styles.headerSubtitle}>Official Dennis Osadebay University Sync</Text>
        </View>
      </View>

      {/* In-App WebView if launched on native */}
      {showWebView && WebView && (
        <View style={styles.webViewContainer}>
          <View style={styles.webViewBar}>
            <Text style={styles.webViewBarText}>Log in to DOU Portal to auto-verify</Text>
            <TouchableOpacity onPress={() => setShowWebView(false)}>
              <Text style={styles.webViewClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <WebView
            ref={webViewRef}
            source={{ uri: (API as any).douPortalUrl || (API as any).portalUrl || 'https://dou.edu.ng/portal' }}
            injectedJavaScript={SCRAPER_JS}
            onMessage={handleMessage}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            style={{ flex: 1 }}
          />
          {isLoading && (
            <View style={styles.webLoadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        </View>
      )}

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!result ? (
          <>
            {/* Explainer Hero */}
            <DouCard variant="accent" padding={Spacing.lg} style={styles.heroCard}>
              <View style={styles.iconCircle}>
                <Globe size={28} color={Colors.primary} />
              </View>
              <Text style={styles.heroTitle}>Direct University Authentication</Text>
              <Text style={styles.heroSub}>
                Verify your matriculation status directly against the university database.
                Your course registration and faculty data are automatically synced into your DOU Ride pass.
              </Text>
            </DouCard>

            {/* Native WebView Launch Button */}
            {Platform.OS !== 'web' && WebView ? (
              <TouchableOpacity
                style={styles.launchBtn}
                onPress={() => setShowWebView(true)}
                activeOpacity={0.8}
              >
                <Globe size={18} color={Colors.white} />
                <Text style={styles.launchBtnText}>Open DOU Student Portal</Text>
              </TouchableOpacity>
            ) : null}



            {/* Manual Matric Fallback */}
            <View style={styles.manualSection}>
              <Text style={styles.manualHeading}>Or Enter Details Manually</Text>

              <TextInput
                style={styles.input}
                placeholder="Matriculation No. (e.g. DOU/2022/SCI/0491)"
                placeholderTextColor={Colors.slate400}
                value={manualMatric}
                onChangeText={setManualMatric}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.slate400}
                value={manualName}
                onChangeText={setManualName}
              />
              <TextInput
                style={styles.input}
                placeholder="Department (e.g. Computer Science)"
                placeholderTextColor={Colors.slate400}
                value={manualDept}
                onChangeText={setManualDept}
              />

              <TouchableOpacity
                style={[
                  styles.manualBtn,
                  (!manualMatric.trim() || !manualName.trim()) && styles.manualBtnDisabled,
                ]}
                onPress={handleManualSubmit}
                disabled={!manualMatric.trim() || !manualName.trim()}
              >
                <Text style={styles.manualBtnText}>Verify Record</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <PortalResultCard
            result={result}
            existingUser={existingUser}
            loginLoading={loginLoading}
            loginError={loginError}
            onLogin={handleLoginExisting}
            onRegister={handleRegisterNew}
            onCancel={() => setResult(null)}
          />
        )}
      </ScrollView>
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
  heroCard: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
    textAlign: 'center',
    lineHeight: 18,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  launchBtnText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  demoCard: {
    marginBottom: Spacing.md,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  demoTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  demoSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginBottom: Spacing.sm,
  },
  demoBtn: {
    backgroundColor: Colors.primary + '15',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  demoBtnText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  manualSection: {
    marginTop: Spacing.sm,
    gap: 8,
  },
  manualHeading: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate900,
  },
  manualBtn: {
    backgroundColor: Colors.slate900,
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  manualBtnDisabled: {
    opacity: 0.5,
  },
  manualBtnText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  webViewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    zIndex: 99,
  },
  webViewBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.slate900,
  },
  webViewBarText: {
    color: Colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.xs,
  },
  webViewClose: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
  },
  webLoadingOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});
