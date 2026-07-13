import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

/// Service for fetching routes from the OSRM server.
class OsmService {
  static const String osrmUrl = 'https://dockerfile-dwb2.onrender.com';

  /// Get a route between two points. Returns list of LatLng points.
  static Future<List<LatLng>> getRoute(
    double startLat,
    double startLng,
    double endLat,
    double endLng, {
    List<List<double>>? waypoints,
  }) async {
    try {
      String coords = '$startLng,$startLat;$endLng,$endLat';

      if (waypoints != null && waypoints.length > 1) {
        coords = '$startLng,$startLat;';
        for (final wp in waypoints) {
          coords += '${wp[1]},${wp[0]};';
        }
        coords += '$endLng,$endLat';
      }

      final url = '$osrmUrl/route/v1/driving/$coords'
          '?overview=full&geometries=geojson&steps=true&alternatives=false';

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return _parseRoute(data);
      }
    } on SocketException {
      // Return straight line if offline
    } catch (e) {
      // Return straight line for any error
    }

    // Fallback: straight line
    return _straightLine(startLat, startLng, endLat, endLng);
  }

  static List<LatLng> _parseRoute(Map<String, dynamic> data) {
    final coords = <double>[];
    try {
      final routes = data['routes'] as List;
      if (routes.isEmpty) return [];

      final geometry = routes[0]['geometry'];
      if (geometry is Map) {
        final coordinates = geometry['coordinates'] as List;
        for (final coord in coordinates) {
          coords.add(coord[1].toDouble()); // lat
          coords.add(coord[0].toDouble()); // lng
        }
      }
    } catch (_) {
      return [];
    }

    final points = <LatLng>[];
    for (int i = 0; i < coords.length; i += 2) {
      points.add(LatLng(coords[i], coords[i + 1]));
    }
    return points;
  }

  static List<LatLng> _straightLine(double startLat, double startLng, double endLat, double endLng) {
    final points = <LatLng>[];
    final steps = 10;
    for (int i = 0; i <= steps; i++) {
      final t = i / steps;
      points.add(LatLng(
        startLat + (endLat - startLat) * t,
        startLng + (endLng - startLng) * t,
      ));
    }
    return points;
  }

  /// Get a route summary (distance in meters, duration in seconds).
  static Future<Map<String, double>> getRouteSummary(
    double startLat,
    double startLng,
    double endLat,
    double endLng,
  ) async {
    try {
      final url = '$osrmUrl/route/v1/driving/$startLng,$startLat;$endLng,$endLat'
          '?overview=false';
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final route = (data['routes'] as List).first;
        return {
          'distance': (route['distance'] as num).toDouble(),
          'duration': (route['duration'] as num).toDouble(),
        };
      }
    } catch (_) {}

    return {'distance': 0, 'duration': 0};
  }
}
