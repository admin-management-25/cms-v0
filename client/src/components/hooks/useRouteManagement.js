import { useCallback } from "react";
import axios from "../axios";
import { CENTRAL_HUB } from "../Map/MapProvider";
import {
  buildRoutesGeoJSON,
  safeRemoveLayer,
  safeRemoveSource,
} from "../Map/utils";
import polyline from "polyline";

// 1. Separate route management hook/functions
export const useRouteManagement = (
  map,
  olaMaps,
  isMapLoaded,
  showRoutes,
  user,
  setUser
) => {
  // Add or update routes source
  const updateRoutesSource = useCallback(
    (geojsonData) => {
      if (!map || !isMapLoaded.current) return;

      try {
        if (!map.getSource("routes")) {
          map.addSource("routes", { type: "geojson", data: geojsonData });
        } else {
          map.getSource("routes").setData(geojsonData);
        }
      } catch (error) {
        console.error("Error updating routes source:", error);
      }
    },
    [map, isMapLoaded]
  );

  // Add routes layer with proper styling
  const addRoutesLayer = useCallback(() => {
    if (!map || !isMapLoaded.current) return;

    try {
      if (!map.getLayer("routes-layer") && map.getSource("routes")) {
        map.addLayer({
          id: "routes-layer",
          type: "line",
          source: "routes",
          layout: {
            "line-join": "round",
            "line-cap": "round",
            visibility: showRoutes ? "visible" : "none",
          },
          paint: {
            "line-width": 4,
            "line-color": ["get", "color"], // Get color from feature properties
          },
        });
      }
    } catch (error) {
      console.error("Error adding routes layer:", error);
    }
  }, [map, isMapLoaded, showRoutes]);

  // Remove routes layer and source
  const removeRoutesLayer = useCallback(() => {
    if (!map || !isMapLoaded.current) return;

    try {
      safeRemoveLayer(map, "routes-layer");
      safeRemoveSource(map, "routes");
    } catch (error) {
      console.error("Error removing routes:", error);
    }
  }, [map, isMapLoaded]);

  // Fetch routes from API
  const fetchRoutesFromAPI = useCallback(
    async (connections) => {
      if (!connections || connections.length === 0) return null;

      try {
        const locationString = connections
          .map(
            (conn) =>
              `${conn.coordinates.latitude}%2C${conn.coordinates.longitude}`
          )
          .join("%7C");

        console.log("Fetching routes from API...");

        const response = await fetch(
          `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${CENTRAL_HUB.lat}%2C${CENTRAL_HUB.lng}&destinations=${locationString}&api_key=dxEuToWnHB5W4e4lcqiFwu2RwKA64Ixi0BFR73kQ`,
          {
            method: "GET",
            headers: { "X-Request-Id": "XXX" },
          }
        );

        const data = await response.json();
        const elements = data.rows[0].elements;

        const convertedElementsVal = elements.map((el, index) => ({
          distance: el.distance,
          duration: `${Math.floor(el.duration / 3600)} hrs ${Math.floor(
            (el.duration % 3600) / 60
          )} min`,
          polyline: el.polyline,
          service: connections[index]?.serviceName,
          serviceType: connections[index]?.serviceType,
          createdAt: connections[index]?.createdAt,
          distanceFromCentralHub: connections[index]?.distanceFromCentralHub,
          image: connections[index]?.image,
          notes: connections[index]?.notes,
          location: connections[index]?.coordinates || "N/A",
        }));

        const geojson = buildRoutesGeoJSON(convertedElementsVal, polyline);

        // Save to backend
        const geojsonResponse = await axios.put(
          `/api/admin/${user.id}/geojson`,
          {
            geojson,
          }
        );

        if (geojsonResponse.status === 200) {
          const updateUser = geojsonResponse.data.user;
          setUser(updateUser);
          localStorage.setItem("auth", JSON.stringify(updateUser));
          return geojson;
        }

        return null;
      } catch (error) {
        console.error("Error fetching routes from API:", error);
        return null;
      }
    },
    [user, setUser]
  );

  // Main function to handle all route operations
  const handleRoutes = useCallback(
    async (connections) => {
      if (!map || !isMapLoaded.current) return;

      try {
        // Step 1: Clean up existing routes
        removeRoutesLayer();

        let geojsonData = null;

        // Step 2: Get GeoJSON data (from user or API)
        if (user.geojson && user.geojson !== "null") {
          geojsonData = user.geojson;
        } else if (connections.length > 0) {
          geojsonData = await fetchRoutesFromAPI(connections);
        }

        // Step 3: Update source and add layer if we have data
        if (geojsonData) {
          updateRoutesSource(geojsonData);

          // Only add layer if showRoutes is true
          if (showRoutes) {
            addRoutesLayer();
          }
        }

        return geojsonData;
      } catch (error) {
        console.error("Error handling routes:", error);
        return null;
      }
    },
    [
      map,
      isMapLoaded,
      user,
      showRoutes,
      removeRoutesLayer,
      updateRoutesSource,
      addRoutesLayer,
      fetchRoutesFromAPI,
    ]
  );

  return {
    handleRoutes,
    updateRoutesSource,
    addRoutesLayer,
    removeRoutesLayer,
    fetchRoutesFromAPI,
  };
};
