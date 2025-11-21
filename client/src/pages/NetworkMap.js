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
import { Axios } from "axios";

const NetworkMap = () => {
  const [allLocations, setAllLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  // const [showActionPopup, setShowActionPopup] = useState(false);
  // const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [showAddHubModal, setShowAddHubModal] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  // const [clickedCoordinates, setClickedCoordinates] = useState(null);
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
          // Add or update source
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
              // Add or update source
              if (!map.getSource("routes")) {
                map.addSource("routes", { type: "geojson", data: geojson });
              } else {
                map.getSource("routes").setData(geojson);
              }
            }
          }
        }

        // 👇 Only add layer if routes should be visible
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
      // Hide routes
      safeRemoveLayer(map, "routes-layer");
    } else {
      // Show routes (re-add layer if source exists)
      if (map.getSource("routes") && !map.getLayer("routes-layer")) {
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

  useEffect(() => {
    setFilteredLocations(allLocations);
  }, [allLocations]);

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
      const [locationsRes, servicesRes, serviceTypesRes, hubsRes] =
        await Promise.all([
          axios.get("/api/locations"),
          axios.get("/api/services"),
          axios.get("/api/service-types"),
          axios.get("/api/hubs"),
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

  const handleFiltersChange = (filters) => {
    try {
      let filtered = [...allLocations];

      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(
          (location) =>
            location.notes?.toLowerCase().includes(searchTerm) ||
            location.serviceName?.name?.toLowerCase().includes(searchTerm) ||
            location.serviceType?.name?.toLowerCase().includes(searchTerm) ||
            location.coordinates.latitude.toString().includes(searchTerm) ||
            location.coordinates.longitude.toString().includes(searchTerm)
        );
      }

      if (filters.service.length > 0) {
        filtered = filtered.filter((location) =>
          filters.service.includes(location.serviceName?._id)
        );
      }

      if (filters.serviceType.length > 0) {
        filtered = filtered.filter((location) =>
          filters.serviceType.includes(location.serviceType?._id)
        );
      }

      if (filters.distanceRange.length > 0) {
        filtered = filtered.filter((location) => {
          const distance = location.distanceFromCentralHub;
          return filters.distanceRange.some((range) => {
            if (range.includes("+")) {
              const min = Number.parseInt(range.replace("+", ""));
              return distance >= min;
            } else {
              const [min, max] = range.split("-").map(Number);
              return distance >= min && distance < max;
            }
          });
        });
      }

      if (filters.sortBy.length > 0) {
        filters.sortBy.forEach((sortKey) => {
          filtered.sort((a, b) => {
            let aValue, bValue;
            switch (sortKey) {
              case "name":
                aValue = a.serviceName?.name || "";
                bValue = b.serviceName?.name || "";
                break;
              case "type":
                aValue = a.serviceType?.name || "";
                bValue = b.serviceType?.name || "";
                break;
              case "created":
                aValue = new Date(a.createdAt);
                bValue = new Date(b.createdAt);
                break;
              case "distance":
              default:
                aValue = a.distanceFromCentralHub;
                bValue = b.distanceFromCentralHub;
                break;
            }
            if (filters.sortOrder.includes("desc")) {
              return aValue < bValue ? 1 : -1;
            }
            return aValue > bValue ? 1 : -1;
          });
        });
      }
      const geojson = user?.geojson;
      const updatedGeoJSON = structuredClone(geojson);
      const features = JSON.parse(JSON.stringify(user?.geojson?.features));
      const filtered2 = features.filter((f) => f);

      updatedGeoJSON.features = filtered2.filter((feature) => {
        const latitude = feature.coordinates?.latitude;
        const longitude = feature.coordinates?.longitude;
        return filtered.some(
          (conn) =>
            conn.coordinates.latitude === latitude &&
            conn.coordinates.longitude === longitude
        );
      });

      safeRemoveSource();
      safeRemoveLayer();
      map.getSource("routes").setData(updatedGeoJSON); // redraw

      // now updatedGeoJSON only contains the filtered connections
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
      setFilteredLocations(filtered);
    } catch (error) {
      console.log(
        ("Error while Handling the Filtering the Locations : ", error)
      );
    }
  };

  const handleLocationCreated = async (newLocation) => {
    try {
      if (newLocation.image && newLocation.image.startsWith("/uploads")) {
        newLocation.image = `${API_BASE_URL}${newLocation.image}`;
      }
      const response = await fetch(
        `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${CENTRAL_HUB.lat}%2C${CENTRAL_HUB.lng}&destinations=${newLocation?.coordinates.latitude}%2C${newLocation?.coordinates.longitude}&api_key=dxEuToWnHB5W4e4lcqiFwu2RwKA64Ixi0BFR73kQ`,
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
        console.log("Locaiton Added REs : ", updateUser.geojson);

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
            // renderConnections([...allLocations, newLocation]);
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
            onFiltersChange={handleFiltersChange}
            services={services}
            serviceTypes={serviceTypes}
            locations={filteredLocations}
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
      />
    </div>
  );
};

export default NetworkMap;
