import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dou_transit/config/api_config.dart';

class LocationProvider extends ChangeNotifier {
  double? _currentLat;
  double? _currentLng;
  List<Map<String, dynamic>> _driverLocations = [];
  bool _isLoading = false;
  bool _isTracking = false;

  double? get currentLat => _currentLat;
  double? get currentLng => _currentLng;
  List<Map<String, dynamic>> get driverLocations => _driverLocations;
  bool get isLoading => _isLoading;
  bool get isTracking => _isTracking;

  Future<bool> startTracking() async {
    _isTracking = true;
    notifyListeners();

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _isTracking = false;
      notifyListeners();
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _isTracking = false;
        notifyListeners();
        return false;
      }
    }

    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((Position pos) {
      _currentLat = pos.latitude;
      _currentLng = pos.longitude;
      notifyListeners();
    });

    return true;
  }

  void stopTracking() {
    _isTracking = false;
    notifyListeners();
  }

  Future<void> updateDriverLocation(double lat, double lng) async {
    // TODO: ApiService.post('/api/driver/location', body: {...})
    _currentLat = lat;
    _currentLng = lng;
    notifyListeners();
  }

  Future<void> fetchDriverLocations() async {
    _isLoading = true;
    notifyListeners();
    // TODO: ApiService.get('/api/driver/location')
    _isLoading = false;
    notifyListeners();
  }

  List<LatLng> getRouteFromCoords(double startLat, double startLng, double endLat, double endLng) {
    // TODO: Call OSRM API
    return [
      LatLng(startLat, startLng),
      LatLng((startLat + endLat) / 2, (startLng + endLng) / 2),
      LatLng(endLat, endLng),
    ];
  }
}
