import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ShoppingBag,
  Utensils,
  Coffee,
  BookOpen,
  ChevronLeft,
  Plus,
  Minus,
  CheckCircle2,
  ShieldCheck,
  Package,
  Car,
  Sparkles,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { useWalletStore } from '../../stores/walletStore';
import { DouCard } from '../../components/DouCard';

const SAMPLE_VENDORS = [
  {
    id: 'v-1',
    name: 'Mummy B Kitchen (Buttery)',
    category: 'Hot Meals',
    icon: Utensils,
    rating: '4.8 ★',
    location: 'Main Cafeteria Hub',
    items: [
      { id: 'p-1', name: 'Jollof Rice + Fried Chicken', price: 1200, desc: 'Hot smoky jollof with spiced chicken piece' },
      { id: 'p-2', name: 'Fried Rice + Crispy Turkey', price: 1500, desc: 'Veggies, sweet corn, and golden fried turkey' },
      { id: 'p-3', name: 'Beans + Fried Plantain (Dodo)', price: 800, desc: 'Steamed honey beans with sweet dodo slices' },
      { id: 'p-4', name: 'Meat Pie & Cold Drink Combo', price: 700, desc: 'Freshly baked beef pie with chilled soda' },
    ],
  },
  {
    id: 'v-2',
    name: 'Chidi Campus Provisions',
    category: 'Snacks & Drinks',
    icon: Coffee,
    rating: '4.9 ★',
    location: 'Hostel 1 Junction',
    items: [
      { id: 'p-5', name: 'Pure Water Bag (20 Sachets)', price: 300, desc: 'Chilled DOU certified pure water' },
      { id: 'p-6', name: 'Golden Morn + Milk Sachet', price: 600, desc: 'Instant energy breakfast cereal' },
      { id: 'p-7', name: 'Indomie Hungryman + 2 Eggs', price: 1100, desc: 'Cooked with fresh peppers & boiled eggs' },
    ],
  },
  {
    id: 'v-3',
    name: 'DOU Handout & Print Center',
    category: 'Academic Stationery',
    icon: BookOpen,
    rating: '4.7 ★',
    location: 'Faculty of Science Arcade',
    items: [
      { id: 'p-8', name: 'GST 101 Lecture Summary', price: 500, desc: 'Full compilation with past question booklet' },
      { id: 'p-9', name: 'Hardcover Notebook 60 Leaves', price: 450, desc: 'Durable spiral lecture notebook' },
      { id: 'p-10', name: 'Lab Practical Coat (White)', price: 3500, desc: 'Required lab wear for chemistry & biology' },
    ],
  },
];

export default function StudentMarketplaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { vendors, products, isLoading, fetchVendors, placeOrder } = useMarketplaceStore();
  const { balance } = useWalletStore();

  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Hot Meals' | 'Snacks' | 'Academic'>('All');
  const [activeVendor, setActiveVendor] = useState<any | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderPin, setOrderPin] = useState('305');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVendors(user?.token);
  }, [fetchVendors, user?.token]);

  const displayedVendors = SAMPLE_VENDORS.filter((v) => {
    if (selectedCategory === 'Hot Meals') return v.category === 'Hot Meals';
    if (selectedCategory === 'Snacks') return v.category === 'Snacks & Drinks';
    if (selectedCategory === 'Academic') return v.category === 'Academic Stationery';
    return true;
  });

  const cartTotal = activeVendor
    ? activeVendor.items.reduce((sum: number, item: any) => sum + item.price * (cart[item.id] || 0), 0)
    : 0;

  const totalItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const handlePlaceOrder = async () => {
    if (cartTotal > balance) {
      Alert.alert('Insufficient Balance', 'Please top up your DOU Transit wallet to place this order.');
      return;
    }
    setIsSubmitting(true);
    const randomPin = Math.floor(100 + Math.random() * 900).toString();
    setOrderPin(randomPin);
    setTimeout(() => {
      setIsSubmitting(false);
      setOrderPlaced(true);
    }, 600);
  };

  if (orderPlaced) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          <View style={styles.successIconBox}>
            <CheckCircle2 size={54} color={Colors.success} strokeWidth={2.5} />
          </View>

          <Text style={styles.successTitle}>Order Sent to Kitchen!</Text>
          <Text style={styles.successSub}>
            {activeVendor?.name || 'Vendor'} is currently packing your order. An idle campus Keke driver has been assigned for delivery.
          </Text>

          {/* Package PIN Box */}
          <DouCard variant="elevated" style={styles.pinCard}>
            <Text style={styles.pinCardLabel}>YOUR 3-DIGIT PACKAGE PIN</Text>
            <Text style={styles.pinCardValue}>{orderPin}</Text>
            <Text style={styles.pinCardHint}>
              State this 3-digit PIN to the Keke driver at your hostel gate to collect your food. Prevents order mix-ups!
            </Text>
          </DouCard>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => {
              setOrderPlaced(false);
              setActiveVendor(null);
              setCart({});
              navigation.navigate(Routes.studentHome);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>BACK TO HOME</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (activeVendor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setActiveVendor(null);
              setCart({});
            }}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <ChevronLeft size={22} color={Colors.slate900} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {activeVendor.name}
            </Text>
            <Text style={styles.headerSub}>{activeVendor.location}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.vendorHeaderBanner}>
            <Text style={styles.vendorRating}>{activeVendor.rating}</Text>
            <Text style={styles.vendorDeliveryTag}>Delivered by Idle Keke Drivers to your Hostel</Text>
          </View>

          <Text style={styles.sectionHeader}>AVAILABLE MENU & ITEMS</Text>
          <View style={{ gap: 10 }}>
            {activeVendor.items.map((item: any) => {
              const qty = cart[item.id] || 0;
              return (
                <DouCard key={item.id} variant="default" style={styles.productCard}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productDesc}>{item.desc}</Text>
                    <Text style={styles.productPrice}>₦{item.price.toLocaleString()}</Text>
                  </View>

                  <View style={styles.stepperBox}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() =>
                        setCart((c) => ({
                          ...c,
                          [item.id]: Math.max(0, qty - 1),
                        }))
                      }
                      activeOpacity={0.8}
                    >
                      <Minus size={14} color={Colors.slate900} strokeWidth={2.5} />
                    </TouchableOpacity>

                    <Text style={styles.stepperCount}>{qty}</Text>

                    <TouchableOpacity
                      style={[styles.stepperBtn, { backgroundColor: Colors.slate900 }]}
                      onPress={() =>
                        setCart((c) => ({
                          ...c,
                          [item.id]: qty + 1,
                        }))
                      }
                      activeOpacity={0.8}
                    >
                      <Plus size={14} color={Colors.white} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </DouCard>
              );
            })}
          </View>
        </ScrollView>

        {cartTotal > 0 && (
          <View style={styles.checkoutBar}>
            <View>
              <Text style={styles.cartTotalLabel}>
                {totalItemsCount} item{totalItemsCount > 1 ? 's' : ''} in cart
              </Text>
              <Text style={styles.cartTotalAmount}>₦{cartTotal.toLocaleString()}</Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={handlePlaceOrder}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.checkoutBtnText}>PAY VIA WALLET</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={22} color={Colors.slate900} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>DOU Campus Market</Text>
          <Text style={styles.headerSub}>Cafeteria & Logistics Hub</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.marketBanner}>
          <View style={styles.marketBannerLeft}>
            <Sparkles size={18} color={Colors.white} strokeWidth={2.5} style={{ marginRight: 8 }} />
            <Text style={styles.marketBannerTitle}>Keke Errand Delivery</Text>
          </View>
          <Text style={styles.marketBannerSub}>
            Order food or study materials from the buttery. Free campus Kekes deliver directly to your hostel gate!
          </Text>
        </View>

        {/* Category Tabs */}
        <View style={styles.categoryRow}>
          {['All', 'Hot Meals', 'Snacks', 'Academic'].map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryTab, isSelected && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(cat as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryTabText, isSelected && styles.categoryTabTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Vendor Cards */}
        <Text style={styles.sectionHeader}>CAMPUS VENDORS</Text>
        <View style={{ gap: 12 }}>
          {displayedVendors.map((vendor) => {
            const IconComp = vendor.icon;
            return (
              <DouCard
                key={vendor.id}
                variant="elevated"
                style={styles.vendorCard}
                onPress={() => setActiveVendor(vendor)}
              >
                <View style={styles.vendorCardRow}>
                  <View style={styles.vendorIconCircle}>
                    <IconComp size={24} color={Colors.primaryAccent} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.vendorName}>{vendor.name}</Text>
                      <Text style={styles.vendorBadgeRating}>{vendor.rating}</Text>
                    </View>
                    <Text style={styles.vendorLocation}>{vendor.location}</Text>
                    <Text style={styles.vendorItemsCount}>{vendor.items.length} items on menu</Text>
                  </View>
                </View>
              </DouCard>
            );
          })}
        </View>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  marketBanner: {
    backgroundColor: Colors.slate900,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  marketBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  marketBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.white,
  },
  marketBannerSub: {
    fontSize: FontSize.xs,
    color: Colors.slate300,
    lineHeight: 18,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  categoryTabActive: {
    backgroundColor: Colors.slate900,
  },
  categoryTabText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate600,
  },
  categoryTabTextActive: {
    color: Colors.white,
  },
  sectionHeader: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate500,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  vendorCard: {
    padding: Spacing.md,
  },
  vendorCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorName: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  vendorBadgeRating: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.warningDark,
  },
  vendorLocation: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    marginTop: 2,
  },
  vendorItemsCount: {
    fontSize: FontSize.xxs,
    color: Colors.primaryAccent,
    fontWeight: '700',
    marginTop: 3,
  },
  vendorHeaderBanner: {
    backgroundColor: Colors.slate50,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.md,
  },
  vendorRating: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.warningDark,
  },
  vendorDeliveryTag: {
    fontSize: FontSize.xs,
    color: Colors.slate600,
    marginTop: 2,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  productName: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
  },
  productDesc: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    marginTop: 2,
    lineHeight: 16,
  },
  productPrice: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primaryAccent,
    marginTop: 6,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.full,
    padding: 3,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  stepperCount: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.slate900,
    marginHorizontal: 10,
  },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate200,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.lg,
  },
  cartTotalLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    color: Colors.slate500,
  },
  cartTotalAmount: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.slate900,
  },
  checkoutBtn: {
    backgroundColor: Colors.slate900,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  checkoutBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.slate900,
    textAlign: 'center',
  },
  successSub: {
    fontSize: FontSize.sm,
    color: Colors.slate600,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  pinCard: {
    width: '100%',
    padding: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.slate900,
    marginBottom: Spacing.xl,
  },
  pinCardLabel: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate400,
    letterSpacing: 1.2,
  },
  pinCardValue: {
    fontSize: 54,
    fontWeight: '900',
    color: Colors.neonYellow,
    letterSpacing: 8,
    marginVertical: 4,
  },
  pinCardHint: {
    fontSize: FontSize.xs,
    color: Colors.slate300,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: Colors.slate900,
    width: '100%',
    paddingVertical: 18,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  doneBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.md,
    letterSpacing: 0.5,
  },
});
