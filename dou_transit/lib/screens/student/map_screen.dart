import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/api_config.dart';
import 'package:dou_transit/providers/location_provider.dart';
import 'package:dou_transit/services/osrm_service.dart';
import 'package:dou_transit/widgets/direction_guide_sheet.dart';

/// Map screen with OpenStreetMap, route polylines, markers, and directions.
class MapScreen extends StatefulWidget {
  final LatLng? initialCenter;
  final double initialZoom;
  final List<Marker>? markers;
  final List<Polyline>? polylines;
  final String? destinationName;

  const MapScreen({
    super.key,
    this.initialCenter,
    this.initialZoom = ApiConfig.defaultZoom,
    this.markers,
    this.polylines,
    this.destinationName,
  });

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  List<LatLng> _routePoints = [];
  List<Marker> _markers = [];
  double _distanceMeters = 0;
  double _durationSeconds = 0;

  @override
  void initState() {
    super.initState();
    _markers = widget.markers ?? [];
    _routePoints = [];
    if (widget.polylines != null && widget.polylines!.isNotEmpty) {
      _routePoints = widget.polylines!.first.points;
    }
  }

  Future<void> _loadRoute(LatLng start, LatLng end) async {
    final route = await OsmService.getRoute(
      start.latitude, start.longitude,
      end.latitude, end.longitude,
    );
    if (route.length >= 2) {
      setState(() => _routePoints = route);

      final summary = await OsmService.getRouteSummary(
        start.latitude, start.longitude,
        end.latitude, end.longitude,
      );
      _distanceMeters = summary['distance'] ?? 0;
      _durationSeconds = summary['duration'] ?? 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final locProvider = context.watch<LocationProvider>();
    final center = widget.initialCenter ?? LatLng(
      locProvider.currentLat ?? ApiConfig.campusCenterLat,
      locProvider.currentLng ?? ApiConfig.campusCenterLng,
    );

    return Stack(
      children: [
        // Map layer
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: center,
            initialZoom: widget.initialZoom,
            minZoom: 12,
            maxZoom: 19,
            onTap: (tapPos, latlng) {
              setState(() {
                _markers.add(Marker(
                  point: latlng,
                  width: 30,
                  height: 30,
                  child: const Icon(Icons.location_on, color: DouTheme.error, size: 30),
                ));
              });
            },
          ),
          children: [
            // OpenStreetMap tiles
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.dou.transit',
              maxZoom: 19,
            ),

            // Route polyline
            if (_routePoints.length >= 2)
              PolylineLayer(polylines: [
                Polyline(
                  points: _routePoints,
                  color: DouTheme.black,
                  strokeWidth: 4,
                ),
              ]),

            // Markers (student pickup, destination, driver locations)
            MarkerLayer(markers: _markers),

            // Current location marker
            MarkerLayer(markers: [
              Marker(
                point: center,
                width: 40,
                height: 40,
                child: Container(
                  decoration: BoxDecoration(
                    color: DouTheme.black,
                    shape: BoxShape.circle,
                    border: Border.all(color: DouTheme.white, width: 3),
                  ),
                  child: const Icon(Icons.navigation, color: DouTheme.white, size: 20),
                ),
              ),
            ]),
          ],
        ),

        // Direction guide sheet at bottom
        if (_routePoints.length >= 2)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: DirectionGuideSheet(
              route: _routePoints,
              destinationName: widget.destinationName ?? 'Destination',
              distanceMeters: _distanceMeters,
              durationSeconds: _durationSeconds,
              start: _routePoints.first,
              end: _routePoints.last,
            ),
          ),
      ],
    );
  }
}
