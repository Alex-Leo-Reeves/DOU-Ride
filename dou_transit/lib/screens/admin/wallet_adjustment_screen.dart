import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/admin_provider.dart';

/// Wallet adjustment screen — admin credit/debit with audit trail
class WalletAdjustmentScreen extends StatefulWidget {
  const WalletAdjustmentScreen({super.key});

  @override
  State<WalletAdjustmentScreen> createState() => _WalletAdjustmentScreenState();
}

class _WalletAdjustmentScreenState extends State<WalletAdjustmentScreen> {
  final _userIdCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  bool _isCredit = true;

  @override
  void dispose() {
    _userIdCtrl.dispose();
    _reasonCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final userId = _userIdCtrl.text.trim();
    final amountText = _amountCtrl.text.trim();
    final reason = _reasonCtrl.text.trim();

    if (userId.isEmpty || amountText.isEmpty || reason.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All fields required'), backgroundColor: DouTheme.error),
      );
      return;
    }

    final amount = double.tryParse(amountText);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid positive amount'), backgroundColor: DouTheme.error),
      );
      return;
    }

    final finalAmount = _isCredit ? amount : -amount;

    final admin = context.read<AdminProvider>();
    final success = await admin.adjustWallet(userId, finalAmount, reason);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(success
            ? 'Wallet ${_isCredit ? 'credited' : 'debited'} ₦$amount'
            : 'Failed: ${admin.error ?? 'Unknown error'}'),
        backgroundColor: success ? DouTheme.success : DouTheme.error,
      ));

      if (success) {
        _userIdCtrl.clear();
        _amountCtrl.clear();
        _reasonCtrl.clear();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Wallet Adjustment')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.account_balance_wallet, size: 48),
            const SizedBox(height: 16),
            const Text(
              'Admin Wallet Adjustment',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Credit or debit any user\'s wallet. All actions are audited.',
              style: TextStyle(fontSize: 14, color: DouTheme.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            // Credit/Debit toggle
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: DouTheme.black, width: 2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _isCredit = true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: _isCredit ? DouTheme.success : DouTheme.white,
                          borderRadius: const BorderRadius.horizontal(left: Radius.circular(6)),
                        ),
                        child: Text(
                          'CREDIT',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _isCredit ? DouTheme.white : DouTheme.black,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Container(width: 1, color: DouTheme.black),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _isCredit = false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: !_isCredit ? DouTheme.error : DouTheme.white,
                          borderRadius: const BorderRadius.horizontal(right: Radius.circular(6)),
                        ),
                        child: Text(
                          'DEBIT',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: !_isCredit ? DouTheme.white : DouTheme.black,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            TextField(
              controller: _userIdCtrl,
              decoration: const InputDecoration(
                labelText: 'User ID (UUID)',
                hintText: 'Paste user UUID here',
                prefixIcon: Icon(Icons.person, size: 20),
              ),
            ),
            const SizedBox(height: 16),

            TextField(
              controller: _amountCtrl,
              decoration: InputDecoration(
                labelText: 'Amount (₦)',
                prefixIcon: const Icon(Icons.monetization_on, size: 20),
                prefixText: '₦ ',
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),

            TextField(
              controller: _reasonCtrl,
              decoration: const InputDecoration(
                labelText: 'Reason for adjustment',
                hintText: 'e.g. Scholarship, refund, penalty',
                prefixIcon: Icon(Icons.description, size: 20),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 32),

            if (admin.error != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: DouTheme.error.withOpacity(0.1),
                  border: Border.all(color: DouTheme.error),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(admin.error!, style: const TextStyle(color: DouTheme.error)),
              ),

            SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                onPressed: admin.isLoading ? null : _submit,
                icon: admin.isLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DouTheme.white))
                    : Icon(_isCredit ? Icons.add_circle : Icons.remove_circle),
                label: Text(
                  admin.isLoading
                      ? 'Processing...'
                      : '${_isCredit ? 'CREDIT' : 'DEBIT'} WALLET',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _isCredit ? DouTheme.success : DouTheme.error,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
