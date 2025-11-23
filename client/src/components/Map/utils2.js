import { CENTRAL_HUB } from "./MapProvider";
import {
  safeRemoveLayer,
  safeRemoveSource,
  isMapValid,
  sourceExists,
  layerExists,
} from "./utils";

export const calculateDestinationPoint = (lat, lng, distance, bearing) => {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const bearingRad = (bearing * Math.PI) / 180;
  const EARTH_RADIUS = 6378137;

  const angularDistance = distance / EARTH_RADIUS;

  const lat2 = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lng2 =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
};

export const createCircleCoordinates = (centerLat, centerLng, radius) => {
  const points = [];
  const numPoints = 64;

  for (let i = 0; i <= numPoints; i++) {
    const bearing = (i * 360) / numPoints;
    const point = calculateDestinationPoint(
      centerLat,
      centerLng,
      radius,
      bearing
    );
    points.push([point.lng, point.lat]);
  }

  return points;
};

//utils2.js
export const drawRadiusCircles = (
  maxDistance = 1000,
  interval = 100,
  mapInstance
) => {
  const { map, isMapLoaded } = mapInstance;
  if (!map || !isMapLoaded?.current) return;
  console.log("drawRadiusCircle is callin");

  if (!isMapValid(map) || !isMapLoaded?.current) {
    console.debug("Map not ready for drawing radius circles");
    return false;
  }

  try {
    // Clean up existing layers/sources in correct order
    safeRemoveLayer(map, "radius-circles-labels");
    safeRemoveLayer(map, "radius-circles-layer");
    safeRemoveSource(map, "radius-circles");

    // Double-check source doesn't exist before adding
    if (sourceExists(map, "radius-circles")) {
      console.warn("radius-circles source still exists, forcing removal");
      try {
        map.removeSource("radius-circles");
      } catch (e) {
        console.error("Could not force remove source:", e);
        return false;
      }
    }

    const numCircles = Math.ceil(maxDistance / interval);
    const circleFeatures = [];

    for (let i = 1; i <= numCircles; i++) {
      const radius = i * interval;
      const coordinates = createCircleCoordinates(
        parseFloat(CENTRAL_HUB.lat),
        parseFloat(CENTRAL_HUB.lng),
        radius
      );

      circleFeatures.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
        properties: {
          radius: radius,
          opacity: Math.max(0.2, 1 - i * 0.1),
          color: `rgba(52, 152, 219, ${Math.max(0.2, 1 - i * 0.1)})`,
        },
      });

      if (radius % 200 === 0 || radius === interval) {
        const destPoint = calculateDestinationPoint(
          parseFloat(CENTRAL_HUB.lat),
          parseFloat(CENTRAL_HUB.lng),
          radius,
          0
        );

        circleFeatures.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [destPoint.lng, destPoint.lat],
          },
          properties: {
            radius: radius,
            type: "label",
            label: `${radius}m`,
            color: `rgba(52, 152, 219, ${Math.max(0.4, 1 - i * 0.1)})`,
          },
        });
      }
    }

    // Add source
    map.addSource("radius-circles", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: circleFeatures,
      },
    });

    // Add circle lines layer
    map.addLayer({
      id: "radius-circles-layer",
      type: "line",
      source: "radius-circles",
      filter: ["!=", "type", "label"],
      paint: {
        "line-color": ["get", "color"],
        "line-width": 2,
        "line-dasharray": [2, 2],
      },
    });

    // Add labels layer
    map.addLayer({
      id: "radius-circles-labels",
      type: "symbol",
      source: "radius-circles",
      filter: ["==", "type", "label"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 12,
        "text-anchor": "left",
        "text-offset": [0.5, 0],
      },
      paint: {
        "text-color": ["get", "color"],
        "text-halo-color": "white",
        "text-halo-width": 1,
      },
    });

    return true;
  } catch (error) {
    console.error("Error drawing radius circles:", error);
    return false;
  }
};

// Cleanup function
export const cleanupRadiusCircles = (mapInstance) => {
  const { map } = mapInstance;
  if (!isMapValid(map)) return;

  safeRemoveLayer(map, "radius-circles-labels");
  safeRemoveLayer(map, "radius-circles-layer");
  safeRemoveSource(map, "radius-circles");
};
