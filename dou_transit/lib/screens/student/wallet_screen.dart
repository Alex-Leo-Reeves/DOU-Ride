import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/wallet_provider.dart';
import 'package:dou_transit/models/wallet_models.dart';
import 'package:dou_transit/widgets/wallet_sheets.dart';

/// Full-screen wallet page for students/drivers.
/// Shows balance, transaction history, and action buttons.
class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  @override
  void initState() {
    super.initState();
    // Fetch balance on first load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WalletProvider>().fetchBalance();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Wallet'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: DouTheme.black),
            onPressed: () => context.read<WalletProvider>().fetchBalance(),
          ),
        ],
      ),
      body: Consumer<WalletProvider>(
        builder: (context, wallet, _) {
          if (wallet.isLoading && wallet.balance == 0) {
            return const Center(child: CircularProgressIndicator(color: DouTheme.black));
          }

          if (wallet.error != null && wallet.balance == 0) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: DouTheme.error),
                    const SizedBox(height: 16),
                    Text(wallet.error!, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => wallet.fetchBalance(),
                      icon: const Icon(Icons.refresh, color: DouTheme.white),
                      label: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => wallet.fetchBalance(),
            color: DouTheme.black,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // === BALANCE CARD ===
                _BalanceCard(wallet: wallet),
                const SizedBox(height: 20),

                // === ACTION BUTTONS ===
                Row(
                  children: [
                    Expanded(
                      child: _ActionCard(
                        icon: Icons.add_circle_outline,
                        label: 'Deposit',
                        subtitle: 'Add money',
                        onTap: () => DepositSheet.show(context),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _ActionCard(
                        icon: Icons.upload_outlined,
                        label: 'Withdraw',
                        subtitle: 'To bank',
                        onTap: () => WithdrawSheet.show(context),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _ActionCard(
                        icon: Icons.swap_horiz,
                        label: 'Transfer',
                        subtitle: 'P2P send',
                        onTap: () => TransferSheet.show(context),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // === TRANSACTION HISTORY HEADER ===
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Transaction History',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    if (wallet.transactions.length > 10)
                      TextButton(
                        onPressed: () {},
                        child: const Text('See all'),
                      ),
                  ],
                ),
                const SizedBox(height: 8),

                if (wallet.transactions.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(
                      child: Text(
                        'No transactions yet.\nDeposit to get started!',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: DouTheme.grey, fontSize: 14),
                      ),
                    ),
                  )
                else
                  ...wallet.transactions.map((tx) => _TransactionCard(tx: tx)),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ============================================================
// BALANCE CARD
// ============================================================

class _BalanceCard extends StatelessWidget {
  final WalletProvider wallet;

  const _BalanceCard({required this.wallet});

  @override
  Widget build(BuildContext context) {
    return DouCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Text(
            'Available Balance',
            style: TextStyle(fontSize: 14, color: DouTheme.grey),
          ),
          const SizedBox(height: 8),
          Text(
            wallet.formattedBalance,
            style: const TextStyle(fontSize: 44, fontWeight: FontWeight.bold),
          ),
          if (wallet.pendingBalance > 0) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: DouTheme.warning.withOpacity(0.1),
                border: Border.all(color: DouTheme.warning, width: 1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '₦${wallet.pendingBalance.toStringAsFixed(2)} pending',
                style: const TextStyle(fontSize: 12, color: DouTheme.warning),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ============================================================
// ACTION CARDS
// ============================================================

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return DouCard(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
      onTap: onTap,
      child: Column(
        children: [
          Icon(icon, size: 32, color: DouTheme.black),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          Text(subtitle, style: const TextStyle(fontSize: 11, color: DouTheme.grey)),
        ],
      ),
    );
  }
}

// ============================================================
// TRANSACTION CARD
// ============================================================

class _TransactionCard extends StatelessWidget {
  final Transaction tx;

  const _TransactionCard({required this.tx});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: DouCard(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            // Icon
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border.all(color: DouTheme.black, width: 2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(tx.typeIcon, style: const TextStyle(fontSize: 20)),
            ),
            const SizedBox(width: 14),

            // Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        tx.typeLabel,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      Text(
                        '${tx.isCredit ? '+' : ''}₦${tx.amount.abs().toStringAsFixed(0)}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: tx.isCredit ? DouTheme.success : DouTheme.error,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (tx.reference != null) ...[
                        Text(
                          tx.reference!.length > 12
                              ? 'Ref: ${tx.reference!.substring(0, 12)}...'
                              : 'Ref: ${tx.reference}',
                          style: const TextStyle(fontSize: 11, color: DouTheme.grey),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: tx.isCompleted ? DouTheme.success.withOpacity(0.1) : DouTheme.warning.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          tx.isCompleted ? 'Completed' : tx.status,
                          style: TextStyle(
                            fontSize: 10,
                            color: tx.isCompleted ? DouTheme.success : DouTheme.warning,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (tx.description != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      tx.description!,
                      style: const TextStyle(fontSize: 11, color: DouTheme.grey),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
