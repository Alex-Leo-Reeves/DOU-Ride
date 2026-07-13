import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/wallet_provider.dart';
import 'package:dou_transit/config/routes.dart';

/// Brutalist balance display pill shown in the top-right corner.
class TopRightBalancePill extends StatelessWidget {
  const TopRightBalancePill({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<WalletProvider>(
      builder: (context, wallet, _) {
        return GestureDetector(
          onTap: () => Navigator.pushNamed(context, AppRoutes.studentWallet),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: DouTheme.white,
              border: Border.all(color: DouTheme.black, width: 2),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: DouTheme.black26,
                  offset: const Offset(2, 2),
                  blurRadius: 0,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (wallet.isLoading)
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: DouTheme.black),
                  )
                else
                  Text(
                    '₦${wallet.balance.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: DouTheme.black,
                    ),
                  ),
                const SizedBox(width: 4),
                const Icon(Icons.wallet, size: 16, color: DouTheme.black),
              ],
            ),
          ),
        );
      },
    );
  }
}
