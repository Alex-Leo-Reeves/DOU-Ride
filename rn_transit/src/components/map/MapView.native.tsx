import React, { forwardRef } from 'react';
import RNMapView, {
  Marker as RNMarker,
  Polyline as RNPolyline,
  UrlTile as RNUrlTile,
  MapPressEvent,
} from 'react-native-maps';
import { View } from 'react-native';
import type { MapViewProps, MarkerData, MapViewRef } from './types';

/** Default provider string for native maps */
export const PROVIDER_DEFAULT = 'default';

const MapView = forwardRef<MapViewRef, MapViewProps>((props, ref) => {
  const mapRef = React.useRef<RNMapView>(null);

  React.useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration?: number) => {
      mapRef.current?.animateToRegion(
        {
          latitude: region.latitude,
          longitude: region.longitude,
          latitudeDelta: region.latitudeDelta ?? 0.01,
          longitudeDelta: region.longitudeDelta ?? 0.01,
        },
        duration ?? 500,
      );
    },
  }));

  const handlePress = (e: MapPressEvent) => {
    props.onPress?.({
      latitude: e.nativeEvent.coordinate.latitude,
      longitude: e.nativeEvent.coordinate.longitude,
    });
  };

  const region = props.region
    ? {
        latitude: props.region.latitude,
        longitude: props.region.longitude,
        latitudeDelta: props.region.latitudeDelta ?? 0.01,
        longitudeDelta: props.region.longitudeDelta ?? 0.01,
      }
    : undefined;

  const initialRegion = props.initialRegion
    ? {
        latitude: props.initialRegion.latitude,
        longitude: props.initialRegion.longitude,
        latitudeDelta: props.initialRegion.latitudeDelta ?? 0.01,
        longitudeDelta: props.initialRegion.longitudeDelta ?? 0.01,
      }
    : undefined;

  return (
    <View style={[{ flex: 1 }, props.style]}>
      <RNMapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        region={region}
        onPress={handlePress}
        showsUserLocation={props.showsUserLocation}
        showsMyLocationButton={props.showsMyLocationButton}
        rotateEnabled={false}
        mapType="standard"
      >
        <RNUrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        {props.routePoints && props.routePoints.length >= 2 && (
          <RNPolyline
            coordinates={props.routePoints as any}
            strokeColor="#000000"
            strokeWidth={4}
          />
        )}

        {props.markers?.map((m: MarkerData, i: number) => (
          <RNMarker
            key={m.id ?? `m-${i}`}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
            description={m.description}
            pinColor={m.pinColor}
          />
        ))}

        {props.children}
      </RNMapView>
    </View>
  );
});

MapView.displayName = 'MapView';
export default MapView;
