import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:dou_transit/config/theme.dart';

/// Custom marker type enum for the campus map.
enum MarkerType {
  pickup,
  destination,
  driver,
  student,
  driverEnRoute,
  landmark,
  vendor,
  medical,
  gate,
  park,
}

/// Builds a [Marker] with a consistent brutalist style for the DOU map.
class DouMapMarker {
  /// Create a marker for the given [type] at [point].
  ///
  /// [label] is an optional short text shown below the icon.
  /// [size] controls icon container size (default 40 for most, 48 for driver).
  /// [rotation] is only relevant for direction arrows (e.g. driver facing).
  static Marker build({
    required LatLng point,
    required MarkerType type,
    String? label,
    double size = 40,
    double rotation = 0,
  }) {
    return Marker(
      point: point,
      width: 80,
      height: 60 + (label != null ? 20 : 0),
      child: _MarkerContent(type: type, label: label, size: size, rotation: rotation),
    );
  }
}

class _MarkerContent extends StatelessWidget {
  final MarkerType type;
  final String? label;
  final double size;
  final double rotation;

  const _MarkerContent({
    required this.type,
    this.label,
    required this.size,
    required this.rotation,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Optional label above
        if (label != null && type == MarkerType.landmark)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            margin: const EdgeInsets.only(bottom: 2),
            decoration: BoxDecoration(
              color: DouTheme.white.withAlpha(210),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: DouTheme.black, width: 1),
            ),
            child: Text(
              label!,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
          ),

        // Icon container
        Transform.rotate(
          angle: rotation,
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: _bgColor,
              shape: BoxShape.circle,
              border: Border.all(color: DouTheme.black, width: 2.5),
              boxShadow: [
                BoxShadow(
                  color: DouTheme.black26,
                  offset: const Offset(2, 2),
                  blurRadius: 0,
                ),
              ],
            ),
            child: Icon(_icon, color: DouTheme.white, size: size * 0.55),
          ),
        ),

        // Label below (not for landmarks - they show above)
        if (label != null && type != MarkerType.landmark)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            margin: const EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              color: DouTheme.white,
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: DouTheme.black, width: 1),
            ),
            child: Text(
              label!,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: DouTheme.black,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
      ],
    );
  }

  Color get _bgColor {
    switch (type) {
      case MarkerType.pickup:
        return const Color(0xFF1565C0); // blue
      case MarkerType.destination:
        return DouTheme.error; // red
      case MarkerType.driver:
        return DouTheme.black;
      case MarkerType.student:
        return const Color(0xFF1565C0); // blue
      case MarkerType.driverEnRoute:
        return const Color(0xFF2E7D32); // green
      case MarkerType.landmark:
        return const Color(0xFF6A1B9A); // purple
      case MarkerType.vendor:
        return const Color(0xFFE65100); // orange
      case MarkerType.medical:
        return DouTheme.error; // red
      case MarkerType.gate:
        return const Color(0xFF37474F); // blue-grey
      case MarkerType.park:
        return const Color(0xFF33691E); // dark green
    }
  }

  IconData get _icon {
    switch (type) {
      case MarkerType.pickup:
        return Icons.trip_origin;
      case MarkerType.destination:
        return Icons.flag;
      case MarkerType.driver:
        return Icons.local_taxi;
      case MarkerType.student:
        return Icons.person;
      case MarkerType.driverEnRoute:
        return Icons.directions_car;
      case MarkerType.landmark:
        return Icons.location_on;
      case MarkerType.vendor:
        return Icons.store;
      case MarkerType.medical:
        return Icons.local_hospital;
      case MarkerType.gate:
        return Icons.door_front_door;
      case MarkerType.park:
        return Icons.local_parking;
    }
  }
}
