import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/api_config.dart';
import 'package:dou_transit/services/api_service.dart';

/// Developer mapping screen for GPS landmark recording.
/// Allows capturing precise GPS coordinates and saving them as landmarks.
class DeveloperMappingScreen extends StatefulWidget {
  const DeveloperMappingScreen({super.key});

  @override
  State<DeveloperMappingScreen> createState() => _DeveloperMappingScreenState();
}

class _DeveloperMappingScreenState extends State<DeveloperMappingScreen> {
  final MapController _mapController = MapController();
  final _nameCtrl = TextEditingController();
  LatLng? _capturedPoint;
  String _selectedType = 'destination';
  bool _isCapturing = false;
  bool _isSaving = false;
  List<Map<String, dynamic>> _savedLandmarks = [];
  LatLng _currentCenter = LatLng(ApiConfig.campusCenterLat, ApiConfig.campusCenterLng);

  final List<Map<String, dynamic>> _landmarkTypes = [
    {'key': 'destination', 'label': 'Destination', 'icon': Icons.flag},
    {'key': 'pickup_zone', 'label': 'Pickup Zone', 'icon': Icons.directions_bus},
    {'key': 'vendor', 'label': 'Vendor', 'icon': Icons.store},
    {'key': 'medical_center', 'label': 'Medical Center', 'icon': Icons.local_hospital},
    {'key': 'park', 'label': 'Park', 'icon': Icons.local_parking},
    {'key': 'gate', 'label': 'Gate', 'icon': Icons.door_front_door},
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _captureCurrentLocation() async {
    setState(() => _isCapturing = true);

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _showError('GPS is disabled');
      setState(() => _isCapturing = false);
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _showError('Location permission denied');
        setState(() => _isCapturing = false);
        return;
      }
    }

    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );

      setState(() {
        _capturedPoint = LatLng(pos.latitude, pos.longitude);
        _currentCenter = LatLng(pos.latitude, pos.longitude);
        _isCapturing = false;
      });

      _mapController.move(_currentCenter, 18);
    } catch (e) {
      _showError('Failed to get GPS: $e');
      setState(() => _isCapturing = false);
    }
  }

  Future<void> _saveLandmark() async {
    if (_capturedPoint == null) {
      _showError('Capture a GPS point first');
      return;
    }
    if (_nameCtrl.text.trim().isEmpty) {
      _showError('Enter a landmark name');
      return;
    }

    setState(() => _isSaving = true);

    try {
      final result = await ApiService.post('/api/landmarks/add', body: {
        'displayName': _nameCtrl.text.trim(),
        'latitude': _capturedPoint!.latitude,
        'longitude': _capturedPoint!.longitude,
        'landmarkType': _selectedType,
      });

      if (result['error'] == null) {
        setState(() {
          _savedLandmarks.add({
            'name': _nameCtrl.text.trim(),
            'lat': _capturedPoint!.latitude,
            'lng': _capturedPoint!.longitude,
            'type': _selectedType,
          });
          _nameCtrl.clear();
          _capturedPoint = null;
        });
        _showSuccess('Landmark saved!');
      } else {
        _showError('Save failed: ${result['error']}');
      }
    } catch (e) {
      // Offline save - store locally
      setState(() {
        _savedLandmarks.add({
          'name': _nameCtrl.text.trim(),
          'lat': _capturedPoint!.latitude,
          'lng': _capturedPoint!.longitude,
          'type': _selectedType,
        });
        _nameCtrl.clear();
        _capturedPoint = null;
      });
      _showSuccess('Landmark saved (offline)');
    }

    setState(() => _isSaving = false);
  }

  void _showError(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: DouTheme.error),
      );
    }
  }

  void _showSuccess(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: DouTheme.success),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DouTheme.white,
      appBar: AppBar(title: const Text('GPS Landmark Mapper')),
      body: Column(
        children: [
          // Map section
          Expanded(
            flex: 3,
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _currentCenter,
                    initialZoom: 16,
                    onTap: (tapPos, latlng) {
                      setState(() => _capturedPoint = latlng);
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.dou.transit',
                    ),
                    MarkerLayer(markers: [
                      if (_capturedPoint != null)
                        Marker(
                          point: _capturedPoint!,
                          width: 40,
                          height: 40,
                          child: const Icon(Icons.location_on, color: DouTheme.error, size: 40),
                        ),
                      ..._savedLandmarks.map((lm) => Marker(
                        point: LatLng(lm['lat'], lm['lng']),
                        width: 30, height: 30,
                        child: const Icon(Icons.flag, color: DouTheme.black, size: 30),
                      )),
                    ]),
                  ],
                ),

                // GPS capture button overlay
                Positioned(
                  right: 16,
                  bottom: 16,
                  child: FloatingActionButton(
                    onPressed: _captureCurrentLocation,
                    backgroundColor: DouTheme.black,
                    child: _isCapturing
                        ? const SizedBox(
                            width: 24, height: 24,
                            child: CircularProgressIndicator(color: DouTheme.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.gps_fixed, color: DouTheme.white),
                  ),
                ),

                // Coordinate display at top
                if (_capturedPoint != null)
                  Positioned(
                    top: 8,
                    left: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: DouTheme.white.withAlpha(230),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: DouTheme.black),
                      ),
                      child: Text(
                        '${_capturedPoint!.latitude.toStringAsFixed(6)}, ${_capturedPoint!.longitude.toStringAsFixed(6)}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Form section
          Expanded(
            flex: 2,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: DouTheme.white,
                border: Border(top: BorderSide(color: DouTheme.black, width: 2)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: _nameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Landmark Name',
                        hintText: 'e.g., Faculty of Science',
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Landmark type chips
                    SizedBox(
                      height: 36,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: _landmarkTypes.map((type) {
                          final isSelected = _selectedType == type['key'];
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text(type['label'], style: TextStyle(
                                fontSize: 12,
                                color: isSelected ? DouTheme.white : DouTheme.black,
                              )),
                              selected: isSelected,
                              onSelected: (_) => setState(() => _selectedType = type['key']),
                              selectedColor: DouTheme.black,
                              checkmarkColor: DouTheme.white,
                              side: const BorderSide(color: DouTheme.black),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 12),

                    Row(
                      children: [
                        // Clear button
                        if (_capturedPoint != null)
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => setState(() => _capturedPoint = null),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              child: const Text('Clear', style: TextStyle(fontSize: 14)),
                            ),
                          ),
                        if (_capturedPoint != null) const SizedBox(width: 12),

                        // Save button
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed: _isSaving ? null : _saveLandmark,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: _isSaving
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: DouTheme.white, strokeWidth: 2))
                                : const Text('Save Landmark', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),

                    // Saved landmarks count
                    if (_savedLandmarks.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '${_savedLandmarks.length} landmarks saved',
                          style: const TextStyle(fontSize: 12, color: DouTheme.grey),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
