import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/admin_provider.dart';

/// Emergency incidents live feed for admin
class EmergencyMapScreen extends StatefulWidget {
  const EmergencyMapScreen({super.key});

  @override
  State<EmergencyMapScreen> createState() => _EmergencyMapScreenState();
}

class _EmergencyMapScreenState extends State<EmergencyMapScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().fetchEmergencies();
    });
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Emergency Incidents')),
      body: RefreshIndicator(
        onRefresh: () => admin.fetchEmergencies(),
        child: admin.isLoading
            ? const Center(child: CircularProgressIndicator(color: DouTheme.black))
            : admin.emergencies.isEmpty
                ? const Center(child: Text('No emergency incidents', style: TextStyle(color: DouTheme.grey)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: admin.emergencies.length,
                    itemBuilder: (_, i) {
                      final e = admin.emergencies[i];
                      final status = e['status'] as String? ?? '';
                      final studentName = e['studentName'] as String? ?? '';
                      final studentPhone = e['studentPhone'] as String? ?? '';
                      final driverName = e['driverName'] as String? ?? 'N/A';
                      final fleetNumber = e['driverFleetNumber'] as int?;
                      final createdAt = e['createdAt'] as String? ?? '';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: DouTheme.white,
                          border: Border.all(
                            color: status == 'active' || status == 'en_route'
                                ? DouTheme.error : DouTheme.black,
                            width: status == 'active' ? 2 : 1,
                          ),
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: status == 'active'
                              ? [BoxShadow(color: DouTheme.error.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))]
                              : null,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Status badge
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: _statusBgColor(status),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (status == 'active')
                                        const SizedBox(width: 6, height: 6,
                                            child: CircularProgressIndicator(strokeWidth: 1.5, color: DouTheme.white)),
                                      if (status == 'active') const SizedBox(width: 6),
                                      Text(
                                        status.toUpperCase().replaceAll('_', ' '),
                                        style: TextStyle(
                                          fontSize: 10, fontWeight: FontWeight.bold,
                                          color: _statusTextColor(status),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Spacer(),
                                Text(_formatDate(createdAt),
                                    style: const TextStyle(fontSize: 11, color: DouTheme.grey)),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Student info
                            Row(
                              children: [
                                const Icon(Icons.person, size: 16, color: DouTheme.error),
                                const SizedBox(width: 6),
                                Text(studentName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.phone, size: 14, color: DouTheme.grey),
                                const SizedBox(width: 6),
                                Text(studentPhone, style: const TextStyle(fontSize: 13, color: DouTheme.grey)),
                              ],
                            ),
                            if (driverName != 'N/A') ...[
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.directions_car, size: 14, color: DouTheme.black),
                                  const SizedBox(width: 6),
                                  Text('Driver: $driverName',
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                  if (fleetNumber != null) ...[
                                    const SizedBox(width: 6),
                                    Text('#$fleetNumber', style: const TextStyle(fontSize: 13, color: DouTheme.grey)),
                                  ],
                                ],
                              ),
                            ],

                            // Coordinates
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.location_on, size: 14, color: DouTheme.grey),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'S: (${(e['studentLat'] as num?)?.toStringAsFixed(4) ?? '?'}, '
                                    '${(e['studentLng'] as num?)?.toStringAsFixed(4) ?? '?'})'
                                    '${e['driverLat'] != null ? ' | D: (${(e['driverLat'] as num).toStringAsFixed(4)}, ${(e['driverLng'] as num).toStringAsFixed(4)})' : ''}',
                                    style: const TextStyle(fontSize: 11, color: DouTheme.grey),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  Color _statusBgColor(String s) {
    switch (s) {
      case 'active': return DouTheme.error;
      case 'en_route': return DouTheme.warning;
      case 'arrived_medical': return DouTheme.success;
      case 'resolved': return DouTheme.grey;
      case 'abuse_flagged': return DouTheme.black;
      default: return DouTheme.grey;
    }
  }

  Color _statusTextColor(String s) {
    if (s == 'active' || s == 'en_route' || s == 'abuse_flagged') return DouTheme.white;
    return DouTheme.black;
  }

  String _formatDate(String iso) {
    try {
      return iso.substring(0, 10) + ' ' + iso.substring(11, 16);
    } catch (_) {
      return iso;
    }
  }
}
