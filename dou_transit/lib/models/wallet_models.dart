/// Flutter-side models for wallet & payments.
class WalletBalance {
  final double balance;
  final double? pendingBalance;
  final List<Transaction> transactions;

  WalletBalance({
    required this.balance,
    this.pendingBalance,
    this.transactions = const [],
  });

  factory WalletBalance.fromJson(Map<String, dynamic> json) {
    return WalletBalance(
      balance: (json['balance'] as num?)?.toDouble() ?? 0.0,
      pendingBalance: (json['pendingBalance'] as num?)?.toDouble(),
      transactions: (json['transactions'] as List<dynamic>?)
              ?.map((t) => Transaction.fromJson(t as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class Transaction {
  final String id;
  final String type;
  final double amount;
  final double? balanceBefore;
  final double? balanceAfter;
  final String status;
  final String? description;
  final String? reference;
  final String createdAt;

  Transaction({
    required this.id,
    required this.type,
    required this.amount,
    this.balanceBefore,
    this.balanceAfter,
    required this.status,
    this.description,
    this.reference,
    required this.createdAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      balanceBefore: (json['balance_before'] as num?)?.toDouble(),
      balanceAfter: (json['balance_after'] as num?)?.toDouble(),
      status: json['status'] as String? ?? 'pending',
      description: json['description'] as String?,
      reference: json['reference'] as String?,
      createdAt: json['created_at'] as String? ?? json['createdAt'] as String? ?? '',
    );
  }

  bool get isCredit => amount > 0 && ![
    'withdrawal', 'ride_payment', 'penalty', 'platform_fee', 'transfer_out'
  ].contains(type);

  bool get isCompleted => status == 'completed';

  String get typeLabel {
    switch (type) {
      case 'deposit': return 'Deposit';
      case 'withdrawal': return 'Withdrawal';
      case 'ride_payment': return 'Ride Payment';
      case 'ride_payout': return 'Ride Payout';
      case 'refund': return 'Refund';
      case 'penalty': return 'Penalty';
      case 'platform_fee': return 'Platform Fee';
      case 'transfer_in': return 'Transfer Received';
      case 'transfer_out': return 'Transfer Sent';
      default: return type;
    }
  }

  String get typeIcon {
    switch (type) {
      case 'deposit': return '↓';
      case 'withdrawal': return '↑';
      case 'ride_payment': return '🚗';
      case 'ride_payout': return '💰';
      case 'refund': return '↩';
      case 'penalty': return '⚠';
      case 'platform_fee': return '⚙';
      case 'transfer_in': return '📥';
      case 'transfer_out': return '📤';
      default: return '●';
    }
  }
}

class DepositRequest {
  final double amount;

  DepositRequest({required this.amount});

  Map<String, dynamic> toJson() => {'amount': amount};
}

class DepositResult {
  final String paymentUrl;
  final String transactionRef;

  DepositResult({required this.paymentUrl, required this.transactionRef});

  factory DepositResult.fromJson(Map<String, dynamic> json) {
    return DepositResult(
      paymentUrl: json['paymentUrl'] as String? ?? json['payment_url'] as String? ?? '',
      transactionRef: json['transactionRef'] as String? ?? json['transaction_ref'] as String? ?? '',
    );
  }
}

class WithdrawRequest {
  final String bankCode;
  final String bankName;
  final String accountNumber;
  final double amount;

  WithdrawRequest({
    required this.bankCode,
    required this.bankName,
    required this.accountNumber,
    required this.amount,
  });

  Map<String, dynamic> toJson() => {
    'bankCode': bankCode,
    'bankName': bankName,
    'accountNumber': accountNumber,
    'amount': amount,
  };
}

class TransferRequest {
  final String recipientId;
  final String? recipientName;
  final double amount;
  final String? note;

  TransferRequest({
    required this.recipientId,
    this.recipientName,
    required this.amount,
    this.note,
  });

  Map<String, dynamic> toJson() => {
    'recipientId': recipientId,
    'amount': amount,
    if (note != null) 'note': note,
  };
}
