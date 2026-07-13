import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/models/wallet_models.dart';
import 'package:dou_transit/providers/wallet_provider.dart';
import 'package:dou_transit/config/api_config.dart';

// ============================================================
// WALLET BOTTOM SHEET — balance overview + action buttons
// ============================================================

class WalletBottomSheet extends StatelessWidget {
  const WalletBottomSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const WalletBottomSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<WalletProvider>(
      builder: (context, wallet, _) {
        return Container(
          decoration: const BoxDecoration(
            color: DouTheme.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Handle bar
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: DouTheme.grey,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                // Balance
                Text(
                  wallet.formattedBalance,
                  style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold),
                ),
                const Text('Wallet Balance', style: TextStyle(color: DouTheme.grey, fontSize: 14)),
                const SizedBox(height: 20),

                // Pending balance
                if (wallet.pendingBalance > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: DouTheme.warning.withOpacity(0.1),
                      border: Border.all(color: DouTheme.warning, width: 1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '₦${wallet.pendingBalance.toStringAsFixed(2)} pending clearance',
                      style: const TextStyle(fontSize: 12, color: DouTheme.warning),
                    ),
                  ),

                // Action buttons
                Row(
                  children: [
                    Expanded(
                      child: _ActionButton(
                        icon: Icons.add_circle_outline,
                        label: 'Deposit',
                        onTap: () {
                          Navigator.pop(context);
                          DepositSheet.show(context);
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _ActionButton(
                        icon: Icons.upload_outlined,
                        label: 'Withdraw',
                        onTap: () {
                          Navigator.pop(context);
                          WithdrawSheet.show(context);
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _ActionButton(
                        icon: Icons.swap_horiz,
                        label: 'Transfer',
                        onTap: () {
                          Navigator.pop(context);
                          TransferSheet.show(context);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Recent transactions
                if (wallet.transactions.isNotEmpty) ...[
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Recent', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  ),
                  const SizedBox(height: 8),
                  ...wallet.transactions.take(5).map((tx) => _TransactionRow(tx: tx)),
                ],
                const SizedBox(height: 8),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: DouTheme.white,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: DouTheme.black, width: 2),
          ),
          child: Column(
            children: [
              Icon(icon, size: 28, color: DouTheme.black),
              const SizedBox(height: 4),
              Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }
}

class _TransactionRow extends StatelessWidget {
  final Transaction tx;

  const _TransactionRow({required this.tx});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              border: Border.all(color: DouTheme.black, width: 1.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(tx.typeIcon, style: const TextStyle(fontSize: 16)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tx.typeLabel, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text(
                  tx.isCompleted ? tx.createdAt.substring(0, 10) : tx.status,
                  style: TextStyle(fontSize: 11, color: tx.isCompleted ? DouTheme.grey : DouTheme.warning),
                ),
              ],
            ),
          ),
          Text(
            '${tx.isCredit ? '+' : ''}₦${tx.amount.abs().toStringAsFixed(0)}',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: tx.isCredit ? DouTheme.success : DouTheme.error,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// DEPOSIT SHEET
// ============================================================

class DepositSheet extends StatefulWidget {
  const DepositSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const DepositSheet(),
    );
  }

  @override
  State<DepositSheet> createState() => _DepositSheetState();
}

class _DepositSheetState extends State<DepositSheet> {
  final _amountController = TextEditingController();
  double _selectedAmount = 0;
  bool _isProcessing = false;

  final List<double> _quickAmounts = [200, 500, 1000, 2000, 5000];

  double get _fee => 10.0;
  double get _total => _selectedAmount + _fee;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _initiateDeposit() async {
    final amount = _selectedAmount;
    if (amount < ApiConfig.minDeposit) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Minimum deposit is ₦100')),
      );
      return;
    }

    setState(() => _isProcessing = true);

    final wallet = context.read<WalletProvider>();
    final result = await wallet.deposit(amount);

    setState(() => _isProcessing = false);

    if (!mounted) return;

    if (result != null) {
      // Open Flutterwave payment URL
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: DouTheme.white,
          title: const Text('Payment Link Generated'),
          content: Text('You will be redirected to complete payment.\nRef: ${result.transactionRef}'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Proceed'),
            ),
          ],
        ),
      );

      if (confirmed == true && mounted) {
        Navigator.pop(context);
        // In production, launch Flutterwave checkout inline or via WebView
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Redirecting to payment...\n${result.paymentUrl}')),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(wallet.error ?? 'Deposit failed. Try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: DouTheme.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: DouTheme.grey,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const Text('Deposit Funds', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text('Add money to your wallet', style: TextStyle(color: DouTheme.grey, fontSize: 14)),
            const SizedBox(height: 20),

            // Quick amounts
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _quickAmounts.map((amt) {
                final selected = _selectedAmount == amt;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedAmount = amt;
                      _amountController.text = amt.toStringAsFixed(0);
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(
                      color: selected ? DouTheme.black : DouTheme.white,
                      border: Border.all(color: DouTheme.black, width: 2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '₦${amt.toStringAsFixed(0)}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: selected ? DouTheme.white : DouTheme.black,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // Custom amount
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                labelText: 'Or enter custom amount',
                prefixText: '₦ ',
                prefixStyle: TextStyle(fontWeight: FontWeight.bold),
              ),
              onChanged: (v) {
                setState(() => _selectedAmount = double.tryParse(v) ?? 0);
              },
            ),
            const SizedBox(height: 12),

            // Fee breakdown
            if (_selectedAmount > 0)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: DouTheme.lightGrey.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: DouTheme.lightGrey),
                ),
                child: Column(
                  children: [
                    _FeeRow(label: 'Amount', value: _selectedAmount),
                    const SizedBox(height: 4),
                    _FeeRow(label: 'Platform Fee', value: _fee),
                    const Divider(height: 12),
                    _FeeRow(label: 'Total Charge', value: _total, bold: true),
                  ],
                ),
              ),
            const SizedBox(height: 20),

            // Deposit button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _selectedAmount > 0 && !_isProcessing ? _initiateDeposit : null,
                child: _isProcessing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DouTheme.white))
                    : const Text('DEPOSIT', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeeRow extends StatelessWidget {
  final String label;
  final double value;
  final bool bold;

  const _FeeRow({required this.label, required this.value, this.bold = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 14, fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        Text(
          '₦${value.toStringAsFixed(2)}',
          style: TextStyle(fontSize: 14, fontWeight: bold ? FontWeight.bold : FontWeight.normal),
        ),
      ],
    );
  }
}

// ============================================================
// WITHDRAW SHEET
// ============================================================

class WithdrawSheet extends StatefulWidget {
  const WithdrawSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const WithdrawSheet(),
    );
  }

  @override
  State<WithdrawSheet> createState() => _WithdrawSheetState();
}

class _WithdrawSheetState extends State<WithdrawSheet> {
  final _amountController = TextEditingController();
  final _accountController = TextEditingController();

  // Nigerian bank list (simplified for MVP)
  static const List<Map<String, String>> _banks = [
    {'code': '000013', 'name': 'Access Bank'},
    {'code': '000014', 'name': 'Access Bank (Diamond)'},
    {'code': '000023', 'name': 'Citibank Nigeria'},
    {'code': '000016', 'name': 'Ecobank Nigeria'},
    {'code': '000001', 'name': 'Fidelity Bank'},
    {'code': '000007', 'name': 'First Bank of Nigeria'},
    {'code': '000010', 'name': 'First City Monument Bank'},
    {'code': '000003', 'name': 'Globus Bank'},
    {'code': '000019', 'name': 'GTBank'},
    {'code': '000027', 'name': 'Heritage Bank'},
    {'code': '000025', 'name': 'Keystone Bank'},
    {'code': '000029', 'name': 'Kuda Microfinance Bank'},
    {'code': '000031', 'name': 'Moniepoint MFB'},
    {'code': '000030', 'name': 'Opay'},
    {'code': '000011', 'name': 'PalmPay'},
    {'code': '000015', 'name': 'Polaris Bank'},
    {'code': '000021', 'name': 'Providus Bank'},
    {'code': '000024', 'name': 'Stanbic IBTC Bank'},
    {'code': '000012', 'name': 'Standard Chartered'},
    {'code': '000008', 'name': 'Sterling Bank'},
    {'code': '000032', 'name': 'SunTrust Bank'},
    {'code': '000002', 'name': 'UBA'},
    {'code': '000018', 'name': 'Unity Bank'},
    {'code': '000026', 'name': 'VFD Microfinance Bank'},
    {'code': '000009', 'name': 'Wema Bank'},
    {'code': '000004', 'name': 'Zenith Bank'},
  ];

  String? _selectedBankCode;
  String? _selectedBankName;
  bool _isProcessing = false;

  @override
  void dispose() {
    _amountController.dispose();
    _accountController.dispose();
    super.dispose();
  }

  Future<void> _submitWithdraw() async {
    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter valid amount')));
      return;
    }
    if (_selectedBankCode == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select a bank')));
      return;
    }
    if (_accountController.text.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter valid 10-digit account number')));
      return;
    }

    setState(() => _isProcessing = true);

    final wallet = context.read<WalletProvider>();
    final success = await wallet.withdraw(
      bankCode: _selectedBankCode!,
      bankName: _selectedBankName ?? '',
      accountNumber: _accountController.text.trim(),
      amount: amount,
    );

    setState(() => _isProcessing = false);

    if (!mounted) return;

    if (success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Withdrawal initiated. Funds will be sent to your bank.')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(wallet.error ?? 'Withdrawal failed.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: DouTheme.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: DouTheme.grey,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const Text('Withdraw Funds', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text('Send money to your bank account', style: TextStyle(color: DouTheme.grey, fontSize: 14)),
            const SizedBox(height: 20),

            // Amount
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(labelText: 'Amount', prefixText: '₦ '),
            ),
            const SizedBox(height: 12),

            // Bank selector
            InkWell(
              onTap: () async {
                final result = await showDialog<Map<String, String>>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    backgroundColor: DouTheme.white,
                    title: const Text('Select Bank'),
                    content: SizedBox(
                      width: double.maxFinite,
                      height: 400,
                      child: ListView.separated(
                        itemCount: _banks.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, i) {
                          final bank = _banks[i];
                          final selected = _selectedBankCode == bank['code'];
                          return ListTile(
                            title: Text(bank['name']!, style: TextStyle(fontWeight: selected ? FontWeight.bold : FontWeight.normal)),
                            trailing: selected ? const Icon(Icons.check, color: DouTheme.black) : null,
                            onTap: () => Navigator.pop(ctx, bank),
                          );
                        },
                      ),
                    ),
                  ),
                );
                if (result != null) {
                  setState(() {
                    _selectedBankCode = result['code'];
                    _selectedBankName = result['name'];
                  });
                }
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  border: Border.all(color: DouTheme.black, width: 2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _selectedBankName ?? 'Select Bank',
                      style: TextStyle(
                        color: _selectedBankName != null ? DouTheme.black : DouTheme.grey,
                        fontWeight: _selectedBankName != null ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    const Icon(Icons.arrow_drop_down),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Account number
            TextField(
              controller: _accountController,
              keyboardType: TextInputType.number,
              maxLength: 10,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(labelText: 'Account Number'),
            ),
            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isProcessing ? null : _submitWithdraw,
                child: _isProcessing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DouTheme.white))
                    : const Text('WITHDRAW', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// TRANSFER SHEET (P2P wallet transfer)
// ============================================================

class TransferSheet extends StatefulWidget {
  const TransferSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const TransferSheet(),
    );
  }

  @override
  State<TransferSheet> createState() => _TransferSheetState();
}

class _TransferSheetState extends State<TransferSheet> {
  final _amountController = TextEditingController();
  final _recipientController = TextEditingController();
  final _noteController = TextEditingController();
  bool _isProcessing = false;
  Future<void> _submitTransfer() async {
    final amount = double.tryParse(_amountController.text) ?? 0;
    final recipientId = _recipientController.text.trim();

    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter valid amount')));
      return;
    }
    if (recipientId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter recipient email or user ID')));
      return;
    }

    setState(() => _isProcessing = true);

    final wallet = context.read<WalletProvider>();
    final success = await wallet.transfer(
      recipientId: recipientId,
      amount: amount,
      note: _noteController.text.isNotEmpty ? _noteController.text.trim() : null,
    );

    setState(() => _isProcessing = false);

    if (!mounted) return;

    if (success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Transfer completed successfully!')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(wallet.error ?? 'Transfer failed.')),
      );
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _recipientController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: DouTheme.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: DouTheme.grey,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const Text('Transfer Funds', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text('Send money to another user', style: TextStyle(color: DouTheme.grey, fontSize: 14)),
            const SizedBox(height: 20),

            // Recipient
            TextField(
              controller: _recipientController,
              decoration: const InputDecoration(
                labelText: 'Recipient (email or user ID)',
                hintText: 'Search by email or matric number',
              ),
            ),
            const SizedBox(height: 12),

            // Amount
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(labelText: 'Amount', prefixText: '₦ '),
            ),
            const SizedBox(height: 12),

            // Note (optional)
            TextField(
              controller: _noteController,
              maxLength: 100,
              decoration: const InputDecoration(labelText: 'Note (optional)', hintText: 'What\'s this for?'),
            ),
            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isProcessing ? null : _submitTransfer,
                child: _isProcessing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DouTheme.white))
                    : const Text('SEND', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
