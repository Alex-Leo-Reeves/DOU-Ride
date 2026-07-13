import 'package:flutter/foundation.dart';
import 'package:dou_transit/services/api_service.dart';
import 'package:dou_transit/models/wallet_models.dart';
import 'package:dou_transit/providers/auth_provider.dart';

class WalletProvider extends ChangeNotifier {
  final AuthProvider _authProvider;

  double _balance = 0.0;
  double _pendingBalance = 0.0;
  List<Transaction> _transactions = [];
  bool _isLoading = false;
  String? _error;

  WalletProvider(this._authProvider);

  double get balance => _balance;
  double get pendingBalance => _pendingBalance;
  List<Transaction> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get error => _error;
  double get platformFee => 10.0;
  double get minDeposit => 100.0;

  String get _userId => _authProvider.userId ?? '';
  String? get _token => _authProvider.token;

  /// Fetch balance and transaction history from backend.
  Future<void> fetchBalance() async {
    if (_userId.isEmpty) {
      _error = 'User not authenticated';
      notifyListeners();
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.get(
        '/api/wallet/balance/$_userId',
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
      } else {
        final wallet = WalletBalance.fromJson(result);
        _balance = wallet.balance;
        _pendingBalance = wallet.pendingBalance ?? 0.0;
        _transactions = wallet.transactions;
      }
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  /// Initiate a deposit — returns a Flutterwave payment URL.
  Future<DepositResult?> deposit(double amount) async {
    if (_userId.isEmpty) return null;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/wallet/deposit',
        body: DepositRequest(amount: amount).toJson(),
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return null;
      }

      final depositResult = DepositResult.fromJson(result);
      _isLoading = false;
      notifyListeners();
      return depositResult;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Initiate a withdrawal to a bank account.
  Future<bool> withdraw({
    required String bankCode,
    required String bankName,
    required String accountNumber,
    required double amount,
  }) async {
    if (_userId.isEmpty) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/wallet/withdraw',
        body: WithdrawRequest(
          bankCode: bankCode,
          bankName: bankName,
          accountNumber: accountNumber,
          amount: amount,
        ).toJson(),
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Refresh balance after withdrawal
      await fetchBalance();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Transfer funds to another user.
  Future<bool> transfer({
    required String recipientId,
    String? recipientName,
    required double amount,
    String? note,
  }) async {
    if (_userId.isEmpty) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await ApiService.post(
        '/api/wallet/transfer',
        body: TransferRequest(
          recipientId: recipientId,
          recipientName: recipientName,
          amount: amount,
          note: note,
        ).toJson(),
        token: _token,
      );

      if (result.containsKey('error')) {
        _error = result['error'] as String?;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Refresh balance after transfer
      await fetchBalance();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Get formatted balance string.
  String get formattedBalance => '₦${_balance.toStringAsFixed(2)}';

  /// Clear error state.
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
