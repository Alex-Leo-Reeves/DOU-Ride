import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:share_plus/share_plus.dart' as share_plus;
import 'package:dou_transit/config/theme.dart';

/// Screen for sharing the user's current GPS location via native share sheet.
/// Accessible from the student map screen (share icon in app bar).
class LocationSharingScreen extends StatefulWidget {
  const LocationSharingScreen({super.key});

  @override
  State<LocationSharingScreen> createState() => _LocationSharingScreenState();
}

class _LocationSharingScreenState extends State<LocationSharingScreen> {
  double? _latitude;
  double? _longitude;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchLocation();
  }

  Future<void> _fetchLocation() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() {
        _error = 'GPS is disabled. Enable it in Settings.';
        _isLoading = false;
      });
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        setState(() {
          _error = 'Location permission denied.';
          _isLoading = false;
        });
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      setState(() {
        _error = 'Location permission permanently denied. Enable in Settings.';
        _isLoading = false;
      });
      return;
    }

    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );

      setState(() {
        _latitude = pos.latitude;
        _longitude = pos.longitude;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to get location: $e';
        _isLoading = false;
      });
    }
  }

  void _shareLocation() {
    if (_latitude == null || _longitude == null) return;

    final latStr = _latitude!.toStringAsFixed(6);
    final lngStr = _longitude!.toStringAsFixed(6);
    final mapsUrl = 'https://www.google.com/maps?q=$latStr,$lngStr';
    final shareText = '📍 I\'m at DOU Campus\n'
        'Lat: $latStr\n'
        'Lng: $lngStr\n'
        'Open in Maps: $mapsUrl';

    share_plus.Share.share(shareText);
  }

  void _copyToClipboard() {
    if (_latitude == null || _longitude == null) return;

    final latStr = _latitude!.toStringAsFixed(6);
    final lngStr = _longitude!.toStringAsFixed(6);
    Clipboard.setData(ClipboardData(text: '$latStr, $lngStr'));

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Coordinates copied to clipboard')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DouTheme.white,
      appBar: AppBar(title: const Text('Share Location')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 32),

            // Icon
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: DouTheme.black,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.share_location, color: DouTheme.white, size: 48),
            ),
            const SizedBox(height: 24),

            const Text(
              'Share Your Location',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Send your current GPS coordinates to a friend, driver, or emergency contact.',
              style: TextStyle(fontSize: 14, color: DouTheme.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            // Loading state
            if (_isLoading)
              const Column(
                children: [
                  CircularProgressIndicator(color: DouTheme.black),
                  SizedBox(height: 16),
                  Text('Fetching your location...', style: TextStyle(fontSize: 14, color: DouTheme.grey)),
                ],
              ),

            // Error state
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: DouTheme.error.withAlpha(25),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: DouTheme.error, width: 1),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: DouTheme.error, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(color: DouTheme.error, fontSize: 14),
                      ),
                    ),
                  ],
                ),
              ),

            // Coordinate display
            if (_latitude != null && _longitude != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: DouTheme.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: DouTheme.black, width: 2),
                ),
                child: Column(
                  children: [
                    _CoordRow(label: 'Latitude', value: _latitude!.toStringAsFixed(6)),
                    const Divider(height: 16),
                    _CoordRow(label: 'Longitude', value: _longitude!.toStringAsFixed(6)),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Accuracy: ~${_latitude!.toStringAsFixed(1)}m',
                style: const TextStyle(fontSize: 12, color: DouTheme.grey),
              ),
              const SizedBox(height: 24),

              // Share button
              ElevatedButton.icon(
                onPressed: _shareLocation,
                icon: const Icon(Icons.share, color: DouTheme.white),
                label: const Text('Share Location'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 52),
                ),
              ),
              const SizedBox(height: 12),

              // Copy button
              OutlinedButton.icon(
                onPressed: _copyToClipboard,
                icon: const Icon(Icons.copy, size: 20),
                label: const Text('Copy Coordinates'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 52),
                ),
              ),
              const SizedBox(height: 12),

              // Refresh button
              TextButton.icon(
                onPressed: _fetchLocation,
                icon: const Icon(Icons.refresh, size: 20),
                label: const Text('Refresh Location'),
              ),
            ],

            const Spacer(),

            // Maps URL hint
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: DouTheme.lightGrey.withAlpha(100),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, size: 16, color: DouTheme.grey),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Shared links open in Google Maps for easy navigation.',
                      style: TextStyle(fontSize: 12, color: DouTheme.grey),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _CoordRow extends StatelessWidget {
  final String label;
  final String value;

  const _CoordRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, color: DouTheme.grey)),
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
