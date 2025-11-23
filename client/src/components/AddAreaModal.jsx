import { useEffect, useState, useCallback } from "react";
import { X, MapPin, Compass, Circle, Plus, Minus } from "lucide-react";
import axios from "./axios";
import { showToast } from "./Map/utils";
import { useReverseGeocode } from "./hooks/useReverseGeocode";

const AddAreaModal = ({ isOpen, onClose, coordinates, onAreaCreated, map }) => {
  const [areaName, setAreaName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPolygon, setShowPolygon] = useState(false);
  const [polygonRadius, setPolygonRadius] = useState(500);
  const { loading, error, addresses, reverseGeocode } = useReverseGeocode();

  // ✅ Safe removal functions
  const safeRemoveLayer = useCallback((mapInstance, layerId) => {
    try {
      if (!mapInstance || typeof mapInstance.getLayer !== "function")
        return false;
      const layer = mapInstance.getLayer(layerId);
      if (layer) {
        mapInstance.removeLayer(layerId);
        return true;
      }
    } catch (error) {
      console.debug(`Could not remove layer ${layerId}:`, error);
      return false;
    }
    return false;
  }, []);

  const safeRemoveSource = useCallback((mapInstance, sourceId) => {
    try {
      if (!mapInstance || typeof mapInstance.getSource !== "function")
        return false;
      const source = mapInstance.getSource(sourceId);
      if (source) {
        mapInstance.removeSource(sourceId);
        return true;
      }
    } catch (error) {
      console.debug(`Could not remove source ${sourceId}:`, error);
      return false;
    }
    return false;
  }, []);

  const generateCirclePolygon = (center, radiusInMeters, points = 64) => {
    const coords = [];
    const earthRadius = 6371000;

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radiusInMeters * Math.cos(angle);
      const dy = radiusInMeters * Math.sin(angle);

      const deltaLat = dy / earthRadius;
      const deltaLon =
        dx / (earthRadius * Math.cos((center.latitude * Math.PI) / 180));

      const lat = center.latitude + (deltaLat * 180) / Math.PI;
      const lon = center.longitude + (deltaLon * 180) / Math.PI;

      coords.push([lon, lat]);
    }

    return coords;
  };

  // ✅ FIXED - Update polygon with safety checks
  const updatePolygonOnMap = useCallback(() => {
    if (
      !map ||
      typeof map.getLayer !== "function" ||
      !coordinates ||
      !showPolygon
    ) {
      // Clean up if hiding
      try {
        if (map) {
          safeRemoveLayer(map, "temp-polygon-outline");
          safeRemoveLayer(map, "temp-polygon-layer");
          safeRemoveSource(map, "temp-polygon");
        }
      } catch (error) {
        console.debug("Cleanup error:", error);
      }
      return;
    }

    const sourceId = "temp-polygon";
    const layerId = "temp-polygon-layer";
    const outlineId = "temp-polygon-outline";

    try {
      // Remove existing using safe functions
      safeRemoveLayer(map, outlineId);
      safeRemoveLayer(map, layerId);
      safeRemoveSource(map, sourceId);

      const polygonCoords = generateCirclePolygon(coordinates, polygonRadius);

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [polygonCoords],
          },
        },
      });

      map.addLayer({
        id: layerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": 0.3,
        },
      });

      map.addLayer({
        id: outlineId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#059669",
          "line-width": 2,
        },
      });
    } catch (error) {
      console.error("Error updating polygon on map:", error);
    }
  }, [
    map,
    coordinates,
    showPolygon,
    polygonRadius,
    safeRemoveLayer,
    safeRemoveSource,
  ]);

  useEffect(() => {
    if (!coordinates) return;
    const fetchAddress = async () => {
      try {
        await reverseGeocode(coordinates.latitude, coordinates.longitude);
      } catch (error) {
        console.log("Error While doing reverseGeoCode : ", error);
      }
    };
    fetchAddress();
  }, [coordinates]);

  useEffect(() => {
    updatePolygonOnMap();
  }, [updatePolygonOnMap]);

  // ✅ FIXED - Cleanup with safety checks
  useEffect(() => {
    return () => {
      if (!map || typeof map.getLayer !== "function") return;

      try {
        safeRemoveLayer(map, "temp-polygon-outline");
        safeRemoveLayer(map, "temp-polygon-layer");
        safeRemoveSource(map, "temp-polygon");
      } catch (error) {
        console.debug("Cleanup error (ignored):", error);
      }
    };
  }, [map, safeRemoveLayer, safeRemoveSource]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const polygonCoords = showPolygon
        ? generateCirclePolygon(coordinates, polygonRadius)
        : null;

      const areaData = {
        name: areaName,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        polygon: showPolygon
          ? {
              radius: polygonRadius,
              coordinates: polygonCoords,
            }
          : null,
      };

      const response = await axios.post("/api/area-names", areaData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const { data } = response;
      if (data.success) {
        showToast("success", data.message);
        onAreaCreated(data.data);
      } else {
        showToast("error", data.message || "Something went wrong.");
      }
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating area:", error);
      showToast("error", error.response?.data?.message || "Server Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ FIXED - Reset form with safety checks
  const resetForm = () => {
    setAreaName("");
    setShowPolygon(false);
    setPolygonRadius(500);

    try {
      if (map && typeof map.getLayer === "function") {
        safeRemoveLayer(map, "temp-polygon-outline");
        safeRemoveLayer(map, "temp-polygon-layer");
        safeRemoveSource(map, "temp-polygon");
      }
    } catch (error) {
      console.debug("Reset form cleanup error:", error);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const increaseRadius = () => {
    setPolygonRadius((prev) => Math.min(prev + 100, 5000));
  };

  const decreaseRadius = () => {
    setPolygonRadius((prev) => Math.max(prev - 100, 100));
  };

  return (
    <div className="fixed top-0 right-0 h-full w-[450px] bg-white shadow-2xl z-[2000] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 shadow-md z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Add New Area</h2>
              <p className="text-xs text-green-100">Define location coverage</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Reverse Geocode Addresses */}
        {!loading && !error && addresses.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <span className="text-sm font-semibold text-green-800">
                Suggested Addresses ({addresses.length})
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {addresses.map((addr, i) => (
                <div
                  key={i}
                  className="p-2 bg-white border border-green-200 rounded-md hover:border-green-400 cursor-pointer transition-colors"
                  onClick={() => setAreaName(addr.address)}
                >
                  <p className="text-xs font-semibold text-gray-800">
                    {addr.name}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {addr.address}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Click to use as area name
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Area Name Input */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Area Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="Enter area name (e.g., Downtown District, North Zone...)"
                required
                rows={3}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all resize-none text-sm"
              />
              {areaName && (
                <button
                  type="button"
                  onClick={() => setAreaName("")}
                  className="absolute right-2 top-2 p-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                Use descriptive names
              </span>
              <span
                className={`text-xs font-semibold ${
                  areaName.length > 200
                    ? "text-red-600"
                    : areaName.length > 150
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {areaName.length}/250
              </span>
            </div>
          </div>

          {/* Coordinates Display */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">
                Center Point
              </span>
            </div>
            <p className="text-xs font-mono text-gray-900">
              {coordinates?.latitude?.toFixed(6)},{" "}
              {coordinates?.longitude?.toFixed(6)}
            </p>
          </div>

          {/* Polygon Section */}
          <div className="border-2 border-dashed border-green-300 rounded-lg p-3 bg-green-50">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold text-gray-800">
                    Coverage Area
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPolygon(!showPolygon)}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                    showPolygon
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {showPolygon ? "ACTIVE" : "INACTIVE"}
                </button>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Define a coverage area to show relevant connections in the
                filter results.
              </p>
            </div>

            {showPolygon && (
              <div className="space-y-3">
                <div className="text-center bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">Radius</p>
                  <p className="text-xl font-bold text-green-700">
                    {polygonRadius >= 1000
                      ? `${(polygonRadius / 1000).toFixed(1)} km`
                      : `${polygonRadius} m`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={decreaseRadius}
                    disabled={polygonRadius <= 100}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <Minus className="w-4 h-4" />
                    Shrink
                  </button>

                  <button
                    type="button"
                    onClick={increaseRadius}
                    disabled={polygonRadius >= 5000}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Expand
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[200, 500, 1000, 2000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPolygonRadius(preset)}
                      className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                        polygonRadius === preset
                          ? "bg-green-600 text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {preset >= 1000 ? `${preset / 1000}km` : `${preset}m`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {loading && (
            <div className="text-center text-sm text-gray-500 py-2">
              Fetching address...
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-800 p-2 rounded-md text-xs">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-200 -mx-4 px-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Area"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAreaModal;
