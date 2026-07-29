/**
 * OSRM routing service — fetches driving/walking routes from the OSRM server.
 * Mirrors Flutter's OsmService.
 */

const OSRM_URL = 'https://dockerfile-dwb2.onrender.com';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  turnModifier?: string;
}

/**
 * Get a route between two points. Returns an array of {lat, lng} points.
 */
export async function getRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  waypoints?: RoutePoint[],
): Promise<RoutePoint[]> {
  try {
    let coords = `${startLng},${startLat};${endLng},${endLat}`;

    if (waypoints && waypoints.length > 0) {
      coords = `${startLng},${startLat};`;
      for (const wp of waypoints) {
        coords += `${wp.lng},${wp.lat};`;
      }
      coords += `${endLng},${endLat}`;
    }

    const url = `${OSRM_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true&alternatives=false`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (response.ok) {
      const data = await response.json();
      return parseRoute(data);
    }
  } catch {
    // fall through to straight-line fallback
  }

  return straightLine(startLat, startLng, endLat, endLng);
}

function parseRoute(data: Record<string, unknown>): RoutePoint[] {
  try {
    const routes = data.routes as Record<string, unknown>[];
    if (!routes?.length) return [];

    const geometry = routes[0].geometry as Record<string, unknown>;
    const coordinates = geometry?.coordinates as number[][];
    if (!coordinates?.length) return [];

    return coordinates.map((coord) => ({
      lat: coord[1],
      lng: coord[0],
    }));
  } catch {
    return [];
  }
}

function straightLine(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): RoutePoint[] {
  const points: RoutePoint[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      lat: startLat + (endLat - startLat) * t,
      lng: startLng + (endLng - startLng) * t,
    });
  }
  return points;
}

/**
 * Get a route summary (distance in meters, duration in seconds).
 */
export async function getRouteSummary(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): Promise<{ distance: number; duration: number }> {
  try {
    const url = `${OSRM_URL}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (response.ok) {
      const data = await response.json();
      const route = (data.routes as Record<string, unknown>[])?.[0];
      if (route) {
        return {
          distance: (route.distance as number) ?? 0,
          duration: (route.duration as number) ?? 0,
        };
      }
    }
  } catch {
    // fall through
  }

  return { distance: 0, duration: 0 };
}

/**
 * Fetch turn-by-turn directions for a route.
 */
export async function getRouteSteps(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): Promise<RouteStep[]> {
  try {
    const url = `${OSRM_URL}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false&steps=true&alternatives=false`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (response.ok) {
      const data = await response.json();
      const routes = data.routes as Record<string, unknown>[];
      if (routes?.length) {
        const legs = routes[0].legs as Record<string, unknown>[];
        if (legs?.length) {
          const steps = legs[0].steps as Record<string, unknown>[];
          return steps.map((s) => {
            const maneuver = s.maneuver as Record<string, unknown> | undefined;
            return {
              instruction: (maneuver?.instruction as string) ?? 'Continue',
              distanceMeters: (s.distance as number) ?? 0,
              durationSeconds: (s.duration as number) ?? 0,
              turnModifier: maneuver?.modifier as string | undefined,
            };
          });
        }
      }
    }
  } catch {
    // fall through
  }

  return [];
}
