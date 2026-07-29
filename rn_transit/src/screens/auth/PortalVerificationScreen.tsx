import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Colors, FontSize, BorderRadius, Shadows } from '../../config/theme';

export interface PortalScrapeResult {
  matricNumber: string;
  fullName: string;
  department: string;
  faculty: string;
  level: string;
  email: string;
  profileImageBase64?: string;
}

export default function PortalVerificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [showWebView, setShowWebView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PortalScrapeResult | null>(null);
  const webViewRef = useRef<WebView>(null);
  const scrapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrapeCount = useRef(0);

  const DOU_PORTAL_URL = 'https://myportal.dou.edu.ng/';

  const SCRAPER_JS = `
(function() {
  try {
    let name = ''; let matric = ''; let dept = '';
    let faculty = ''; let level = ''; let email = '';
    let profileImage = '';

    // Find profile image
    document.querySelectorAll('img').forEach(img => {
      const s = (img.src||'').toLowerCase();
      const a = (img.alt||'').toLowerCase();
      if ((s.includes('profile')||s.includes('photo')||a.includes('profile')||a.includes('photo')) && !s.includes('logo'))
        profileImage = img.src;
    });

    // Layout 1: Tables
    document.querySelectorAll('table tr').forEach(tr => {
      const cells = tr.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const l = cells[0].innerText.trim().toLowerCase();
        const v = cells[cells.length-1].innerText.trim();
        if (l.includes('name')) name = v;
        if (l.includes('matric')||l.includes('reg no')||l.includes('reg number')) matric = v;
        if (l.includes('department')||l.includes('dept')) dept = v;
        if (l.includes('faculty')) faculty = v;
        if (l.includes('level')||l.includes('year')) level = v;
        if (l.includes('email')) email = v;
      }
    });

    // Layout 2: DL/dt/dd
    if (!name) document.querySelectorAll('dt, .label, .field-label').forEach(el => {
      const l = el.innerText.trim().toLowerCase();
      const v = (el.nextElementSibling?.innerText||el.querySelector('dd, .value')?.innerText||'').trim();
      if (l.includes('name')) name = v;
      if (l.includes('matric')||l.includes('reg')) matric = v;
      if (l.includes('department')||l.includes('dept')) dept = v;
      if (l.includes('faculty')) faculty = v;
      if (l.includes('level')||l.includes('year')) level = v;
      if (l.includes('email')) email = v;
    });

    // Layout 3: Key: value divs
    if (!name) document.querySelectorAll('.info-row, .detail-row, .field-row, .profile-row').forEach(row => {
      const l = (row.querySelector('.label, .field-label, dt')?.innerText||'').trim().toLowerCase();
      const v = (row.querySelector('.value, .field-value, dd')?.innerText||'').trim();
      if (l.includes('name')) name = v;
      if (l.includes('matric')||l.includes('reg')) matric = v;
      if (l.includes('department')||l.includes('dept')) dept = v;
      if (l.includes('faculty')) faculty = v;
      if (l.includes('level')||l.includes('year')) level = v;
      if (l.includes('email')) email = v;
    });

    // Layout 4: Input values
    if (!name) document.querySelectorAll('input[name], input[id]').forEach(inp => {
      const id = (inp.id||'').toLowerCase();
      const n = (inp.name||'').toLowerCase();
      const v = inp.value.trim();
      if (id.includes('name')||n.includes('name')) name = v;
      if (id.includes('matric')||n.includes('matric')||id.includes('regno')) matric = v;
      if (id.includes('department')||n.includes('department')) dept = v;
      if (id.includes('faculty')||n.includes('faculty')) faculty = v;
      if (id.includes('level')||n.includes('level')) level = v;
      if (id.includes('email')||n.includes('email')) email = v;
    });

    // Layout 5: Card/panel text
    if (!name) document.querySelectorAll('.card, .panel, .box, .student-card').forEach(card => {
      card.innerText.split('\\n').forEach(line => {
        const p = line.split(':');
        if (p.length===2) {
          const l = p[0].trim().toLowerCase();
          const v = p[1].trim();
          if (l.includes('name')) name = v;
          if (l.includes('matric')||l.includes('reg')) matric = v;
          if (l.includes('department')||l.includes('dept')) dept = v;
          if (l.includes('faculty')) faculty = v;
          if (l.includes('level')||l.includes('year')) level = v;
          if (l.includes('email')) email = v;
        }
      });
    });

    // Heading
    if (!name) {
      const h = document.querySelector('h1, h2, .page-title, .student-name');
      if (h) name = h.innerText.trim();
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({
      name, matric, department: dept, faculty, level, email, profileImage,
      pageTitle: document.title
    }));
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({error: e.message}));
  }
})();
`;

  const injectScraper = useCallback(() => {
    if (!webViewRef.current || result) return;
    scrapeCount.current += 1;
    if (scrapeCount.current > 15) return;
    webViewRef.current.injectJavaScript(SCRAPER_JS);
  }, [result, SCRAPER_JS]);

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
    (navState: WebViewNavigation) => {
      const url = navState.url;
      const isLogin = url.includes('login') || url === DOU_PORTAL_URL;
      const loggedIn = !isLogin && url.startsWith('https://myportal.dou.edu.ng');

      if (loggedIn && !result) {
        if (scrapeTimerRef.current) clearTimeout(scrapeTimerRef.current);
        scrapeTimerRef.current = setTimeout(injectScraper, 2000);
      }
    },
    [injectScraper, result],
  );

  const handleUseData = () => {
    if (!result) return;
    navigation.navigate('StudentRegister', { portalData: result });
  };

  const retry = () => {
    setResult(null);
    scrapeCount.current = 0;
    setTimeout(injectScraper, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      {showWebView ? (
        <View style={{ flex: 1 }}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity
              onPress={() => { setShowWebView(false); setResult(null); }}
            >
              <Text style={styles.webViewBack}>← Close</Text>
            </TouchableOpacity>
            {isLoading && <ActivityIndicator color={Colors.black} size="small" />}
            {result ? (
              <TouchableOpacity onPress={handleUseData}>
                <Text style={styles.useDataBtn}>✓ Use Data</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={retry}>
                <Text style={styles.retryBtn}>↻ Retry</Text>
              </TouchableOpacity>
            )}
          </View>

          {result && (
            <View style={styles.resultPreview}>
              <Text style={styles.resultTitle}>Profile Found</Text>
              <Field label="Name" value={result.fullName} />
              <Field label="Matric" value={result.matricNumber} />
              <Field label="Department" value={result.department} />
              <Field label="Faculty" value={result.faculty} />
              <Field label="Level" value={result.level || 'N/A'} />
              {result.email ? <Field label="Email" value={result.email} /> : null}
              {result.profileImageBase64 ? <Field label="Photo" value="✓ Captured" /> : null}
            </View>
          )}

          <View style={{ flex: 1 }}>
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

          <View style={styles.webViewFooter}>
            <Text style={styles.footerText}>
              {result
                ? 'Tap "Use Data" to continue registration.'
                : 'Log into the portal. Your profile will be auto-detected.'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.icon}>🎓</Text>
          <Text style={styles.title}>Verify via DOU Portal</Text>
          <Text style={styles.subtitle}>
            Open the DOU Student Portal to verify your details automatically.
          </Text>
          <TouchableOpacity
            style={styles.openButton}
            onPress={() => { setShowWebView(true); scrapeCount.current = 0; }}
          >
            <Text style={styles.openButtonText}>Open Portal</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.skipText}>Skip portal verification</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
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
  skipText: { color: Colors.grey, fontSize: FontSize.sm, marginTop: 16, textDecorationLine: 'underline' },
  webViewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderBottomWidth: 2, borderBottomColor: Colors.black, backgroundColor: Colors.white,
  },
  webViewBack: { fontSize: FontSize.md, color: Colors.black, fontWeight: '600' },
  useDataBtn: { fontSize: FontSize.md, color: Colors.success, fontWeight: 'bold' },
  retryBtn: { fontSize: FontSize.md, color: Colors.black, fontWeight: '600' },
  resultPreview: {
    margin: 8, padding: 12, backgroundColor: '#e8f5e9', borderRadius: BorderRadius.md,
    borderWidth: 2, borderColor: Colors.success,
  },
  resultTitle: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.black, marginBottom: 8 },
  fieldRow: { flexDirection: 'row', paddingVertical: 2 },
  fieldLabel: { width: 90, fontSize: FontSize.sm, color: Colors.grey },
  fieldValue: { flex: 1, fontSize: FontSize.sm, fontWeight: '500', color: Colors.black },
  webViewFooter: { padding: 12, backgroundColor: Colors.black },
  footerText: { color: Colors.white, fontSize: FontSize.sm, textAlign: 'center' },
});
