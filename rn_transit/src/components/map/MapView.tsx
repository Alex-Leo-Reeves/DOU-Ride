/**
 * Web MapView implementation (react-leaflet / Leaflet).
 * Metro resolves this file on web; on native it resolves MapView.native.tsx instead.
 *
 * Tile provider: CartoDB Voyager (fast CDN, detailed, free, no API key).
 * Location: On desktop browsers, IP-based geolocation is inaccurate in Nigeria
 *   (ISPs route through Lagos/PH), so we always default-center on DOU campus
 *   and show a pulsing blue dot at the user's reported position with a disclaimer.
 */
import React, { forwardRef, useEffect, useCallback, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapViewProps, MarkerData, MapViewRef } from './types';

export type { MapViewRef };

// Fix default Leaflet marker icon paths
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// DOU Campus center (Asaba, Delta State)
const DOU_CENTER: [number, number] = [6.25, 6.70];
const DOU_DEFAULT_ZOOM = 16;

const colorToHex = (color?: string): string => {
  switch (color) {
    case 'red':
    case '#D32F2F':
      return '#D32F2F';
    case 'blue':
    case '#1565C0':
      return '#1565C0';
    case 'green':
    case '#2E7D32':
      return '#2E7D32';
    case 'orange':
    case '#FFA000':
      return '#FFA000';
    default:
      return '#000000';
  }
};

/** Convert latitudeDelta to a Leaflet zoom level */
function deltaToZoom(latitudeDelta?: number, longitudeDelta?: number): number {
  if (latitudeDelta) {
    const z = Math.round(Math.log2(360 / (latitudeDelta || 0.005)));
    return Math.min(Math.max(z, 1), 20);
  }
  return DOU_DEFAULT_ZOOM;
}

// ── Pulsing blue dot for user location ──

// Inject the CSS animation for the pulsing effect once
const PULSE_STYLE_ID = 'leaflet-pulse-style';
function injectPulseStyle() {
  if (document.getElementById(PULSE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PULSE_STYLE_ID;
  style.textContent = `
    @keyframes pulse-ring {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    .user-location-dot {
      width: 18px;
      height: 18px;
      background: #4285F4;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(66,133,244,0.6);
      position: relative;
    }
    .user-location-dot::after {
      content: '';
      position: absolute;
      top: -3px;
      left: -3px;
      width: 18px;
      height: 18px;
      border: 3px solid #4285F4;
      border-radius: 50%;
      animation: pulse-ring 2s ease-out infinite;
    }
  `;
  document.head.appendChild(style);
}

const userDotIcon = L.divIcon({
  html: '<div class="user-location-dot"></div>',
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function UserLocationDot({ map }: { map: L.Map }) {
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    injectPulseStyle();
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        } else {
          markerRef.current = L.marker([latitude, longitude], { icon: userDotIcon, zIndexOffset: 1000 }).addTo(map);
        }

        // Update accuracy circle
        if (accuracyRef.current) {
          accuracyRef.current.setLatLng([latitude, longitude]);
          if (accuracy) accuracyRef.current.setRadius(accuracy);
        } else if (accuracy) {
          accuracyRef.current = L.circle([latitude, longitude], {
            radius: accuracy,
            color: 'rgba(66,133,244,0.2)',
            fillColor: 'rgba(66,133,244,0.1)',
            fillOpacity: 0.3,
            weight: 1,
            interactive: false,
          }).addTo(map);
        }
      },
      () => {}, // silently handle errors — map stays on DOU campus
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      markerRef.current?.remove();
      accuracyRef.current?.remove();
    };
  }, [map]);

  return null;
}

// ── Internal components that interact with the Leaflet map instance ──

function MapInternals({
  onPress,
  region,
  showsUserLocation,
  onAnimateRef,
}: {
  onPress?: (coord: { latitude: number; longitude: number }) => void;
  region?: MapViewProps['region'];
  showsUserLocation?: boolean;
  onAnimateRef?: React.MutableRefObject<((r: NonNullable<MapViewProps['region']>, d?: number) => void) | null>;
}) {
  const map = useMap();

  // Expose animate function via ref
  useEffect(() => {
    if (onAnimateRef) {
      onAnimateRef.current = (r, duration) => {
        const zoom = deltaToZoom(r.latitudeDelta, r.longitudeDelta);
        map.flyTo([r.latitude, r.longitude], zoom, { duration: (duration ?? 500) / 1000 });
      };
    }
  }, [map, onAnimateRef]);

  // Click handler
  useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      onPress?.({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });

  // Controlled region
  useEffect(() => {
    if (region) {
      const zoom = deltaToZoom(region.latitudeDelta, region.longitudeDelta);
      map.setView([region.latitude, region.longitude], zoom, { animate: true });
    }
  }, [region?.latitude, region?.longitude, region?.latitudeDelta, map]);

  // User location dot (does NOT auto-center — stays on DOU campus)
  if (showsUserLocation) {
    return <UserLocationDot map={map} />;
  }

  return null;
}

// ── Main MapView component ──

const MapView = forwardRef<MapViewRef, MapViewProps>((props, ref) => {
  const animateRef = useRef<((r: NonNullable<MapViewProps['region']>, d?: number) => void) | null>(null);
  const [recenterLoading, setRecenterLoading] = useState(false);

  React.useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration) => {
      if (animateRef.current) {
        animateRef.current(region, duration);
      }
    },
  }));

  // Always default to DOU campus center
  const center: [number, number] = props.region
    ? [props.region.latitude, props.region.longitude]
    : props.initialRegion
      ? [props.initialRegion.latitude, props.initialRegion.longitude]
      : DOU_CENTER;

  const zoom = props.initialRegion
    ? deltaToZoom(props.initialRegion.latitudeDelta, props.initialRegion.longitudeDelta)
    : DOU_DEFAULT_ZOOM;

  const handlePress = useCallback(
    (coord: { latitude: number; longitude: number }) => {
      props.onPress?.(coord);
    },
    [props.onPress],
  );

  // Recenter to DOU campus (not browser GPS which is inaccurate on desktop)
  const handleRecenterCampus = useCallback(() => {
    if (animateRef.current) {
      animateRef.current(
        {
          latitude: DOU_CENTER[0],
          longitude: DOU_CENTER[1],
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        1000,
      );
    }
  }, []);

  // Recenter to GPS location (with warning)
  const handleRecenterGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    setRecenterLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRecenterLoading(false);
        if (animateRef.current) {
          animateRef.current(
            {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            },
            1000,
          );
        }
      },
      () => {
        setRecenterLoading(false);
        // If GPS fails, just go to campus
        handleRecenterCampus();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }, [handleRecenterCampus]);

  return (
    <div style={{ flex: 1, minHeight: '100%', position: 'relative', ...props.style }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', minHeight: '400px', zIndex: 0 }}
        zoomControl={props.interactive !== false}
        dragging={props.interactive !== false}
        scrollWheelZoom={props.interactive !== false}
        doubleClickZoom={props.interactive !== false}
        touchZoom={props.interactive !== false}
        maxZoom={20}
        minZoom={5}
      >
        {/* CartoDB Voyager — fast CDN, detailed, free with API key, supports zoom 0–20 */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_340q_1_f290417ab1be745f61052284"
          maxZoom={20}
          subdomains="abcd"
        />

        <MapInternals
          onPress={handlePress}
          region={props.region}
          showsUserLocation={props.showsUserLocation}
          onAnimateRef={animateRef}
        />

        {props.routePoints && props.routePoints.length >= 2 && (
          <Polyline
            positions={props.routePoints.map((p) => [p.latitude, p.longitude] as [number, number])}
            pathOptions={{ color: '#000000', weight: 4 }}
          />
        )}

        {props.markers?.map((m: MarkerData, i: number) => {
          const color = colorToHex(m.pinColor);
          const iconHtml = `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:3px solid #000;box-shadow:2px 2px 0 #000;"></div>`;
          const icon = L.divIcon({
            html: iconHtml,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          return (
            <Marker
              key={m.id ?? `m-${i}`}
              position={[m.latitude, m.longitude]}
              icon={icon}
              title={m.title}
            />
          );
        })}

        {props.children as any}
      </MapContainer>

      {/* Floating buttons — Campus + GPS */}
      {props.interactive !== false && (
        <div style={{ position: 'absolute', bottom: '30px', right: '14px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Go to Campus button */}
          <div
            onClick={handleRecenterCampus}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
              cursor: 'pointer',
              fontSize: '20px',
              border: '2px solid #000',
              userSelect: 'none',
            }}
            title="Go to DOU Campus"
          >
            🏫
          </div>
          {/* Go to My Location button */}
          {props.showsMyLocationButton !== false && (
            <div
              onClick={handleRecenterGPS}
              style={{
                backgroundColor: '#fff',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                cursor: 'pointer',
                fontSize: '20px',
                border: '2px solid #000',
                userSelect: 'none',
                opacity: recenterLoading ? 0.5 : 1,
              }}
              title="Go to My Location (GPS — may be inaccurate on desktop)"
            >
              {recenterLoading ? '⏳' : '📍'}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

MapView.displayName = 'MapView';
export default MapView;
