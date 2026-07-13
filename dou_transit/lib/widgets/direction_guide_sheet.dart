import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/api_config.dart';

/// An OSRM turn-by-turn instruction step.
class RouteStep {
  final String instruction;
  final double distanceMeters;
  final double durationSeconds;
  final int turnAngle;
  final String? turnModifier; // 'left', 'right', 'straight', 'uturn', etc.

  RouteStep({
    required this.instruction,
    required this.distanceMeters,
    required this.durationSeconds,
    this.turnAngle = 0,
    this.turnModifier,
  });
}

/// A DraggableScrollableSheet that shows turn-by-turn directions
/// fetched from OSRM for a route.
class DirectionGuideSheet extends StatefulWidget {
  final List<LatLng> route;
  final String destinationName;
  final double distanceMeters;
  final double durationSeconds;
  final LatLng start;
  final LatLng end;

  const DirectionGuideSheet({
    super.key,
    required this.route,
    required this.destinationName,
    this.distanceMeters = 0,
    this.durationSeconds = 0,
    required this.start,
    required this.end,
  });

  @override
  State<DirectionGuideSheet> createState() => _DirectionGuideSheetState();
}

class _DirectionGuideSheetState extends State<DirectionGuideSheet> {
  List<RouteStep> _steps = [];
  bool _loadingSteps = true;

  @override
  void initState() {
    super.initState();
    _fetchSteps();
  }

  Future<void> _fetchSteps() async {
    try {
      final url = '${ApiConfig.osrmUrl}/route/v1/driving'
          '/${widget.start.longitude},${widget.start.latitude}'
          '/${widget.end.longitude},${widget.end.latitude}'
          '?overview=false&geometries=geojson&steps=true&alternatives=false';

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final routes = data['routes'] as List;
        if (routes.isNotEmpty) {
          final legs = routes[0]['legs'] as List;
          if (legs.isNotEmpty) {
            final steps = legs[0]['steps'] as List;
            final parsed = <RouteStep>[];
            for (final step in steps) {
              final maneuver = step['maneuver'] ?? {};
              final modifier = maneuver['modifier'] as String?;
              final instruction = step['maneuver']['instruction'] as String? ?? 'Continue';
              final distance = (step['distance'] as num).toDouble();
              final duration = (step['duration'] as num).toDouble();
              parsed.add(RouteStep(
                instruction: instruction,
                distanceMeters: distance,
                durationSeconds: duration,
                turnModifier: modifier,
              ));
            }
            if (mounted) {
              setState(() {
                _steps = parsed;
                _loadingSteps = false;
              });
            }
            return;
          }
        }
      }
    } catch (_) {}

    // Fallback: generate simple steps from polyline points
    if (mounted) {
      setState(() {
        _steps = _fallbackSteps();
        _loadingSteps = false;
      });
    }
  }

  List<RouteStep> _fallbackSteps() {
    if (widget.route.length < 2) return [];
    final steps = <RouteStep>[];
    for (int i = 0; i < widget.route.length - 1; i++) {
      final a = widget.route[i];
      final b = widget.route[i + 1];
      final dist = _haversine(a.latitude, a.longitude, b.latitude, b.longitude);
      if (dist > 5) {
        // Only show significant segments
        final bearing = _bearing(a.latitude, a.longitude, b.latitude, b.longitude);
        steps.add(RouteStep(
          instruction: _bearingToInstruction(bearing),
          distanceMeters: dist,
          durationSeconds: dist / 1.4, // ~5 km/h walking pace
        ));
      }
    }
    return steps;
  }

  @override
  Widget build(BuildContext context) {
    final distanceKm = widget.distanceMeters / 1000;
    final durationMin = (widget.durationSeconds / 60).round();

    return DraggableScrollableSheet(
      initialChildSize: _loadingSteps || _steps.isEmpty ? 0.12 : 0.10,
      minChildSize: _loadingSteps || _steps.isEmpty ? 0.12 : 0.10,
      maxChildSize: 0.5,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: DouTheme.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            border: Border(top: BorderSide(color: DouTheme.black, width: 2)),
          ),
          child: Column(
            children: [
              // Drag handle
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: DouTheme.lightGrey,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Route summary header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    const Icon(Icons.directions_car, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.destinationName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      '${distanceKm.toStringAsFixed(1)} km',
                      style: const TextStyle(fontSize: 14, color: DouTheme.grey),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${durationMin} min',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: DouTheme.success,
                      ),
                    ),
                  ],
                ),
              ),

              const Divider(height: 16),

              // Turn-by-turn directions
              Expanded(
                child: _loadingSteps
                    ? const Center(child: CircularProgressIndicator(color: DouTheme.black))
                    : _steps.isEmpty
                        ? const Center(child: Text('No route available'))
                        : ListView.builder(
                            controller: scrollController,
                            itemCount: _steps.length + 1,
                            itemBuilder: (context, index) {
                              if (index == 0) {
                                return _StepTile(
                                  number: 'S',
                                  instruction: 'Start at your location',
                                  distanceMeters: 0,
                                  icon: Icons.trip_origin,
                                  isFirst: true,
                                );
                              }
                              final step = _steps[index - 1];
                              final modifier = step.turnModifier;
                              return _StepTile(
                                number: '${index}',
                                instruction: _formatInstruction(step.instruction),
                                distanceMeters: step.distanceMeters,
                                icon: _turnIcon(modifier),
                                turnModifier: modifier,
                                isLast: index == _steps.length,
                              );
                            },
                          ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _formatInstruction(String raw) {
    // Capitalize first letter
    if (raw.isEmpty) return raw;
    return raw[0].toUpperCase() + raw.substring(1);
  }

  IconData _turnIcon(String? modifier) {
    switch (modifier) {
      case 'left':
      case 'sharp left':
        return Icons.turn_left;
      case 'right':
      case 'sharp right':
        return Icons.turn_right;
      case 'straight':
        return Icons.arrow_upward;
      case 'uturn':
        return Icons.turn_slight_left; // approximate
      case 'slight left':
        return Icons.turn_slight_left;
      case 'slight right':
        return Icons.turn_slight_right;
      case 'ramp left':
      case 'ramp right':
        return Icons.ramp_left;
      default:
        return Icons.navigation;
    }
  }

  double _haversine(double lat1, double lon1, double lat2, double lon2) {
    const R = 6371000;
    final dLat = _toRad(lat2 - lat1);
    final dLon = _toRad(lon2 - lon1);
    final sinHalfDLat = math.sin(dLat / 2);
    final sinHalfDLon = math.sin(dLon / 2);
    final a = sinHalfDLat * sinHalfDLat +
        math.cos(_toRad(lat1)) * math.cos(_toRad(lat2)) * sinHalfDLon * sinHalfDLon;
    final c = 2 * math.asin(math.sqrt(a));
    return R * c;
  }

  double _toRad(double deg) => deg * (math.pi / 180);

  double _bearing(double lat1, double lon1, double lat2, double lon2) {
    final dLon = _toRad(lon2 - lon1);
    final y = math.sin(dLon) * math.cos(_toRad(lat2));
    final x = math.cos(_toRad(lat1)) * math.sin(_toRad(lat2)) -
        math.sin(_toRad(lat1)) * math.cos(_toRad(lat2)) * math.cos(dLon);
    return (math.atan2(y, x) * 180 / math.pi + 360) % 360;
  }

  String _bearingToInstruction(double bearing) {
    if (bearing >= 337.5 || bearing < 22.5) return 'Head north';
    if (bearing < 67.5) return 'Head northeast';
    if (bearing < 112.5) return 'Head east';
    if (bearing < 157.5) return 'Head southeast';
    if (bearing < 202.5) return 'Head south';
    if (bearing < 247.5) return 'Head southwest';
    if (bearing < 292.5) return 'Head west';
    return 'Head northwest';
  }
}

class _StepTile extends StatelessWidget {
  final String number;
  final String instruction;
  final double distanceMeters;
  final IconData icon;
  final bool isFirst;
  final bool isLast;
  final String? turnModifier;

  const _StepTile({
    required this.number,
    required this.instruction,
    required this.distanceMeters,
    required this.icon,
    this.isFirst = false,
    this.isLast = false,
    this.turnModifier,
  });

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Step number column with connector line
          SizedBox(
            width: 48,
            child: Column(
              children: [
                // Top connector
                if (!isFirst)
                  Expanded(child: Container(width: 2, color: DouTheme.lightGrey)),
                if (isFirst) const Expanded(child: SizedBox()),

                // Step circle
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: isFirst ? DouTheme.success : DouTheme.black,
                    shape: BoxShape.circle,
                  ),
                  child: isFirst
                      ? const Icon(Icons.check, color: DouTheme.white, size: 16)
                      : Center(
                          child: Icon(icon, color: DouTheme.white, size: 16),
                        ),
                ),

                // Bottom connector
                if (!isLast)
                  Expanded(child: Container(width: 2, color: DouTheme.lightGrey)),
                if (isLast) const Expanded(child: SizedBox()),
              ],
            ),
          ),

          // Instruction text
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    instruction,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isFirst ? FontWeight.bold : FontWeight.w500,
                    ),
                  ),
                  if (distanceMeters > 0)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        '${distanceMeters.toStringAsFixed(0)} m',
                        style: const TextStyle(fontSize: 12, color: DouTheme.grey),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
