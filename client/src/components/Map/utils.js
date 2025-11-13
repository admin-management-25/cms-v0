import Swal from "sweetalert2";
import axios from "../axios";

export const buildRoutesGeoJSON = (elements, polyline) => {
  return {
    type: "FeatureCollection",
    features: elements.map((conn, index) => {
      const decoded = polyline
        .decode(conn.polyline)
        .map(([lat, lng]) => [lng, lat]);

      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: decoded,
        },
        properties: {
          color: conn.serviceType?.colorForMarking || "#3498db",
          id: index,
        },
        coordinates: conn.location,
      };
    }),
  };
};

// Function to update route data
export const updateRoutes = (updatedGeojson, map) => {
  if (map && map.getSource("routes")) {
    map.getSource("routes").setData(updatedGeojson);
  } else {
    // if source doesn't exist yet, create it
    map.addSource("routes", {
      type: "geojson",
      data: updatedGeojson,
    });
    map.addLayer({
      id: "routes",
      type: "line",
      source: "routes",
      paint: {
        "line-color": "#6BCF7F",
        "line-width": 3,
      },
    });
  }
};

// drawCable function
export const drawCable = (
  location,
  onCancel,
  onSave,
  mapInstance,
  userInstance,
  turf
) => {
  const { map, olaMaps, isMapLoaded } = mapInstance;
  const { user, setUser } = userInstance;
  if (!map || !olaMaps || !isMapLoaded) {
    console.log("Returning:", map, olaMaps, isMapLoaded);
    return;
  }
  try {
    const geojson = user.geojson;
    console.log("MakeCable coordinate : ", location);

    const idx = geojson.features.findIndex(
      (el) =>
        el.coordinates?.latitude === location.coordinates?.latitude &&
        el.coordinates?.longitude === location.coordinates?.longitude
    );

    const routeCoords = geojson.features[idx].geometry.coordinates.map(
      ([lng, lat]) => [lat, lng]
    );

    const line = turf.lineString(geojson.features[idx].geometry.coordinates);
    const length = turf.length(line, { units: "meters" });
    console.log("Route length:", length, "ms");

    const interval = 1;
    const markers = [];
    const updatedGeoJSON = structuredClone(geojson);

    routeCoords.forEach((coord, index) => {
      if (index % interval !== 0) return;

      const markerEl = document.createElement("div");
      markerEl.className =
        "w-5 h-5 rounded-full bg-red-400 border-2 border-white cursor-grab z-50";

      const marker = olaMaps
        .addMarker({ element: markerEl, anchor: "center", draggable: true })
        .setLngLat([Number(coord[1]), Number(coord[0])])
        .addTo(map);

      marker.on("drag", (event) => {
        const { lat, lng } = event.target._lngLat;
        routeCoords[index] = [lat, lng];

        // // Update only this feature's coordinates
        updatedGeoJSON.features[idx].geometry.coordinates = routeCoords.map(
          ([lat, lng]) => [lng, lat]
        );
        map.getSource("routes").setData(updatedGeoJSON); // redraw
      });

      markers.push(marker);
    });

    if (onCancel) {
      onCancel(async () => {
        const result = await Swal.fire({
          title: "Discard changes?",
          text: "Your unsaved cable edits will be lost.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, discard",
          cancelButtonText: "No, keep editing",
          confirmButtonColor: "#e74c3c",
          cancelButtonColor: "#2ecc71",
        });

        if (result.isConfirmed) {
          // 🗑️ Remove all draggable markers
          markers.forEach((m) => m.remove());

          // 🔄 Restore original GeoJSON data (no edits)
          map.getSource("routes").setData(geojson);

          Swal.fire({
            title: "Changes discarded",
            text: "Your route has been restored to its original shape.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });

          console.log("Cable drawing cancelled and reverted");
        }
      });
    }

    if (onSave) {
      onSave(async () => {
        const geojsonResponse = await axios.put(
          `/api/admin/${user.id}/geojson`,
          {
            geojson: updatedGeoJSON,
          }
        );
        if (geojsonResponse.status === 200) {
          alert("Cable saved successfully ✅:", geojson);
          markers.forEach((m) => m.remove());
          const updateUser = geojsonResponse.data.user;
          setUser(updateUser);
          localStorage.setItem("auth", JSON.stringify(updateUser));
          // Add or update source
          if (!map.getSource("routes")) {
            map.addSource("routes", {
              type: "geojson",
              data: updatedGeoJSON,
            });
          } else {
            map.getSource("routes").setData(updatedGeoJSON);
          }
        }
      });
    }
  } catch (error) {
    console.log("Error While Custom Route : ", error);
  }
};

export const safeRemoveLayer = (mapInstance, layerId) => {
  if (mapInstance && mapInstance.getLayer && mapInstance.getLayer(layerId)) {
    mapInstance.removeLayer(layerId);
  }
};

export const safeRemoveSource = (mapInstance, sourceId) => {
  if (mapInstance && mapInstance.getSource && mapInstance.getSource(sourceId)) {
    mapInstance.removeSource(sourceId);
  }
};
