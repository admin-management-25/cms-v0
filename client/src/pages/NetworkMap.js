"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "../components/axios";
import AddLocationModal from "../components/AddLocationModal";
import AdvancedFilters from "../components/AdvancedFilters";
import NetworkExport from "../components/NetworkExport";
import { CENTRAL_HUB, useMap } from "../components/Map/MapProvider";
import polyline from "polyline";
import { SearchBox } from "../components/Map/AutoComplete";
import MapContainer from "../components/Map/MapContainer";
import { useMemo } from "react";
import useUserStore from "../store/adminStore";
import * as turf from "@turf/turf";
import {
  createLocationMarkerElement,
  createSubHubMarker,
} from "../components/Map/Marker";
import {
  addJunctionBox,
  buildAreaLabelsGeoJSON,
  buildRoutesGeoJSON,
  deleteJunctionBox,
  deleteSubHub,
  drawCable,
  safeRemoveLayer,
  safeRemoveSource,
  showToast,
  updateRoutes,
} from "../components/Map/utils";
import JunctionModal from "../components/JunctionModal";
import AddHubModal from "../components/AddHubModal";
import { useActionPopup } from "../components/hooks/useActionPopup";
import ActionPopup from "../components/ActionPopup";
import { drawRadiusCircles } from "../components/Map/utils2";
import AddAreaModal from "../components/AddAreaModal";
import { useLocationFilters } from "../components/hooks/useLocationFilters";
import { eraseGhostRoutes, findGhostRoutes } from "../components/Map/utils";
const NetworkMap = () => {
  const [allLocations, setAllLocations] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddHubModal, setShowAddHubModal] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [mapServiceTypeFilter, setMapServiceTypeFilter] = useState("");
  const [showRoutes, setShowRoutes] = useState(true); // 👈 Route visibility state
  const { map, olaMaps } = useMap();
  const { user, setUser } = useUserStore();
  const isMapLoaded = useRef(false);
  const cleanupScheduled = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locationId, setLocationId] = useState(null);
  const hubMarkersRef = useRef({});

  // Use the custom hook
  const {
    showActionPopup,
    popupPosition,
    clickedCoordinates,
    openPopup,
    closePopup,
  } = useActionPopup(map);
  // In your parent component:
  const [filterState, setFilterState] = useState({
    service: [],
    serviceType: [],
    areas: [],
    distanceRange: [],
    searchTerm: "",
    sortBy: [],
    sortOrder: [],
  });

  // Use the custom hook
  const filteredLocations = useLocationFilters(
    allLocations,
    filterState,
    areas
  );

  // Inside NetworkMap component, add handler for ghost route cleanup
  const handleEraseGhostRoutes = async () => {
    await eraseGhostRoutes(user, setUser, allLocations, map, axios);
  };

  useEffect(() => {
    if (!map || !olaMaps || !isMapLoaded.current) return;
    if (!areas || areas.length === 0) return;

    const LABEL_SOURCE = "areas-labels-source";
    const LABEL_LAYER = "areas-labels-layer";

    // --- Cleanup old source/layer ---
    if (map.getLayer(LABEL_LAYER)) map.removeLayer(LABEL_LAYER);
    if (map.getSource(LABEL_SOURCE)) map.removeSource(LABEL_SOURCE);

    // --- Create new combined GeoJSON ---
    const geojson = buildAreaLabelsGeoJSON(areas);

    // --- Add source ---
    map.addSource(LABEL_SOURCE, {
      type: "geojson",
      data: geojson,
    });

    // --- Add layer ---
    map.addLayer({
      id: LABEL_LAYER,
      type: "symbol",
      source: LABEL_SOURCE,
      minzoom: 14, // ← show label only after zoom 14
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Gentona_Book"],
        "text-size": 16,
        "text-anchor": "center",
        "text-justify": "center",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#065f46",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
        "text-halo-blur": 0.5,
      },
    });

    console.log("Area labels added:", areas.length);

    return () => {
      // Cleanup on unmount or before next render
      if (map.getLayer(LABEL_LAYER)) map.removeLayer(LABEL_LAYER);
      if (map.getSource(LABEL_SOURCE)) map.removeSource(LABEL_SOURCE);
    };
  }, [map, olaMaps, isMapLoaded.current, areas]);

  // Add a state to track when to update highlights
  const [highlightedAreaIds, setHighlightedAreaIds] = useState([]);

  // Update this when filter changes
  useEffect(() => {
    setHighlightedAreaIds(filterState.areas || []);
  }, [filterState.areas]);

  // Separate useEffect for rendering with immediate effect
  // Update the state-based rendering useEffect with better cleanup logic:

  useEffect(() => {
    if (!map || !olaMaps || !isMapLoaded.current) return;

    const HIGHLIGHT_SOURCE = "highlighted-areas";
    const HIGHLIGHT_LAYER = "highlighted-areas-layer";
    const HIGHLIGHT_OUTLINE = "highlighted-areas-outline";

    // Optimized removal function
    const removeHighlights = () => {
      try {
        // Remove in correct order: layers first (reverse order), then source
        if (map.getLayer(HIGHLIGHT_OUTLINE)) map.removeLayer(HIGHLIGHT_OUTLINE);
        if (map.getLayer(HIGHLIGHT_LAYER)) map.removeLayer(HIGHLIGHT_LAYER);
        if (map.getSource(HIGHLIGHT_SOURCE)) map.removeSource(HIGHLIGHT_SOURCE);
      } catch (error) {
        console.debug("Cleanup error (ignored):", error);
      }
    };

    // Early return if no areas selected
    if (!highlightedAreaIds?.length) {
      removeHighlights();
      return;
    }

    // Filter areas with valid polygons
    const selectedAreas = areas.filter(
      (area) =>
        highlightedAreaIds.includes(area._id) &&
        area.polygon?.coordinates?.length > 0
    );

    // Early return if no valid polygons
    if (!selectedAreas.length) {
      removeHighlights();
      return;
    }

    try {
      // Prepare GeoJSON data
      const geojsonData = {
        type: "FeatureCollection",
        features: selectedAreas.map((area) => ({
          type: "Feature",
          properties: { name: area.name, areaId: area._id },
          geometry: {
            type: "Polygon",
            coordinates: [area.polygon.coordinates],
          },
        })),
      };

      const existingSource = map.getSource(HIGHLIGHT_SOURCE);

      if (existingSource) {
        // Update existing source (most efficient)
        existingSource.setData(geojsonData);
      } else {
        // Clean up any partial state
        removeHighlights();

        // Create fresh layers
        map.addSource(HIGHLIGHT_SOURCE, {
          type: "geojson",
          data: geojsonData,
        });

        map.addLayer({
          id: HIGHLIGHT_LAYER,
          type: "fill",
          source: HIGHLIGHT_SOURCE,
          paint: {
            "fill-color": "#10b981",
            "fill-opacity": 0.2,
          },
        });

        map.addLayer({
          id: HIGHLIGHT_OUTLINE,
          type: "line",
          source: HIGHLIGHT_SOURCE,
          paint: {
            "line-color": "#07c98bff",
            "line-width": 2,
          },
        });
      }
    } catch (error) {
      console.error("Error highlighting areas:", error);
      removeHighlights(); // Cleanup on error
    }

    // Cleanup on unmount or before next effect
    return removeHighlights;
  }, [highlightedAreaIds, areas, map, olaMaps]);

  const locationsForMap = useMemo(() => {
    if (!mapServiceTypeFilter) return filteredLocations;
    return filteredLocations.filter(
      (loc) => loc.serviceType?._id === mapServiceTypeFilter
    );
  }, [filteredLocations, mapServiceTypeFilter]);

  const handleJunctionUpdate = (updatedLocation) => {
    setAllLocations((prev) =>
      prev.map((loc) =>
        loc._id === updatedLocation._id ? updatedLocation : loc
      )
    );

    addJunctionBox(
      updatedLocation,
      undefined,
      { map, olaMaps, isMapLoaded },
      { user, setUser }
    );
  };

  const renderConnections = useCallback(
    async (connections) => {
      if (!map || !olaMaps || !isMapLoaded.current) return;

      try {
        const mapContainer = map.getContainer();
        const existingMarkers =
          mapContainer.querySelectorAll(".location-marker");
        existingMarkers.forEach((marker) => {
          if (marker.parentNode) {
            marker.parentNode.removeChild(marker);
          }
        });

        // Always clean up route layer and source
        safeRemoveLayer(map, "routes-layer");
        safeRemoveSource(map, "routes");

        // Add markers
        for (let conn of connections) {
          const markerElement = createLocationMarkerElement(
            conn,
            drawCable,
            setHoveredLocation,
            { map, olaMaps, isMapLoaded },
            { user, setUser },
            turf,
            addJunctionBox
          );
          markerElement.classList.add("location-marker");
          olaMaps
            .addMarker({ element: markerElement, anchor: "center" })
            .setLngLat([
              Number(conn.coordinates.longitude),
              Number(conn.coordinates.latitude),
            ])
            .addTo(map);
        }

        if (user.geojson && user.geojson !== "null") {
          const geojson = user.geojson;
          if (!map.getSource("routes")) {
            map.addSource("routes", { type: "geojson", data: geojson });
          } else {
            map.getSource("routes").setData(geojson);
          }
        } else {
          if (connections.length > 0) {
            const locationString = connections
              .map(
                (conn) =>
                  `${conn.coordinates.latitude}%2C${conn.coordinates.longitude}`
              )
              .join("%7C");

            console.log("The Geojson Routing Api is calling ..");

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
              distanceFromCentralHub:
                connections[index]?.distanceFromCentralHub,
              image: connections[index]?.image,
              notes: connections[index]?.notes,
              location: connections[index]?.coordinates || "N/A",
            }));

            const geojson = buildRoutesGeoJSON(convertedElementsVal, polyline);
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

              // FIX ISSUE 3: Broadcast the update to other devices
              broadcastGeoJSONUpdate(updateUser.geojson);

              if (!map.getSource("routes")) {
                map.addSource("routes", { type: "geojson", data: geojson });
              } else {
                map.getSource("routes").setData(geojson);
              }
            }
          }
        }

        // Only add layer if routes should be visible
        if (showRoutes) {
          if (!map.getLayer("routes-layer")) {
            map.addLayer({
              id: "routes-layer",
              type: "line",
              source: "routes",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-width": 4,
                "line-color": ["get", "color"],
              },
            });
          }
        }

        const maxDistance =
          connections.length > 0
            ? Math.max(
                ...connections.map((conn) => conn.distanceFromCentralHub || 0)
              )
            : 1000;

        const circleMaxDistance = Math.max(
          500,
          Math.ceil(maxDistance / 100) * 100 + 100
        );
        drawRadiusCircles(circleMaxDistance, 100, {
          map,
          olaMaps,
          isMapLoaded,
        });
      } catch (error) {
        console.log("Error in renderConnections:", error);
      }
    },
    [
      map,
      olaMaps,
      createLocationMarkerElement,
      createSubHubMarker,
      drawRadiusCircles,
      buildRoutesGeoJSON,
      safeRemoveLayer,
      safeRemoveSource,
      showRoutes,
    ]
  );
  // 👇 Toggle function to show/hide routes
  const toggleRoutes = useCallback(() => {
    if (!map || !isMapLoaded.current) return;

    if (showRoutes) {
      // Hide routes by removing the layer
      safeRemoveLayer(map, "routes-layer");
    } else {
      // Show routes by re-adding the layer
      if (map.getSource("routes") && !map.getLayer("routes-layer")) {
        map.addLayer({
          id: "routes-layer",
          type: "line",
          source: "routes",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-width": 4,
            "line-color": ["get", "color"], // This ensures colors are preserved
          },
        });
      }
    }
    setShowRoutes(!showRoutes);
  }, [map, showRoutes, safeRemoveLayer]);

  useEffect(() => {
    if (!map || !olaMaps) return;

    const handleMapLoad = () => {
      isMapLoaded.current = true;

      const handleClick = (e) => {
        const { lng, lat } = e.lngLat;
        // Get the container's position to calculate correct screen coordinates
        const canvas = map.getCanvas();
        const rect = canvas.getBoundingClientRect();

        // Calculate screen position relative to viewport
        const screenPosition = {
          x: e.point.x + rect.left,
          y: e.point.y + rect.top,
        };

        // Open the action popup
        openPopup({ longitude: lng, latitude: lat }, screenPosition);
      };

      map.on("click", handleClick);

      map.flyTo({
        center: [parseFloat(CENTRAL_HUB.lng), parseFloat(CENTRAL_HUB.lat)],
        zoom: 14,
        duration: 1000,
      });

      fetchData();

      return () => {
        cleanupScheduled.current = true;
        map.off("click", handleClick);
        safeRemoveLayer(map, "radius-circles-layer");
        safeRemoveLayer(map, "radius-circles-labels");
        safeRemoveLayer(map, "routes-layer");
        safeRemoveSource(map, "radius-circles");
        safeRemoveSource(map, "routes");
      };
    };

    if (map.isStyleLoaded()) {
      const cleanup = handleMapLoad();
      return cleanup;
    } else {
      const handleStyleLoad = () => {
        map.off("styledata", handleStyleLoad);
        const cleanup = handleMapLoad();
        return () => {
          if (cleanup) cleanup();
        };
      };

      map.on("styledata", handleStyleLoad);

      return () => {
        map.off("styledata", handleStyleLoad);
        cleanupScheduled.current = true;
      };
    }
  }, [map, olaMaps, safeRemoveLayer, safeRemoveSource]);

  // FIX ISSUE 3: Add BroadcastChannel for cross-device sync
  useEffect(() => {
    const channel = new BroadcastChannel("geojson-updates");

    const handleMessage = (event) => {
      if (event.data.type === "GEOJSON_UPDATE") {
        const updatedGeoJSON = event.data.geojson;

        // Update local state
        setUser((prevUser) => ({
          ...prevUser,
          geojson: updatedGeoJSON,
        }));

        // Update map source
        if (map && map.getSource("routes")) {
          map.getSource("routes").setData(updatedGeoJSON);
        }
      }
    };
    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [map, setUser]);

  const broadcastGeoJSONUpdate = (geojson) => {
    const channel = new BroadcastChannel("geojson-updates");
    channel.postMessage({
      type: "GEOJSON_UPDATE",
      geojson: geojson,
      timestamp: Date.now(),
    });
    channel.close();
  };

  useEffect(() => {
    if (
      map &&
      olaMaps &&
      isMapLoaded.current &&
      hubs.length > 0 &&
      locationsForMap.length >= 0
    ) {
      renderConnections(locationsForMap);
    }
  }, [locationsForMap, hubs, map, olaMaps, renderConnections]);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  const fetchData = async () => {
    try {
      const [locationsRes, servicesRes, serviceTypesRes, hubsRes, areasRes] =
        await Promise.all([
          axios.get("/api/locations"),
          axios.get("/api/services"),
          axios.get("/api/service-types"),
          axios.get("/api/hubs"),
          axios.get("/api/area-names"),
        ]);

      const fixedLocations = locationsRes.data.map((loc) => {
        if (loc.image && loc.image.startsWith("/uploads")) {
          return {
            ...loc,
            image: `${API_BASE_URL}${loc.image}`,
          };
        }
        return loc;
      });

      setAllLocations(fixedLocations);
      setServices(servicesRes.data);
      setServiceTypes(serviceTypesRes.data);
      setHubs(hubsRes.data);
      setAreas(areasRes.data);

      setTimeout(() => {
        if (map && olaMaps && isMapLoaded.current) {
          renderConnections(fixedLocations);
        }
      }, 100);
    } catch (error) {
      console.log("Error fetching data:", error);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!map || !user?.geojson) return;

    try {
      const updatedGeoJSON = structuredClone(user.geojson);

      updatedGeoJSON.features = updatedGeoJSON.features.filter((feature) => {
        const latitude = feature.coordinates?.latitude;
        const longitude = feature.coordinates?.longitude;
        return filteredLocations.some(
          (conn) =>
            conn.coordinates.latitude === latitude &&
            conn.coordinates.longitude === longitude
        );
      });

      // Update map source
      if (map.getSource("routes")) {
        map.getSource("routes").setData(updatedGeoJSON);
      } else {
        map.addSource("routes", {
          type: "geojson",
          data: updatedGeoJSON,
        });

        map.addLayer({
          id: "routes",
          type: "line",
          source: "routes",
          paint: {
            "line-color": "#007bff",
            "line-width": 3,
          },
        });
      }
    } catch (error) {
      console.error("Error updating map:", error);
    }
  }, [filteredLocations, map, user?.geojson]);

  // Update handleLocationCreated to broadcast
  const handleLocationCreated = async (newLocation, startingCoordinates) => {
    try {
      if (newLocation.image && newLocation.image.startsWith("/uploads")) {
        newLocation.image = `${API_BASE_URL}${newLocation.image}`;
      }
      let startingPoint;
      if (startingCoordinates) {
        startingPoint = {
          lat: startingCoordinates.latitude,
          lng: startingCoordinates.longitude,
        };
      } else {
        startingPoint = CENTRAL_HUB;
      }
      const response = await fetch(
        `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${startingPoint.lat}%2C${startingPoint.lng}&destinations=${newLocation?.coordinates.latitude}%2C${newLocation?.coordinates.longitude}&api_key=dxEuToWnHB5W4e4lcqiFwu2RwKA64Ixi0BFR73kQ`,
        {
          method: "GET",
          headers: { "X-Request-Id": "XXX" },
        }
      );
      const data = await response.json();
      const elements = data.rows[0].elements;
      const decoded = polyline
        .decode(elements[0].polyline)
        .map(([lat, lng]) => [lng, lat]);
      const addRoute = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: decoded,
        },
        properties: {
          color: newLocation.serviceType?.colorForMarking || "#3498db",
          id: user.geojson ? user.geojson.features.length : 0,
        },
        coordinates: newLocation.coordinates,
      };

      const updatedGeoJSON = { ...user.geojson };
      updatedGeoJSON.features.push(addRoute);

      const geojsonResponse = await axios.put(`/api/admin/${user.id}/geojson`, {
        geojson: updatedGeoJSON,
      });
      if (geojsonResponse.status === 200) {
        alert("Connection created successfully ✅:");
        const updateUser = geojsonResponse.data.user;
        setUser(updateUser);
        localStorage.setItem("auth", JSON.stringify(updateUser));

        // FIX ISSUE 3: Broadcast the update
        broadcastGeoJSONUpdate(updateUser.geojson);

        const markerElement = createLocationMarkerElement(
          newLocation,
          drawCable,
          setHoveredLocation,
          { map, olaMaps, isMapLoaded },
          { user, setUser },
          turf,
          addJunctionBox
        );
        markerElement.classList.add("location-marker");
        olaMaps
          .addMarker({ element: markerElement, anchor: "center" })
          .setLngLat([
            Number(newLocation.coordinates.longitude),
            Number(newLocation.coordinates.latitude),
          ])
          .addTo(map);

        setAllLocations((prev) => [...prev, newLocation]);
        setSuccess("Location added successfully!");
        setTimeout(() => {
          if (map && olaMaps && isMapLoaded.current) {
            updateRoutes(updateUser.geojson, map);
          }
        }, 100);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (error) {
      console.log("Error While Creating a Location : ", error);
    }
  };

  useEffect(() => {
    return () => {
      cleanupScheduled.current = true;
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      setLocationId(e.detail.locationId);
      setCoords(e.detail);
      setModalOpen(true);
    };

    window.addEventListener("open-junction-modal", handler);

    return () => window.removeEventListener("open-junction-modal", handler);
  }, []);

  useEffect(() => {
    const handleJunctionDelete = async (e) => {
      const junctionBox = e.detail.junctionBox;
      const response = await deleteJunctionBox(e);
      const { data } = response;
      setAllLocations((prev) =>
        prev.map((loc) => (loc._id === data.data._id ? data.data : loc))
      );
      document.dispatchEvent(
        new CustomEvent("junction-deleted", {
          detail: { location: data.data, junctionBoxId: junctionBox._id },
        })
      );
      showToast(
        "success",
        data.message || "The junction box has been removed."
      );
    };

    window.addEventListener("delete-junction-box", handleJunctionDelete);
    return () =>
      window.removeEventListener("delete-junction-box", handleJunctionDelete);
  }, []);

  useEffect(() => {
    const handleSubHubDelete = async (e) => {
      const deleteHub = e.detail.hub;
      const response = await deleteSubHub(deleteHub, user?.id);
      const { data } = response;
      const { deletedHub } = data;
      handleHubDeleted(deletedHub);
    };
    window.addEventListener("delete-subhub", handleSubHubDelete);
    return () =>
      window.removeEventListener("delete-subhub", handleSubHubDelete);
  }, [user?.id, hubs]); // <-- key fix

  const handleHubAdded = (newHub) => {
    setHubs((prevHubs) => [...prevHubs, newHub]);

    const hubMarker = createSubHubMarker(newHub, {
      map,
      olaMaps,
      isMapLoaded,
    });
    hubMarkersRef.current[newHub._id] = hubMarker;
  };

  const addHubMarkers = () => {
    if (!hubs.length || Object.keys(hubMarkersRef.current).length > 0) return;

    for (let hub of hubs) {
      const hubMarker = createSubHubMarker(hub, {
        map,
        olaMaps,
        isMapLoaded,
      });
      hubMarkersRef.current[hub._id] = hubMarker;
    }
  };

  useEffect(() => {
    if (!map || !olaMaps || !isMapLoaded) return;

    addHubMarkers();
  }, [hubs, map, olaMaps, isMapLoaded]);

  const handleHubDeleted = (deletedHub) => {
    // Remove from map
    const marker = hubMarkersRef.current[deletedHub._id];
    if (marker) {
      console.log("Marker found, removing:", marker);
      marker.remove();
      delete hubMarkersRef.current[deletedHub._id];
    }
    setHubs((prevHubs) => prevHubs.filter((hub) => hub._id !== deletedHub._id));
  };

  // Handle modal actions
  const handleAddLocation = () => {
    closePopup();
    setShowAddModal(true);
  };

  const handleAddHub = () => {
    closePopup();
    setShowAddHubModal(true);
  };

  const handleAddArea = async () => {
    try {
      closePopup();
      setIsAreaModalOpen(true);
    } catch (error) {
      console.log("the reverseGo error : ", error);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
  };

  return (
    <div>
      <div className="relative">
        <MapContainer className="w-full h-[600px]" />
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={toggleRoutes}
            className={`px-4 py-2 rounded-md text-white font-medium shadow-md transition-colors ${
              showRoutes
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {showRoutes ? "Hide Routes" : "Show Routes"}
          </button>

          {/* FIX ISSUE 1: Add Erase Ghost Routes button */}
          <button
            onClick={handleEraseGhostRoutes}
            className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-md transition-colors flex items-center gap-2"
            title="Remove routes without destinations"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Erase Ghost Routes
          </button>
        </div>

        {/* Left Filters */}
        <div className="absolute top-4 left-0 w-[250px] px-4">
          <AdvancedFilters
            onFiltersChange={setFilterState}
            services={services}
            serviceTypes={serviceTypes}
            locations={filteredLocations}
            areas={areas}
          />
        </div>

        {/* Center Search */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <SearchBox />
        </div>
      </div>

      {/* Action Popup */}
      <ActionPopup
        isOpen={showActionPopup}
        position={popupPosition}
        onClose={closePopup}
        onAddLocation={handleAddLocation}
        onAddHub={handleAddHub}
        onAddArea={handleAddArea}
      />

      {/* Add Location modal */}
      <AddLocationModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        coordinates={clickedCoordinates}
        onLocationCreated={handleLocationCreated}
      />

      {/* Hub Modal */}
      <AddHubModal
        isOpen={showAddHubModal}
        onClose={() => setShowAddHubModal(false)}
        coordinates={clickedCoordinates}
        onHubCreated={handleHubAdded}
      />

      <AddAreaModal
        isOpen={isAreaModalOpen}
        onClose={() => setIsAreaModalOpen(false)}
        coordinates={clickedCoordinates}
        onAreaCreated={(newArea) => {
          // Handle the created area
          console.log("New Area ;; ", newArea);
          // setAreas((prev) => [...prev, newArea]);
        }}
        map={map}
      />

      <JunctionModal
        isOpen={modalOpen}
        coords={coords}
        locationId={locationId}
        onClose={() => setModalOpen(false)}
        onSuccess={handleJunctionUpdate}
      />

      <NetworkExport
        locations={filteredLocations}
        services={services}
        serviceTypes={serviceTypes}
      />

      <AddLocationModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        coordinates={clickedCoordinates}
        onLocationCreated={handleLocationCreated}
        allLocations={allLocations}
        hubs={hubs}
      />
    </div>
  );
};

export default NetworkMap;
