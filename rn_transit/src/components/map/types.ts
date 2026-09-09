/** Shared types for the platform-abstracted map components. */

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface MarkerData extends MapPoint {
  id?: string;
  title?: string;
  description?: string;
  pinColor?: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

export interface MapViewProps {
  /** Initial region / center of the map */
  initialRegion?: MapRegion;
  /** Current region (controlled) */
  region?: MapRegion;
  /** Whether to show the user location dot */
  showsUserLocation?: boolean;
  /** Whether to show the my-location button */
  showsMyLocationButton?: boolean;
  /** Whether to continuously follow the user's location as it updates */
  followsUserLocation?: boolean;
  /** Markers to render */
  markers?: MarkerData[];
  /** Route polyline points (if any) */
  routePoints?: MapPoint[];
  /** Whether the map is interactive (pan/zoom) */
  interactive?: boolean;
  /** Called when the map is tapped/pressed */
  onPress?: (coordinate: { latitude: number; longitude: number }) => void;
  /** Called when the region changes */
  onRegionChange?: (region: MapRegion) => void;
  /** Optional style override */
  style?: any;
  /** Children (for custom overlays) */
  children?: React.ReactNode;
}

export interface MapViewRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
}
