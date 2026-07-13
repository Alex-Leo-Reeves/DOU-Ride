import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/api_config.dart';
import 'package:dou_transit/services/osrm_service.dart';
import 'package:dou_transit/widgets/dou_map_marker.dart';

/// Screen for planning a multi-stop route with OSRM waypoints.
/// Students can add intermediate stops before reaching their final destination.
class MultiStopRouteScreen extends StatefulWidget {
  const MultiStopRouteScreen({super.key});

  @override
  State<MultiStopRouteScreen> createState() => _MultiStopRouteScreenState();
}

class _MultiStopRouteScreenState extends State<MultiStopRouteScreen> {
  final MapController _mapController = MapController();
  final List<LatLng> _stops = [];
  final List<TextEditingController> _stopNameControllers = [];
  List<LatLng> _routePoints = [];
  bool _isLoading = false;
  double _totalDistanceMeters = 0;
  double _totalDurationSeconds = 0;

  static const List<Map<String, dynamic>> _suggestedDestinations = [
    {'name': 'Faculty of Science', 'lat': 6.2530, 'lng': 6.7050},
    {'name': 'Faculty of Arts', 'lat': 6.2480, 'lng': 6.6980},
    {'name': 'Faculty of Engineering', 'lat': 6.2550, 'lng': 6.7020},
    {'name': 'Faculty of Social Sciences', 'lat': 6.2500, 'lng': 6.6950},
    {'name': 'Main Library', 'lat': 6.2510, 'lng': 6.6990},
    {'name': 'Student Affairs Building', 'lat': 6.2520, 'lng': 6.6970},
    {'name': 'Campus Gate A', 'lat': 6.2450, 'lng': 6.6880},
    {'name': 'Campus Gate B', 'lat': 6.2580, 'lng': 6.7100},
    {'name': 'Medical Centre', 'lat': 6.2470, 'lng': 6.6930},
    {'name': 'Main Cafeteria', 'lat': 6.2490, 'lng': 6.7000},
  ];

  @override
  void dispose() {
    for (final c in _stopNameControllers) {
      c.dispose();
    }
    super.dispose();
  }

  void _addStop(LatLng point, {String name = ''}) {
    setState(() {
      _stops.add(point);
      _stopNameControllers.add(TextEditingController(text: name));
    });
    _optimizeRoute();
  }

  void _removeStop(int index) {
    if (_stops.length <= 1) return; // keep at least start
    setState(() {
      _stops.removeAt(index);
      _stopNameControllers[index].dispose();
      _stopNameControllers.removeAt(index);
    });
    _optimizeRoute();
  }

  void _reorderStops(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex--;
      final stop = _stops.removeAt(oldIndex);
      final ctrl = _stopNameControllers.removeAt(oldIndex);
      _stops.insert(newIndex, stop);
      _stopNameControllers.insert(newIndex, ctrl);
    });
    _optimizeRoute();
  }

  Future<void> _optimizeRoute() async {
    if (_stops.length < 2) {
      setState(() {
        _routePoints = [];
        _totalDistanceMeters = 0;
        _totalDurationSeconds = 0;
      });
      return;
    }

    setState(() => _isLoading = true);

    try {
      // For multi-stop (>=3 points), use waypoints
      // For 2 points, just use normal route
      final start = _stops.first;
      final end = _stops.last;

      if (_stops.length > 2) {
        final waypoints = _stops.sublist(1, _stops.length - 1);
        final waypointCoords = waypoints
            .map((wp) => [wp.latitude, wp.longitude])
            .toList();

        final route = await OsmService.getRoute(
          start.latitude, start.longitude,
          end.latitude, end.longitude,
          waypoints: waypointCoords,
        );
        _routePoints = route;

        // Calculate total distance/duration
        double totalDist = 0;
        double totalDur = 0;
        for (int i = 0; i < _stops.length - 1; i++) {
          final s = _stops[i];
          final e = _stops[i + 1];
          final summary = await OsmService.getRouteSummary(
            s.latitude, s.longitude,
            e.latitude, e.longitude,
          );
          totalDist += summary['distance'] ?? 0;
          totalDur += summary['duration'] ?? 0;
        }
        _totalDistanceMeters = totalDist;
        _totalDurationSeconds = totalDur;
      } else {
        final route = await OsmService.getRoute(
          start.latitude, start.longitude,
          end.latitude, end.longitude,
        );
        _routePoints = route;

        final summary = await OsmService.getRouteSummary(
          start.latitude, start.longitude,
          end.latitude, end.longitude,
        );
        _totalDistanceMeters = summary['distance'] ?? 0;
        _totalDurationSeconds = summary['duration'] ?? 0;
      }
    } catch (_) {
      // Keep previous route on error
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  void _showSuggestedDestinations() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Add Stop', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Select a campus landmark or tap on the map', style: TextStyle(fontSize: 13, color: DouTheme.grey)),
            const SizedBox(height: 12),
            SizedBox(
              height: 200,
              child: ListView.separated(
                itemCount: _suggestedDestinations.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, idx) {
                  final d = _suggestedDestinations[idx];
                  return ListTile(
                    dense: true,
                    leading: const Icon(Icons.flag, size: 20),
                    title: Text(d['name'], style: const TextStyle(fontSize: 14)),
                    onTap: () {
                      Navigator.pop(ctx);
                      _addStop(LatLng(d['lat'], d['lng']), name: d['name']);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final center = _stops.isNotEmpty
        ? _stops.first
        : const LatLng(ApiConfig.campusCenterLat, ApiConfig.campusCenterLng);

    return Scaffold(
      backgroundColor: DouTheme.white,
      appBar: AppBar(
        title: const Text('Multi-Stop Route'),
        actions: [
          if (_stops.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear_all),
              tooltip: 'Clear all stops',
              onPressed: () {
                setState(() {
                  for (final c in _stopNameControllers) c.dispose();
                  _stops.clear();
                  _stopNameControllers.clear();
                  _routePoints = [];
                  _totalDistanceMeters = 0;
                  _totalDurationSeconds = 0;
                });
              },
            ),
        ],
      ),
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
                    initialCenter: center,
                    initialZoom: 15,
                    onTap: (tapPos, latlng) {
                      _addStop(latlng);
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.dou.transit',
                    ),

                    // Route polyline connecting all stops
                    if (_routePoints.length >= 2)
                      PolylineLayer(polylines: [
                        Polyline(
                          points: _routePoints,
                          color: DouTheme.black,
                          strokeWidth: 4,
                        ),
                      ]),

                    // Waypoints / stop markers
                    MarkerLayer(markers: [
                      for (int i = 0; i < _stops.length; i++)
                        DouMapMarker.build(
                          point: _stops[i],
                          type: i == 0
                              ? MarkerType.pickup
                              : i == _stops.length - 1
                                  ? MarkerType.destination
                                  : MarkerType.landmark,
                          label: _getStopLabel(i),
                        ),
                    ]),
                  ],
                ),

                // Floating add-stop button
                Positioned(
                  right: 16,
                  bottom: 16,
                  child: FloatingActionButton(
                    onPressed: _showSuggestedDestinations,
                    backgroundColor: DouTheme.black,
                    child: const Icon(Icons.add_location_alt, color: DouTheme.white),
                  ),
                ),

                // Loading overlay
                if (_isLoading)
                  Positioned.fill(
                    child: Container(
                      color: DouTheme.white.withAlpha(150),
                      child: const Center(
                        child: CircularProgressIndicator(color: DouTheme.black),
                      ),
                    ),
                  ),

                // Instruction overlay
                if (_stops.isEmpty)
                  Positioned(
                    top: 8,
                    left: 16,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: DouTheme.white.withAlpha(230),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: DouTheme.black),
                      ),
                      child: const Text(
                        'Tap on the map or press + to add stops',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),

                // Route summary overlay
                if (_routePoints.length >= 2)
                  Positioned(
                    top: 8,
                    left: 16,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: DouTheme.white.withAlpha(235),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: DouTheme.black),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.route, size: 16),
                          const SizedBox(width: 4),
                          Text(
                            '${(_totalDistanceMeters / 1000).toStringAsFixed(1)} km',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.access_time, size: 16),
                          const SizedBox(width: 4),
                          Text(
                            '${(_totalDurationSeconds / 60).round()} min',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${_stops.length} stops',
                            style: const TextStyle(fontSize: 12, color: DouTheme.grey),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Stops list section
          Expanded(
            flex: 2,
            child: Container(
              decoration: const BoxDecoration(
                color: DouTheme.white,
                border: Border(top: BorderSide(color: DouTheme.black, width: 2)),
              ),
              child: _stops.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.touch_app, size: 48, color: DouTheme.lightGrey),
                          SizedBox(height: 8),
                          Text('Tap the map to add stops', style: TextStyle(color: DouTheme.grey)),
                          SizedBox(height: 16),
                          Text('Add 2+ stops to plan a route', style: TextStyle(fontSize: 12, color: DouTheme.lightGrey)),
                        ],
                      ),
                    )
                  : ReorderableListView.builder(
                      itemCount: _stops.length,
                      onReorder: _reorderStops,
                      itemBuilder: (context, index) {
                        final ctrl = _stopNameControllers[index];
                        return Container(
                          key: ValueKey('stop-$index'),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          child: Row(
                            children: [
                              // Drag handle
                              const Icon(Icons.drag_handle, color: DouTheme.lightGrey),
                              const SizedBox(width: 4),

                              // Stop number badge
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: index == 0
                                      ? const Color(0xFF1565C0)
                                      : index == _stops.length - 1
                                          ? DouTheme.error
                                          : DouTheme.black,
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Text(
                                    '${index + 1}',
                                    style: const TextStyle(
                                      color: DouTheme.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),

                              // Stop name / coordinates
                              Expanded(
                                child: TextField(
                                  controller: ctrl,
                                  decoration: InputDecoration(
                                    hintText: _stops[index].toString(),
                                    hintStyle: const TextStyle(fontSize: 12, color: DouTheme.lightGrey),
                                    isDense: true,
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(6),
                                      borderSide: const BorderSide(color: DouTheme.lightGrey),
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(6),
                                      borderSide: const BorderSide(color: DouTheme.lightGrey),
                                    ),
                                  ),
                                  style: const TextStyle(fontSize: 13),
                                  onChanged: (_) {
                                    // Renaming is purely cosmetic for now
                                  },
                                ),
                              ),
                              const SizedBox(width: 4),

                              // Remove button
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, color: DouTheme.error, size: 20),
                                onPressed: _stops.length > 1 ? () => _removeStop(index) : null,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  String _getStopLabel(int index) {
    final name = _stopNameControllers.length > index
        ? _stopNameControllers[index].text.trim()
        : '';
    if (name.isNotEmpty) return name;
    if (index == 0) return 'Start';
    if (index == _stops.length - 1) return 'End';
    return 'Stop ${index + 1}';
  }
}
