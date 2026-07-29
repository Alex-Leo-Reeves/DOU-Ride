// ============================================================
// DOU Transit — Shared Types
// ============================================================

export type UserRole = 'student' | 'driver' | 'admin' | 'security' | 'vendor' | 'developer';

export interface User {
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: UserRole;
  token: string;
  needsOnboarding?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
}

// ============================================================
// Wallet
// ============================================================

export interface WalletBalance {
  balance: number;
  pendingBalance?: number;
  transactions: Transaction[];
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'ride_payment'
  | 'ride_payout'
  | 'refund'
  | 'penalty'
  | 'platform_fee'
  | 'transfer_in'
  | 'transfer_out';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  status: string;
  description?: string;
  reference?: string;
  createdAt: string;
}

// ============================================================
// Rides
// ============================================================

export type TripStatus =
  | 'idle'
  | 'requested'
  | 'accepted'
  | 'boarding'
  | 'in_progress'
  | 'completed'
  | 'no_show';

export interface RideRequest {
  destinationId: string;
  seats: number;
  tripType: 'standard' | 'drop';
  destinationName?: string;
}

export interface Ride {
  tripId: string;
  status: TripStatus;
  boardingPin?: string;
  totalFare?: number;
  driverName?: string;
  driverFleetNumber?: number;
  destinationName?: string;
}

export type TicketType = 'single' | 'group';

// ============================================================
// Queue
// ============================================================

export interface QueueEntry {
  queueId: string;
  destinationId: string;
  destinationName: string;
  position: number;
  estimatedWait: number; // seconds
  status: 'waiting' | 'called' | 'boarding' | 'expired';
}

// ============================================================
// Admin
// ============================================================

export interface AdminAnalytics {
  activeKekes: number;
  tripsToday: number;
  revenueToday: number;
  pendingBankApprovals: number;
  pendingReports: number;
  pendingLostItems: number;
  drivers: AdminDriver[];
  students: AdminStudent[];
}

export interface AdminDriver {
  id: string;
  name: string;
  fleetNumber: number;
  phone: string;
  status: string;
}

export interface AdminStudent {
  id: string;
  name: string;
  matricNumber: string;
  department: string;
}

// ============================================================
// Lost Items
// ============================================================

export interface LostItem {
  id: string;
  studentId?: string;
  driverId?: string;
  tripId?: string;
  description: string;
  category: string;
  status: 'reported' | 'claimed' | 'resolved';
  imageUrl?: string;
  createdAt: string;
}

// ============================================================
// Emergency
// ============================================================

export interface Emergency {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  type: 'medical' | 'security' | 'accident' | 'other';
  status: 'active' | 'resolved';
  createdAt: string;
}

// ============================================================
// Marketplace
// ============================================================

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  inStock: boolean;
}

export interface Order {
  id: string;
  studentId: string;
  vendorId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

// ============================================================
// Notifications
// ============================================================

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
}
