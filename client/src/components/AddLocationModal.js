// components/AddLocationModal.js
"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "../components/axios";
import * as turf from "@turf/turf";
import { MapPin, Building2 } from "lucide-react";

export const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "react_upload_preset");
  formData.append("cloud_name", "dgixdcqvh");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dgixdcqvh/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();
  if (data.secure_url) return data.secure_url;
  throw new Error(data.error?.message || "Upload failed");
};

const AddLocationModal = ({
  isOpen,
  onClose,
  coordinates,
  onLocationCreated,
  allLocations = [],
  hubs = [],
}) => {
  const [services, setServices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [imageFile2, setImageFile2] = useState(null);
  const [imagePreview2, setImagePreview2] = useState(null);
  const [filteredServiceTypes, setFilteredServiceTypes] = useState([]);
  const [formData, setFormData] = useState({
    serviceName: "",
    serviceType: "",
    notes: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNearby, setShowNearby] = useState(true);
  const [startingPoint, setStartingPoint] = useState({
    name: "Central Hub",
    type: "default",
    id: null,
    junctionBoxId: null,
    coordinates: null,
  });
  const [expandedLocations, setExpandedLocations] = useState(new Set());

  // Calculate nearby locations and hubs
  const nearbyData = useMemo(() => {
    if (!coordinates || !isOpen) return { locations: [], hubs: [] };

    const clickedPoint = turf.point([
      coordinates.longitude,
      coordinates.latitude,
    ]);

    // Find nearby locations within 500m
    const nearbyLocations = allLocations
      .map((location) => {
        const locationPoint = turf.point([
          location.coordinates.longitude,
          location.coordinates.latitude,
        ]);
        const distance = turf.distance(clickedPoint, locationPoint, {
          units: "meters",
        });
        return { ...location, distance };
      })
      .filter((loc) => loc.distance <= 500)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    // Find nearby hubs within 1000m
    const nearbyHubs = hubs
      .map((hub) => {
        const hubPoint = turf.point([
          hub.coordinates.longitude,
          hub.coordinates.latitude,
        ]);
        const distance = turf.distance(clickedPoint, hubPoint, {
          units: "meters",
        });
        return { ...hub, distance };
      })
      .filter((hub) => hub.distance <= 1000)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    return { locations: nearbyLocations, hubs: nearbyHubs };
  }, [coordinates, allLocations, hubs, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setFormData({ serviceName: "", serviceType: "", notes: "" });
      setImageFile(null);
      setImageFile2(null);
      setImagePreview(null);
      setImagePreview2(null);
      setError("");
      setShowNearby(true);
      setExpandedLocations(new Set());
      setStartingPoint({
        name: "Central Hub",
        type: "default",
        id: null,
        junctionBoxId: null,
        coordinates: null,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.serviceName) {
      const filtered = serviceTypes.filter(
        (st) => st.service?._id === formData.serviceName
      );
      setFilteredServiceTypes(filtered);
    } else {
      setFilteredServiceTypes([]);
    }
  }, [formData.serviceName, serviceTypes]);

  const fetchData = async () => {
    try {
      const [servicesRes, serviceTypesRes] = await Promise.all([
        axios.get("/api/services"),
        axios.get("/api/service-types"),
      ]);
      setServices(servicesRes.data);
      setServiceTypes(serviceTypesRes.data);
    } catch (error) {
      setError("Failed to fetch data");
      console.error("Error fetching data:", error);
    }
  };

  const toggleLocationExpansion = (locationId) => {
    setExpandedLocations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  const resetStartingPoint = () => {
    setStartingPoint({
      name: "Central Hub",
      type: "default",
      id: null,
      junctionBoxId: null,
      coordinates: null,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleImageChange2 = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed");
        return;
      }
      setImageFile2(file);
      setImagePreview2(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let image1Url = null;
      let image2Url = null;

      if (imageFile) image1Url = await uploadToCloudinary(imageFile);
      if (imageFile2) image2Url = await uploadToCloudinary(imageFile2);

      const locationData = {
        serviceName: formData.serviceName,
        serviceType: formData.serviceType,
        notes: formData.notes,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        ...(image1Url && { image: image1Url }),
        ...(image2Url && { image2: image2Url }),
      };

      const response = await axios.post("/api/locations", locationData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      onLocationCreated(response.data, startingPoint.coordinates);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create location");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "30px",
          width: "90%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ margin: 0, color: "#2c3e50" }}>Add New Location</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            background: "#f8f9fa",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
            fontSize: "14px",
            color: "#666",
          }}
        >
          <strong>Selected Coordinates:</strong>
          <br />
          Latitude: {coordinates?.latitude?.toFixed(6)}
          <br />
          Longitude: {coordinates?.longitude?.toFixed(6)}
        </div>

        {/* Starts From Section */}
        <div
          style={{
            background: "#fff3e0",
            border: "2px solid #ffb74d",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                color: "#e65100",
                fontWeight: "600",
              }}
            >
              🚀 Starts From
            </h3>
            {startingPoint.type !== "default" && (
              <button
                onClick={resetStartingPoint}
                style={{
                  background: "#ff5722",
                  color: "white",
                  border: "none",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#d84315";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ff5722";
                }}
              >
                Reset to Central Hub
              </button>
            )}
          </div>
          <div
            style={{
              background: "white",
              padding: "12px",
              borderRadius: "6px",
              border: "2px solid #ffb74d",
            }}
          >
            <div
              style={{ fontWeight: "600", color: "#e65100", fontSize: "14px" }}
            >
              {startingPoint.name}
            </div>
            {startingPoint.type !== "default" && (
              <div
                style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}
              >
                {startingPoint.type === "hub"
                  ? "🏢 Hub"
                  : startingPoint.junctionBoxId
                  ? "📦 Junction Box"
                  : "📍 Location"}
              </div>
            )}
          </div>
        </div>

        {/* Nearby Locations & Hubs Section */}
        {(nearbyData.locations.length > 0 || nearbyData.hubs.length > 0) && (
          <div
            style={{
              background: "#e8f5e9",
              border: "2px solid #81c784",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  color: "#2e7d32",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <MapPin size={18} />
                Nearby Points
              </h3>
              <button
                onClick={() => setShowNearby(!showNearby)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#2e7d32",
                  fontWeight: "600",
                }}
              >
                {showNearby ? "Hide" : "Show"}
              </button>
            </div>

            {showNearby && (
              <>
                {/* Nearby Locations */}
                {nearbyData.locations.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <h4
                      style={{
                        fontSize: "13px",
                        color: "#1b5e20",
                        marginBottom: "8px",
                        fontWeight: "600",
                      }}
                    >
                      📍 Nearby Locations ({nearbyData.locations.length})
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        paddingRight: "8px",
                      }}
                    >
                      {nearbyData.locations.map((loc) => (
                        <div key={loc._id}>
                          {/* Main Location */}
                          <div
                            onClick={() =>
                              setStartingPoint({
                                name: `${
                                  loc.serviceName?.name || "Unknown"
                                } - ${loc.serviceType?.name || ""}`,
                                type: "location",
                                id: loc._id,
                                junctionBoxId: null,
                                coordinates: loc.coordinates,
                              })
                            }
                            style={{
                              background:
                                startingPoint.id === loc._id &&
                                !startingPoint.junctionBoxId
                                  ? "#c8e6c9"
                                  : "white",
                              padding: "10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              border:
                                startingPoint.id === loc._id &&
                                !startingPoint.junctionBoxId
                                  ? "2px solid #4caf50"
                                  : "1px solid #c8e6c9",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              if (
                                startingPoint.id !== loc._id ||
                                startingPoint.junctionBoxId
                              ) {
                                e.currentTarget.style.background = "#f1f8f1";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (
                                startingPoint.id !== loc._id ||
                                startingPoint.junctionBoxId
                              ) {
                                e.currentTarget.style.background = "white";
                              }
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "start",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: "600",
                                    color: "#2e7d32",
                                  }}
                                >
                                  {loc.serviceName?.name || "Unknown Service"}
                                </div>
                                <div
                                  style={{ color: "#666", fontSize: "11px" }}
                                >
                                  {loc.serviceType?.icon}{" "}
                                  {loc.serviceType?.name}
                                </div>
                                {loc.notes && (
                                  <div
                                    style={{
                                      color: "#999",
                                      fontSize: "11px",
                                      marginTop: "4px",
                                    }}
                                  >
                                    {loc.notes.substring(0, 50)}
                                    {loc.notes.length > 50 ? "..." : ""}
                                  </div>
                                )}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <div
                                  style={{
                                    background: "#4caf50",
                                    color: "white",
                                    padding: "4px 8px",
                                    borderRadius: "12px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {loc.distance.toFixed(0)}m away
                                </div>
                                {loc.junctionBox &&
                                  loc.junctionBox.length > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLocationExpansion(loc._id);
                                      }}
                                      style={{
                                        background: "#2196f3",
                                        color: "white",
                                        border: "none",
                                        padding: "4px 8px",
                                        borderRadius: "12px",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      📦 {loc.junctionBox.length}{" "}
                                      {expandedLocations.has(loc._id)
                                        ? "▲"
                                        : "▼"}
                                    </button>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Junction Boxes - Expandable */}
                          {loc.junctionBox &&
                            loc.junctionBox.length > 0 &&
                            expandedLocations.has(loc._id) && (
                              <div
                                style={{
                                  marginLeft: "20px",
                                  marginTop: "4px",
                                  borderLeft: "2px solid #2196f3",
                                  paddingLeft: "8px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                }}
                              >
                                {loc.junctionBox.map((jb, index) => (
                                  <div
                                    key={jb._id}
                                    onClick={() =>
                                      setStartingPoint({
                                        name: `Junction Box ${index + 1} (${
                                          loc.serviceName?.name || "Unknown"
                                        })`,
                                        type: "location",
                                        id: loc._id,
                                        junctionBoxId: jb._id,
                                        coordinates: jb.coordinates,
                                      })
                                    }
                                    style={{
                                      background:
                                        startingPoint.junctionBoxId === jb._id
                                          ? "#bbdefb"
                                          : "#f5f5f5",
                                      padding: "6px 8px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      border:
                                        startingPoint.junctionBoxId === jb._id
                                          ? "2px solid #2196f3"
                                          : "1px solid #e0e0e0",
                                      cursor: "pointer",
                                      transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                      if (
                                        startingPoint.junctionBoxId !== jb._id
                                      ) {
                                        e.currentTarget.style.background =
                                          "#e3f2fd";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (
                                        startingPoint.junctionBoxId !== jb._id
                                      ) {
                                        e.currentTarget.style.background =
                                          "#f5f5f5";
                                      }
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontWeight: "600",
                                        color: "#1976d2",
                                        marginBottom: "2px",
                                      }}
                                    >
                                      📦 Junction Box {index + 1}
                                    </div>
                                    {jb.notes && (
                                      <div style={{ color: "#666" }}>
                                        {jb.notes.substring(0, 40)}
                                        {jb.notes.length > 40 ? "..." : ""}
                                      </div>
                                    )}
                                    <div
                                      style={{
                                        color: "#999",
                                        fontSize: "10px",
                                        marginTop: "2px",
                                      }}
                                    >
                                      Lat: {jb.coordinates.latitude.toFixed(5)},
                                      Lon: {jb.coordinates.longitude.toFixed(5)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nearby Hubs */}
                {nearbyData.hubs.length > 0 && (
                  <div>
                    <h4
                      style={{
                        fontSize: "13px",
                        color: "#1b5e20",
                        marginBottom: "8px",
                        fontWeight: "600",
                      }}
                    >
                      🏢 Nearby Hubs ({nearbyData.hubs.length})
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        paddingRight: "8px",
                      }}
                    >
                      {nearbyData.hubs.map((hub) => (
                        <div
                          key={hub._id}
                          onClick={() =>
                            setStartingPoint({
                              name: hub.name,
                              type: "hub",
                              id: hub._id,
                              junctionBoxId: null,
                              coordinates: hub.coordinates,
                            })
                          }
                          style={{
                            background:
                              startingPoint.id === hub._id
                                ? "#ffe0b2"
                                : "white",
                            padding: "10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            border:
                              startingPoint.id === hub._id
                                ? "2px solid #ff9800"
                                : "1px solid #c8e6c9",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (startingPoint.id !== hub._id) {
                              e.currentTarget.style.background = "#fff8f0";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (startingPoint.id !== hub._id) {
                              e.currentTarget.style.background = "white";
                            }
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{ fontWeight: "600", color: "#2e7d32" }}
                            >
                              {hub.name}
                            </div>
                            <div
                              style={{
                                background: "#ff9800",
                                color: "white",
                                padding: "4px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "600",
                              }}
                            >
                              {hub.distance.toFixed(0)}m away
                            </div>
                          </div>
                          {hub.notes && (
                            <div
                              style={{
                                color: "#999",
                                fontSize: "11px",
                                marginTop: "4px",
                              }}
                            >
                              {hub.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fee",
              color: "#c33",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "20px",
              border: "1px solid #fcc",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "500",
                color: "#333",
              }}
            >
              Service *
            </label>
            <select
              value={formData.serviceName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  serviceName: e.target.value,
                  serviceType: "",
                })
              }
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "2px solid #e1e5e9",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service._id} value={service._id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "500",
                color: "#333",
              }}
            >
              Service Type *
            </label>
            <select
              value={formData.serviceType}
              onChange={(e) =>
                setFormData({ ...formData, serviceType: e.target.value })
              }
              required
              disabled={!formData.serviceName}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "2px solid #e1e5e9",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: !formData.serviceName ? "#f5f5f5" : "white",
              }}
            >
              <option value="">Select a service type</option>
              {filteredServiceTypes.map((serviceType) => (
                <option key={serviceType._id} value={serviceType._id}>
                  {serviceType.icon} {serviceType.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "500",
                color: "#333",
              }}
            >
              Upload Image (Optional, max 5MB)
            </label>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && (
              <div style={{ marginTop: "10px", textAlign: "center" }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    maxHeight: "150px",
                    maxWidth: "100%",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "500",
                color: "#333",
              }}
            >
              Upload Second Image (Optional, max 5MB)
            </label>
            <input type="file" accept="image/*" onChange={handleImageChange2} />
            {imagePreview2 && (
              <div style={{ marginTop: "10px", textAlign: "center" }}>
                <img
                  src={imagePreview2}
                  alt="Preview 2"
                  style={{
                    maxHeight: "150px",
                    maxWidth: "100%",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: "500",
                color: "#333",
              }}
            >
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes about this location..."
              rows="3"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "2px solid #e1e5e9",
                borderRadius: "6px",
                fontSize: "14px",
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "12px 20px",
                border: "2px solid #e1e5e9",
                borderRadius: "6px",
                background: "white",
                color: "#666",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 20px",
                border: "none",
                borderRadius: "6px",
                background: loading ? "#95a5a6" : "#27ae60",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              {loading ? "Creating..." : "Create Location"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLocationModal;
