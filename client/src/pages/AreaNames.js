// pages/AreaNames.js
"use client";

import { useState, useEffect } from "react";
import axios from "../components/axios";
import { DataTable } from "../components/DataTable";
import CableNetLoader from "../components/Loader";

const AreaNames = () => {
  const [areaNames, setAreaNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAreaName, setEditingAreaName] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    coordinates: {
      latitude: "",
      longitude: "",
    },
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get("/api/area-names");
      setAreaNames(response.data);
    } catch (error) {
      setError("Failed to fetch area names");
      console.error("Error fetching area names:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const lat = parseFloat(formData.coordinates.latitude);
    const lng = parseFloat(formData.coordinates.longitude);

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setError(
        "Please enter valid coordinates (Latitude: -90 to 90, Longitude: -180 to 180)"
      );
      return;
    }

    try {
      const areaNameData = {
        name: formData.name,
        latitude: lat,
        longitude: lng,
      };

      let response;
      if (editingAreaName) {
        response = await axios.put(
          `/api/area-names/${editingAreaName._id}`,
          areaNameData
        );
      } else {
        response = await axios.post("/api/area-names", areaNameData);
      }

      setSuccess(
        editingAreaName
          ? "Area name updated successfully"
          : "Area name created successfully"
      );
      fetchData();
      resetForm();
    } catch (err) {
      console.error("Submission error:", err);
      setError(
        err.response?.data?.message || err.message || "Operation failed"
      );
    }
  };

  const handleEdit = (areaName) => {
    setEditingAreaName(areaName);
    setFormData({
      name: areaName.name || "",
      coordinates: {
        latitude: areaName.coordinates.latitude.toString(),
        longitude: areaName.coordinates.longitude.toString(),
      },
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this area name?")) {
      try {
        await axios.delete(`/api/area-names/${id}`);
        setSuccess("Area name deleted successfully");
        fetchData();
      } catch (error) {
        console.error("Error while deleting area name:", error);
        setError("Failed to delete area name");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      coordinates: { latitude: "", longitude: "" },
    });
    setEditingAreaName(null);
    setShowForm(false);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            coordinates: {
              latitude: position.coords.latitude.toString(),
              longitude: position.coords.longitude.toString(),
            },
          });
          setSuccess("Current location detected!");
        },
        () => {
          setError(
            "Unable to get current location. Please enter coordinates manually."
          );
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  };

  // Pagination & Search Logic
  const filteredAreaNames = areaNames.filter((areaName) => {
    const name = areaName.name || "";
    const searchLower = searchTerm.toLowerCase();

    return name.toLowerCase().includes(searchLower);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAreaNames = filteredAreaNames.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredAreaNames.length / itemsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-center mt-6">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 mx-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Previous
        </button>
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i + 1}
            onClick={() => handlePageChange(i + 1)}
            className={`px-4 py-2 mx-1 rounded-lg transition-colors ${
              i + 1 === currentPage
                ? "bg-purple-600 text-white font-semibold"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 mx-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    );
  };

  if (loading) {
    return <CableNetLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="bg-white shadow-lg rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-3xl font-bold text-gray-800 tracking-wide">
            📍 Area Name Management
          </h2>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <input
                type="text"
                placeholder="Search area names..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <svg
                className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
            >
              {showForm ? "Cancel" : "+ Add Area"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-100 text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-lg bg-green-100 text-green-700">
            {success}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 border border-gray-200 rounded-xl p-6 mb-8 bg-gray-50 shadow-inner"
          >
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Area Name *
              </label>
              <input
                type="text"
                className="w-full border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter area name (e.g., Downtown, City Center)"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  className="w-full border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
                  value={formData.coordinates.latitude}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      coordinates: {
                        ...formData.coordinates,
                        latitude: e.target.value,
                      },
                    })
                  }
                  placeholder="10.981010"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  className="w-full border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
                  value={formData.coordinates.longitude}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      coordinates: {
                        ...formData.coordinates,
                        longitude: e.target.value,
                      },
                    })
                  }
                  placeholder="76.9668453"
                  required
                />
              </div>
              <button
                type="button"
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                onClick={getCurrentLocation}
              >
                📍 Get Current Location
              </button>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition-colors"
              >
                {editingAreaName ? "Update Area Name" : "Create Area Name"}
              </button>
              <button
                type="button"
                className="px-6 py-2 bg-gray-400 text-white rounded-lg shadow hover:bg-gray-500 transition-colors"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <DataTable
          data={currentAreaNames}
          onEdit={handleEdit}
          onDelete={handleDelete}
          columns={[
            {
              key: "name",
              header: "Area Name",
              render: (a) => (
                <div className="flex items-center gap-2">
                  <span className="text-xl">📍</span>
                  <span className="font-medium">{a.name}</span>
                </div>
              ),
            },
            {
              key: "coordinates",
              header: "Coordinates",
              render: (a) => (
                <div className="text-xs">
                  <div>Lat: {a.coordinates.latitude.toFixed(6)}</div>
                  <div>Lng: {a.coordinates.longitude.toFixed(6)}</div>
                </div>
              ),
            },
            {
              key: "createdAt",
              header: "Created At",
              className: "hidden lg:table-cell",
              render: (a) => new Date(a.createdAt).toLocaleDateString(),
            },
            {
              key: "updatedAt",
              header: "Last Updated",
              className: "hidden xl:table-cell",
              render: (a) => new Date(a.updatedAt).toLocaleDateString(),
            },
          ]}
        />
        {currentAreaNames.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No area names match your search or exist.
          </div>
        )}

        {renderPagination()}
      </div>
    </div>
  );
};

export default AreaNames;
