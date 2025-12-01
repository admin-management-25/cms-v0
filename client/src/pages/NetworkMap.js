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
  deleteJunctionBox,
  deleteSubHub,
  drawCable,
  safeRemoveLayer,
  safeRemoveSource,
  showToast,
} from "../components/Map/utils";
import JunctionModal from "../components/JunctionModal";
import AddHubModal from "../components/AddHubModal";
import { useActionPopup } from "../components/hooks/useActionPopup";
import ActionPopup from "../components/ActionPopup";
import { drawRadiusCircles } from "../components/Map/utils2";
import AddAreaModal from "../components/AddAreaModal";
import { useLocationFilters } from "../components/hooks/useLocationFilters";
import { useRouteManagement } from "../components/hooks/useRouteManagement";

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

  // Initialize route management
  const {
    handleRoutes,
    updateRoutesSource,
    addRoutesLayer,
    removeRoutesLayer,
  } = useRouteManagement(map, olaMaps, isMapLoaded, showRoutes, user, setUser);

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

    return () => {
      // Cleanup on unmount or before next render
      if (map.getLayer(LABEL_LAYER)) map.removeLayer(LABEL_LAYER);
      if (map.getSource(LABEL_SOURCE)) map.removeSource(LABEL_SOURCE);
    };
  }, [map, olaMaps, isMapLoaded.current, areas]);

  const removeRouteLayer = useCallback(() => {
    if (!map || !olaMaps || !isMapLoaded.current || !user.geojson) return;
    if (map.getLayer("routes-layer")) map.removeLayer("routes-laye");
    if (map.getSource("routes")) map.removeSource("routes");
  }, [map, isMapLoaded.current, user]);

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

        // Handle routes separately
        await handleRoutes(connections);

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
    [map, olaMaps, handleRoutes, createLocationMarkerElement, drawRadiusCircles]
  );

  // Toggle function - FIXED VERSION
  const toggleRoutes = useCallback(() => {
    if (!map || !isMapLoaded.current) return;

    if (map.getLayer("routes-layer")) {
      const newVisibility = showRoutes ? "none" : "visible";
      map.setLayoutProperty("routes-layer", "visibility", newVisibility);
      setShowRoutes(!showRoutes);
      console.log("Routes toggled to:", newVisibility);
    } else if (!showRoutes && map.getSource("routes")) {
      // If layer doesn't exist but source does, add it
      addRoutesLayer();
      setShowRoutes(true);
    }
  }, [map, showRoutes, isMapLoaded, addRoutesLayer]);

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

  useEffect(() => {
    if (!map || !olaMaps || !isMapLoaded.current) return;
    if (!user?.geojson) return;

    try {
      const filteredGeoJSON = structuredClone(user.geojson);

      filteredGeoJSON.features = filteredGeoJSON.features.filter((feature) => {
        const latitude = feature.coordinates?.latitude;
        const longitude = feature.coordinates?.longitude;

        return locationsForMap.some(
          (conn) =>
            conn.coordinates.latitude === latitude &&
            conn.coordinates.longitude === longitude
        );
      });
      renderConnections(filteredLocations);

      if (map.getSource("routes")) {
        map.getSource("routes").setData(filteredGeoJSON);
      }
    } catch (error) {
      console.error("Error updating filtered routes:", error);
    }
  }, [locationsForMap, map, olaMaps, isMapLoaded, user?.geojson]);

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

  // 5. Handle new location with separate route logic
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

      // Fetch route for new location
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

      const updatedGeoJSON = user.geojson ?? {
        type: "FeatureCollection",
        features: [],
      };

      updatedGeoJSON.features.push(addRoute);

      // Save updated GeoJSON
      const geojsonResponse = await axios.put(`/api/admin/${user.id}/geojson`, {
        geojson: updatedGeoJSON,
      });

      if (geojsonResponse.status === 200) {
        alert("Connection created successfully ✅");
        const updateUser = geojsonResponse.data.user;
        setUser(updateUser);
        localStorage.setItem("auth", JSON.stringify(updateUser));

        // Add marker
        const markerElement = createLocationMarkerElement(
          newLocation,
          drawCable,
          setHoveredLocation,
          { map, olaMaps, isMapLoaded },
          { user: updateUser, setUser },
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

        // Update routes separately
        updateRoutesSource(updateUser.geojson);

        setAllLocations((prev) => [...prev, newLocation]);
        setSuccess("Location added successfully!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (error) {
      console.log("Error While Creating a Location:", error);
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
        <div className="absolute top-4 right-4 z-10">
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
          setAreas((prev) => [...prev, newArea]);
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
