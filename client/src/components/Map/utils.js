import Swal from "sweetalert2";
import axios from "../axios";
import { createJunctionBoxMarker } from "./Marker";

export const showToast = (icon, title) => {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
  });
};

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

export const buildAreaLabelsGeoJSON = (areas) => ({
  type: "FeatureCollection",
  features: areas.map((area) => ({
    type: "Feature",
    properties: { name: area.name },
    geometry: {
      type: "Point",
      coordinates: [area.coordinates.longitude, area.coordinates.latitude],
    },
  })),
});

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

/**
 * Identifies ghost routes (routes without corresponding locations)
 * @param {Object} geojson - User's geojson data
 * @param {Array} locations - Current locations array
 * @returns {Array} - Array of ghost route indices
 */
export const findGhostRoutes = (geojson, locations) => {
  if (!geojson || !geojson.features || !locations) return [];

  const ghostIndices = [];

  geojson.features.forEach((feature, index) => {
    const routeCoords = feature.coordinates;

    // Check if any location matches this route's coordinates
    const hasMatchingLocation = locations.some(
      (loc) =>
        loc.coordinates.latitude === routeCoords?.latitude &&
        loc.coordinates.longitude === routeCoords?.longitude
    );

    if (!hasMatchingLocation) {
      ghostIndices.push(index);
    }
  });

  return ghostIndices;
};

/**
 * Removes ghost routes from geojson
 * @param {Object} geojson - User's geojson data
 * @param {Array} locations - Current locations array
 * @returns {Object} - Cleaned geojson
 */
export const removeGhostRoutes = (geojson, locations) => {
  if (!geojson || !geojson.features) return geojson;

  const cleanedGeoJSON = structuredClone(geojson);

  cleanedGeoJSON.features = cleanedGeoJSON.features.filter((feature) => {
    const routeCoords = feature.coordinates;

    // Keep only routes that have matching locations
    return locations.some(
      (loc) =>
        loc.coordinates.latitude === routeCoords?.latitude &&
        loc.coordinates.longitude === routeCoords?.longitude
    );
  });

  // Reassign IDs after filtering
  cleanedGeoJSON.features = cleanedGeoJSON.features.map((feature, index) => ({
    ...feature,
    properties: {
      ...feature.properties,
      id: index,
    },
  }));

  return cleanedGeoJSON;
};

/**
 * Shows a confirmation dialog and erases ghost routes
 * @param {Object} user - Current user object
 * @param {Function} setUser - User state setter
 * @param {Array} locations - Current locations
 * @param {Object} map - Map instance
 * @param {Function} axios - Axios instance
 * @returns {Promise<boolean>} - Success status
 */
export const eraseGhostRoutes = async (
  user,
  setUser,
  locations,
  map,
  axios
) => {
  try {
    const ghostIndices = findGhostRoutes(user.geojson, locations);

    if (ghostIndices.length === 0) {
      await Swal.fire({
        title: "No Ghost Routes Found",
        text: "All routes have corresponding locations.",
        icon: "info",
        confirmButtonColor: "#3085d6",
      });
      return false;
    }

    const result = await Swal.fire({
      title: "Erase Ghost Routes?",
      html: `
        <div class="text-left">
          <p class="mb-2">Found <strong>${ghostIndices.length}</strong> ghost route(s) without destinations.</p>
          <p class="text-sm text-gray-600">This action will permanently remove these routes.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Erase Them",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      const cleanedGeoJSON = removeGhostRoutes(user.geojson, locations);

      const response = await axios.put(`/api/admin/${user.id}/geojson`, {
        geojson: cleanedGeoJSON,
      });

      if (response.status === 200) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        localStorage.setItem("auth", JSON.stringify(updatedUser));

        // Update map
        if (map && map.getSource("routes")) {
          map.getSource("routes").setData(cleanedGeoJSON);
        }

        await Swal.fire({
          title: "Success!",
          text: `Removed ${ghostIndices.length} ghost route(s)`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error erasing ghost routes:", error);
    await Swal.fire({
      title: "Error!",
      text: "Failed to erase ghost routes",
      icon: "error",
      confirmButtonColor: "#d33",
    });
    return false;
  }
};

// drawCable function
// drawCable function - WITH DYNAMIC INTERVAL CONTROL
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

    if (idx === -1) {
      console.error("Route not found for location");
      return;
    }

    // Clone the GeoJSON to avoid direct mutation
    const updatedGeoJSON = structuredClone(geojson);

    // Get coordinates in GeoJSON format [lng, lat]
    const routeCoords = [...updatedGeoJSON.features[idx].geometry.coordinates];

    const line = turf.lineString(routeCoords);
    const length = turf.length(line, { units: "meters" });
    console.log("Route length:", length, "meters");

    let currentInterval = 1; // Default interval
    let markers = [];
    let controlPointIndices = [];

    // Create control popup
    const controlPopup = document.createElement("div");
    controlPopup.className =
      "fixed top-20 right-6 bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-4 z-[9999]";
    controlPopup.innerHTML = `
      <div class="flex flex-col space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200">
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
            </svg>
            <h3 class="font-bold text-gray-800">Control Points</h3>
          </div>
        </div>
        
        <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <span class="text-sm text-gray-600 font-medium">Interval:</span>
          <div class="flex items-center space-x-2">
            <button id="decrease-interval" class="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-all hover:scale-110 shadow-md">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12H4"/>
              </svg>
            </button>
            <span id="interval-value" class="text-lg font-bold text-blue-600 min-w-[3rem] text-center">${currentInterval}</span>
            <button id="increase-interval" class="w-8 h-8 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full transition-all hover:scale-110 shadow-md">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div class="flex items-start space-x-2">
            <svg class="w-4 h-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
            <div class="flex-1">
              <p class="text-xs text-blue-800 leading-relaxed">
                <strong>Lower values</strong> = More control points<br/>
                <strong>Higher values</strong> = Fewer control points
              </p>
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-gray-200">
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>Total Points:</span>
            <span id="total-markers" class="font-semibold text-gray-700">0</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(controlPopup);

    // Function to create markers with current interval
    const createMarkers = (interval) => {
      // Remove existing markers
      markers.forEach((m) => m.remove());
      markers = [];
      controlPointIndices = [];

      // Create control point markers at intervals
      routeCoords.forEach((coord, index) => {
        // Always include first and last point
        if (
          index === 0 ||
          index === routeCoords.length - 1 ||
          index % interval === 0
        ) {
          controlPointIndices.push(index);

          const markerEl = document.createElement("div");
          markerEl.className =
            "w-5 h-5 rounded-full bg-red-400 border-2 border-white cursor-grab z-50 hover:scale-125 transition-transform shadow-lg";

          const marker = olaMaps
            .addMarker({ element: markerEl, anchor: "center", draggable: true })
            .setLngLat([coord[0], coord[1]]) // GeoJSON format: [lng, lat]
            .addTo(map);

          marker.on("dragstart", () => {
            markerEl.style.transform = "scale(1.3)";
            markerEl.classList.remove("bg-red-400");
            markerEl.classList.add("bg-blue-500");
          });

          marker.on("drag", (event) => {
            const { lat, lng } = event.target._lngLat;
            const currentControlIndex = controlPointIndices.indexOf(index);

            if (currentControlIndex === -1) return;

            // Update the dragged control point
            routeCoords[index] = [lng, lat];

            // Find previous and next control points
            const prevControlIndex =
              currentControlIndex > 0
                ? controlPointIndices[currentControlIndex - 1]
                : null;
            const nextControlIndex =
              currentControlIndex < controlPointIndices.length - 1
                ? controlPointIndices[currentControlIndex + 1]
                : null;

            // Interpolate coordinates between previous control point and current
            if (prevControlIndex !== null) {
              const prevCoord = routeCoords[prevControlIndex];
              const numSteps = index - prevControlIndex;

              for (let i = 1; i < numSteps; i++) {
                const t = i / numSteps;
                const interpolatedLng = prevCoord[0] + (lng - prevCoord[0]) * t;
                const interpolatedLat = prevCoord[1] + (lat - prevCoord[1]) * t;
                routeCoords[prevControlIndex + i] = [
                  interpolatedLng,
                  interpolatedLat,
                ];
              }
            }

            // Interpolate coordinates between current and next control point
            if (nextControlIndex !== null) {
              const nextCoord = routeCoords[nextControlIndex];
              const numSteps = nextControlIndex - index;

              for (let i = 1; i < numSteps; i++) {
                const t = i / numSteps;
                const interpolatedLng = lng + (nextCoord[0] - lng) * t;
                const interpolatedLat = lat + (nextCoord[1] - lat) * t;
                routeCoords[index + i] = [interpolatedLng, interpolatedLat];
              }
            }

            // Update the GeoJSON feature
            updatedGeoJSON.features[idx].geometry.coordinates = [
              ...routeCoords,
            ];

            // Redraw the route
            if (map.getSource("routes")) {
              map.getSource("routes").setData(updatedGeoJSON);
            }
          });

          marker.on("dragend", () => {
            markerEl.style.transform = "scale(1)";
            markerEl.classList.remove("bg-blue-500");
            markerEl.classList.add("bg-red-400");
          });

          markers.push(marker);
        }
      });

      // Update marker count display
      document.getElementById("total-markers").textContent = markers.length;
    };

    // Initial marker creation
    createMarkers(currentInterval);

    // Button event listeners
    document
      .getElementById("increase-interval")
      .addEventListener("click", () => {
        if (currentInterval < 100) {
          currentInterval += 1;
          document.getElementById("interval-value").textContent =
            currentInterval;
          createMarkers(currentInterval);
        }
      });

    document
      .getElementById("decrease-interval")
      .addEventListener("click", () => {
        if (currentInterval > 1) {
          currentInterval -= 1;
          document.getElementById("interval-value").textContent =
            currentInterval;
          createMarkers(currentInterval);
        }
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
          // Remove all draggable markers
          markers.forEach((m) => m.remove());

          // Remove control popup
          if (controlPopup && controlPopup.parentNode) {
            controlPopup.parentNode.removeChild(controlPopup);
          }

          // Restore original GeoJSON data (no edits)
          if (map.getSource("routes")) {
            map.getSource("routes").setData(geojson);
          }

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
        try {
          const geojsonResponse = await axios.put(
            `/api/admin/${user.id}/geojson`,
            {
              geojson: updatedGeoJSON,
            }
          );

          if (geojsonResponse.status === 200) {
            // Remove markers
            markers.forEach((m) => m.remove());

            // Remove control popup
            if (controlPopup && controlPopup.parentNode) {
              controlPopup.parentNode.removeChild(controlPopup);
            }

            const updateUser = geojsonResponse.data.user;
            setUser(updateUser);
            localStorage.setItem("auth", JSON.stringify(updateUser));

            // Update the map source
            if (map.getSource("routes")) {
              map.getSource("routes").setData(updatedGeoJSON);
            }

            Swal.fire({
              title: "Success!",
              text: "Cable route saved successfully",
              icon: "success",
              timer: 1500,
              showConfirmButton: false,
            });
          }
        } catch (error) {
          console.error("Error saving cable route:", error);
          Swal.fire({
            title: "Error!",
            text: "Failed to save cable route",
            icon: "error",
            confirmButtonColor: "#e74c3c",
          });
        }
      });
    }
  } catch (error) {
    console.log("Error While Custom Route : ", error);
    Swal.fire({
      title: "Error!",
      text: "Failed to initialize cable editing",
      icon: "error",
      confirmButtonColor: "#e74c3c",
    });
  }
};

//utils.js
export const isMapValid = (mapInstance) => {
  try {
    return !!(
      mapInstance &&
      typeof mapInstance.getLayer === "function" &&
      typeof mapInstance.getSource === "function" &&
      typeof mapInstance.loaded === "function" &&
      mapInstance.loaded()
    );
  } catch (error) {
    return false;
  }
};

export const safeRemoveLayer = (mapInstance, layerId) => {
  if (!isMapValid(mapInstance)) return false;

  try {
    if (mapInstance.getLayer(layerId)) {
      mapInstance.removeLayer(layerId);
      return true;
    }
  } catch (error) {
    console.debug(`Layer ${layerId} removal skipped:`, error.message);
  }
  return false;
};

export const safeRemoveSource = (mapInstance, sourceId) => {
  if (!isMapValid(mapInstance)) return false;

  try {
    if (mapInstance.getSource(sourceId)) {
      mapInstance.removeSource(sourceId);
      return true;
    }
  } catch (error) {
    console.debug(`Source ${sourceId} removal skipped:`, error.message);
  }
  return false;
};

// Add this helper to check if source/layer exists
export const layerExists = (mapInstance, layerId) => {
  if (!isMapValid(mapInstance)) return false;
  try {
    return !!mapInstance.getLayer(layerId);
  } catch {
    return false;
  }
};

export const sourceExists = (mapInstance, sourceId) => {
  if (!isMapValid(mapInstance)) return false;
  try {
    return !!mapInstance.getSource(sourceId);
  } catch {
    return false;
  }
};

export const renderJunctionBoxMarkers = (locations, mapInstance) => {
  if (!mapInstance || !locations) return;
  let markers = [];
  locations.forEach((location) => {
    const junctions = location?.junctionBox || [];
    if (!junctions.length) return;

    junctions.forEach((box) => {
      const { latitude, longitude } = box.coordinates || {};
      if (!latitude || !longitude) return;
      markers.push(createJunctionBoxMarker(box, mapInstance, location));
    });
  });
  console.log("(renderjuncBox)Returing Markers :. .", markers);
  return markers;
};

export const addJunctionBox = (
  location,
  onCancel,
  mapInstance,
  userInstance
) => {
  const { map, olaMaps, isMapLoaded } = mapInstance;
  const { user, setUser } = userInstance;
  if (!map || !olaMaps || !isMapLoaded) {
    console.log("Returning:", map, olaMaps, isMapLoaded);
    return;
  }
  try {
    const geojson = user.geojson;
    let markers = [];
    let junctionBoxes = [];

    const idx = geojson.features.findIndex(
      (el) =>
        el.coordinates?.latitude === location.coordinates?.latitude &&
        el.coordinates?.longitude === location.coordinates?.longitude
    );

    if (idx === -1) {
      console.log(
        "Location was not FOund ...[idx] :",
        idx,
        "location.coord : ",
        location.coordinates
      );
      return console.error("No matching route found");
    }

    const routeCoords = geojson.features[idx].geometry.coordinates.map(
      ([lng, lat]) => [lat, lng]
    );

    const junctionCoords = (location.junctionBox || []).map((jb) => ({
      lat: jb.coordinates.latitude,
      lng: jb.coordinates.longitude,
    }));

    routeCoords.forEach(([lat, lng]) => {
      // ❌ Skip coordinates that match any junctionBox
      const isJunctionPoint = junctionCoords.some(
        (jb) => jb.lat === lat && jb.lng === lng
      );

      if (isJunctionPoint) {
        return;
      }

      const markerEl = document.createElement("div");
      markerEl.className =
        "w-4 h-4 rounded-full bg-yellow-500 border-2 border-black cursor-pointer shadow-md transition hover:scale-110";

      olaMaps
        .addMarker({ element: markerEl, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);

      markerEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const event = new CustomEvent("open-junction-modal", {
          detail: { lat, lng, locationId: location._id },
        });
        // markers.forEach((m) => m.remove());
        window.dispatchEvent(event);
      });
      markers.push(markerEl);
    });

    junctionBoxes = renderJunctionBoxMarkers([location], mapInstance);

    if (onCancel) {
      onCancel(async () => {
        markers.forEach((m) => m.remove());
        junctionBoxes.forEach((m) => m.remove());

        // 🔄 Restore original GeoJSON data (no edits)
        map.getSource("routes").setData(geojson);

        Swal.fire({
          title: "Changes discarded",
          text: "Your junction has been restored to its original shape.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      });
    }
  } catch (error) {
    console.log("Error while Adding the Junction Boxes : ");
  }
};

export const deleteJunctionBox = async (e) => {
  try {
    console.log("the Event delete-junction-box:", e);
    const junctionBox = e.detail.junctionBox;
    const locationId = e.detail.locationId;

    const response = await axios.delete(
      `/api/locations/delete-junction/${locationId}/${junctionBox._id}`
    );

    if (response.status === 200) {
      return response;
    }
  } catch (error) {
    console.log("Error While Deleting the JucntionBox : ", error);
  }
};

export const deleteSubHub = async (hub, adminId, onSuccess) => {
  try {
    const response = await axios.delete(`/api/hubs/${hub._id}/${adminId}`);
    if (response.status === 200) {
      showToast(
        "success",
        response?.data?.message || "Hub has been Deleted successfully!"
      );
      return response;
    } else {
      showToast(
        "error",
        response?.data?.message || "Error while Deleting the Hub"
      );
    }
  } catch (error) {
    showToast(
      "error",
      error.response?.data?.message || "Error while Deleting the Hub"
    );
    console.log("Error While Deleting the Sub Hub : ", error);
  }
};
