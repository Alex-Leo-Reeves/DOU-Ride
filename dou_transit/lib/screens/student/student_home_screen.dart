import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/config/api_config.dart';
import 'package:dou_transit/providers/auth_provider.dart';
import 'package:dou_transit/providers/ride_provider.dart';
import 'package:dou_transit/providers/queue_provider.dart';
import 'package:dou_transit/providers/location_provider.dart';
import 'package:dou_transit/providers/wallet_provider.dart';
import 'package:dou_transit/widgets/balance_pill.dart';
import 'package:dou_transit/screens/student/map_screen.dart';
import 'package:dou_transit/screens/student/virtual_queue_screen.dart';

/// Student home screen with map, destination selection, ride flow.
class StudentHomeScreen extends StatefulWidget {
  const StudentHomeScreen({super.key});

  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen> {
  String? _selectedDestinationId;
  String? _selectedDestinationName;
  int _selectedSeats = 1;
  String _tripType = 'standard'; // standard or drop

  // Campus landmark destinations (will be fetched from backend in production)
  static const List<Map<String, dynamic>> _destinations = [
    {'id': 'dest-1', 'name': 'Faculty of Science', 'lat': 6.250, 'lng': 6.705},
    {'id': 'dest-2', 'name': 'Faculty of Arts', 'lat': 6.255, 'lng': 6.700},
    {'id': 'dest-3', 'name': 'Faculty of Social Sciences', 'lat': 6.248, 'lng': 6.695},
    {'id': 'dest-4', 'name': 'Faculty of Education', 'lat': 6.252, 'lng': 6.710},
    {'id': 'dest-5', 'name': 'Faculty of Engineering', 'lat': 6.260, 'lng': 6.698},
    {'id': 'dest-6', 'name': 'Faculty of Law', 'lat': 6.245, 'lng': 6.708},
    {'id': 'dest-7', 'name': 'Faculty of Environmental Sciences', 'lat': 6.253, 'lng': 6.693},
    {'id': 'dest-8', 'name': 'Faculty of Agriculture', 'lat': 6.258, 'lng': 6.715},
    {'id': 'dest-9', 'name': 'School of Nursing', 'lat': 6.247, 'lng': 6.702},
    {'id': 'dest-10', 'name': 'Main Gate', 'lat': 6.240, 'lng': 6.690},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LocationProvider>().startTracking();
      context.read<WalletProvider>().fetchBalance();
    });
  }

  Future<void> _requestRide() async {
    if (_selectedDestinationId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a destination first')),
      );
      return;
    }

    final rideProvider = context.read<RideProvider>();
    final result = await rideProvider.requestRide(
      destinationId: _selectedDestinationId!,
      seats: _selectedSeats,
      tripType: _tripType,
      destinationName: _selectedDestinationName,
    );

    if (!mounted) return;

    if (result != null) {
      final status = result['status'] as String? ?? '';
      if (status == 'queued') {
        // Joined the virtual queue
        final queueProvider = context.read<QueueProvider>();
        await queueProvider.joinQueue(
          _selectedDestinationId!,
          seats: _selectedSeats,
          destinationName: _selectedDestinationName,
        );
        if (mounted) {
          Navigator.pushNamed(context, AppRoutes.studentQueue, arguments: {
            'destinationName': _selectedDestinationName,
          });
        }
      } else {
        // Direct ride match — navigate to queue called / boarding
        if (mounted) {
          Navigator.pushNamed(context, AppRoutes.studentQueueCalled);
        }
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(rideProvider.error ?? 'Failed to request ride')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final locProvider = context.watch<LocationProvider>();
    final rideProvider = context.watch<RideProvider>();
    final auth = context.watch<AuthProvider>();

    // Show active ride screen if ride is in progress
    if (!rideProvider.isIdle) {
      return _ActiveRideScreen(
        onReset: () => rideProvider.reset(),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Hi, ${auth.fullName?.split(' ').first ?? 'Student'}!'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: TopRightBalancePill(),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Map takes full screen
          MapScreen(
            initialCenter: LatLng(
              locProvider.currentLat ?? ApiConfig.campusCenterLat,
              locProvider.currentLng ?? ApiConfig.campusCenterLng,
            ),
          ),

          // Overlay controls at bottom
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _RideRequestPanel(
              selectedDestinationId: _selectedDestinationId,
              selectedDestinationName: _selectedDestinationName,
              selectedSeats: _selectedSeats,
              tripType: _tripType,
              destinations: _destinations,
              isLoading: rideProvider.isLoading,
              onDestinationChanged: (id, name) => setState(() {
                _selectedDestinationId = id;
                _selectedDestinationName = name;
              }),
              onSeatsChanged: (s) => setState(() => _selectedSeats = s),
              onTripTypeChanged: (t) => setState(() => _tripType = t),
              onRequestRide: _requestRide,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// RIDE REQUEST PANEL (bottom sheet-like overlay)
// ============================================================

class _RideRequestPanel extends StatelessWidget {
  final String? selectedDestinationId;
  final String? selectedDestinationName;
  final int selectedSeats;
  final String tripType;
  final List<Map<String, dynamic>> destinations;
  final bool isLoading;
  final Function(String id, String name) onDestinationChanged;
  final Function(int seats) onSeatsChanged;
  final Function(String type) onTripTypeChanged;
  final VoidCallback onRequestRide;

  const _RideRequestPanel({
    required this.selectedDestinationId,
    required this.selectedDestinationName,
    required this.selectedSeats,
    required this.tripType,
    required this.destinations,
    required this.isLoading,
    required this.onDestinationChanged,
    required this.onSeatsChanged,
    required this.onTripTypeChanged,
    required this.onRequestRide,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: DouTheme.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        boxShadow: [
          BoxShadow(color: DouTheme.black26, offset: Offset(0, -4), blurRadius: 8),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(width: 40, height: 4, decoration: BoxDecoration(
              color: DouTheme.grey, borderRadius: BorderRadius.circular(2),
            )),
          ),
          const SizedBox(height: 12),

          // Trip type toggle
          Row(
            children: [
              Expanded(
                child: _TripTypeChip(
                  label: 'Standard',
                  subtitle: 'Park queue',
                  isSelected: tripType == 'standard',
                  icon: Icons.directions_car,
                  onTap: () => onTripTypeChanged('standard'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _TripTypeChip(
                  label: 'Drop',
                  subtitle: '₦1,500 charter',
                  isSelected: tripType == 'drop',
                  icon: Icons.flash_on,
                  onTap: () => onTripTypeChanged('drop'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Destination selector
          const Text('Where to?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 8),
          SizedBox(
            height: 90,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: destinations.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final dest = destinations[i];
                final name = dest['name'] as String;
                final isSelected = dest['id'] == selectedDestinationId;
                return GestureDetector(
                  onTap: () => onDestinationChanged(dest['id'] as String, name),
                  child: Container(
                    width: 100,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isSelected ? DouTheme.black : DouTheme.white,
                      border: Border.all(color: DouTheme.black, width: 2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.location_on, color: isSelected ? DouTheme.white : DouTheme.black, size: 20),
                        const SizedBox(height: 4),
                        Text(
                          name,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? DouTheme.white : DouTheme.black,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),

          // Seats + request row
          Row(
            children: [
              // Seat picker
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  border: Border.all(color: DouTheme.black, width: 2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Text('Seats:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(width: 4),
                    _SeatButton(
                      label: '-',
                      onTap: selectedSeats > 1 ? () => onSeatsChanged(selectedSeats - 1) : null,
                    ),
                    const SizedBox(width: 8),
                    Text('$selectedSeats', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(width: 8),
                    _SeatButton(
                      label: '+',
                      onTap: selectedSeats < 4 ? () => onSeatsChanged(selectedSeats + 1) : null,
                    ),
                  ],
                ),
              ),
              const Spacer(),

              // Fare estimate
              Text(
                tripType == 'drop' ? '₦1,500' : '₦${ApiConfig.insideCampusFare.toInt()}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(width: 12),

              // Request button
              SizedBox(
                height: 44,
                child: ElevatedButton(
                  onPressed: (isLoading || selectedDestinationId == null) ? null : onRequestRide,
                  child: isLoading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: DouTheme.white))
                      : const Text('GO', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TripTypeChip extends StatelessWidget {
  final String label;
  final String subtitle;
  final bool isSelected;
  final IconData icon;
  final VoidCallback onTap;

  const _TripTypeChip({
    required this.label,
    required this.subtitle,
    required this.isSelected,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected ? DouTheme.black : DouTheme.white,
          border: Border.all(color: DouTheme.black, width: 2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: isSelected ? DouTheme.white : DouTheme.black),
            const SizedBox(width: 6),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.bold,
                  color: isSelected ? DouTheme.white : DouTheme.black,
                )),
                Text(subtitle, style: TextStyle(
                  fontSize: 10, color: isSelected ? DouTheme.white.withOpacity(0.7) : DouTheme.grey,
                )),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SeatButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;

  const _SeatButton({required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28, height: 28,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          border: Border.all(color: DouTheme.black, width: 2),
          borderRadius: BorderRadius.circular(4),
          color: onTap != null ? DouTheme.black : DouTheme.lightGrey,
        ),
        child: Text(label, style: TextStyle(
          fontWeight: FontWeight.bold, color: onTap != null ? DouTheme.white : DouTheme.grey, fontSize: 14,
        )),
      ),
    );
  }
}

// ============================================================
// ACTIVE RIDE SCREEN (shown when ride is in progress)
// ============================================================

class _ActiveRideScreen extends StatelessWidget {
  final VoidCallback onReset;

  const _ActiveRideScreen({required this.onReset});

  @override
  Widget build(BuildContext context) {
    final ride = context.watch<RideProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Active Ride'),
        automaticallyImplyLeading: false,
        actions: [
          if (ride.isCompleted || ride.isNoShow)
            TextButton(
              onPressed: () {
                ride.reset();
                onReset();
              },
              child: const Text('Done'),
            ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (ride.isRequested) ...[
                const Icon(Icons.timer_outlined, size: 64),
                const SizedBox(height: 16),
                const Text('Finding your ride...', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('Please wait a moment', style: TextStyle(color: DouTheme.grey)),
                const SizedBox(height: 24),
                const SizedBox(width: 48, height: 48, child: CircularProgressIndicator(color: DouTheme.black)),
              ],

              if (ride.isBoarding || ride.isInProgress) ...[
                const Icon(Icons.directions_car, size: 64),
                const SizedBox(height: 16),
                Text('${ride.driverName ?? 'Driver'} — Fleet #${ride.driverFleetNumber ?? '??'}',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                if (ride.destinationName != null) ...[
                  const SizedBox(height: 8),
                  Text('To: ${ride.destinationName}', style: const TextStyle(fontSize: 16)),
                ],
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.phone),
                  label: const Text('Call Driver'),
                ),
              ],

              if (ride.isCompleted) ...[
                const Icon(Icons.check_circle, size: 64, color: DouTheme.success),
                const SizedBox(height: 16),
                const Text('Ride Complete!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('Please pay the driver via their QR pay link.', style: TextStyle(color: DouTheme.grey)),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, AppRoutes.studentPay),
                  icon: const Icon(Icons.qr_code_scanner),
                  label: const Text('Scan & Pay'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, AppRoutes.studentLostItem),
                  icon: const Icon(Icons.search, size: 18),
                  label: const Text('Report Lost Item'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    ride.reset();
                    onReset();
                  },
                  child: const Text('Skip — Already Paid'),
                ),
              ],
              if (ride.isNoShow) ...[
                const Icon(Icons.cancel, size: 64, color: DouTheme.error),
                const SizedBox(height: 16),
                const Text('No-Show Penalty', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('₦50 deducted from your wallet', style: TextStyle(color: DouTheme.grey)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
