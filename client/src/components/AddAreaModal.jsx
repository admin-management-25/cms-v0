import { useEffect, useState } from "react";
import { X, MapPin, Compass } from "lucide-react";
import axios from "./axios";
import { showToast } from "./Map/utils";
import { useReverseGeocode } from "./hooks/useReverseGeocode";

const AddAreaModal = ({ isOpen, onClose, coordinates, onAreaCreated }) => {
  const [areaName, setAreaName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loading, error, addresses, reverseGeocode } = useReverseGeocode();

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

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const areaData = {
        name: areaName,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      };

      console.log("Submitting Area data:", areaData);

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

  const resetForm = () => {
    setAreaName("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Add New Area
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ///geo/// */}

        {!loading && !error && addresses.length > 0 && (
          <div className="mt-4">
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 shadow-sm">
              {/* Enhanced Sticky Header */}
              <div className="sticky top-0 z-10 bg-gradient-to-r from-green-500 to-emerald-600 border-b border-green-600">
                <div className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="flex-shrink-0 w-5 h-5 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-white font-semibold text-base tracking-wide">
                      Verified Addresses
                    </span>
                    <span className="bg-white bg-opacity-20 text-white text-xs font-medium px-2 py-1 rounded-full">
                      {addresses.length}
                    </span>
                  </div>
                </div>
              </div>
              {/* Address List */}
              <div className="space-y-3 p-4">
                {addresses.map((addr, i) => (
                  <div
                    key={i}
                    className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:border-green-300"
                    onClick={() => setAreaName(addr.address)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-lg mb-1 flex items-center">
                          {addr.name}
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            Verified
                          </span>
                        </p>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {addr.address}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Showing {addresses.length} address
              {addresses.length !== 1 ? "es" : ""}
            </p>
          </div>
        )}
        {/* ///geo/// */}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Selected Address Area */}
            {/* Enhanced Address Area with Attractive Styling */}
            <div className="space-y-4">
              {/* Header Section */}
              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-800 tracking-wide">
                    ADDRESS AREA NAME
                  </label>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Give a unique name to identify this location group
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-sm">
                  REQUIRED
                </span>
              </div>

              {/* Textarea Section */}
              <div className="relative group">
                <textarea
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="🏙️ Enter a descriptive name (e.g., Downtown Business District, Residential Zone A, Commercial Hub...)"
                  required
                  rows={3}
                  className="w-full px-5 py-5 pl-14 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300 placeholder-gray-400 group-hover:border-green-400 text-base resize-none bg-white shadow-sm font-medium"
                  style={{
                    background:
                      "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                  }}
                />

                {/* Enhanced Location Icon */}
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-green-500 transition-colors duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 group-focus-within:from-green-100 group-focus-within:to-green-200 rounded-lg flex items-center justify-center shadow-inner">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Enhanced Clear Button */}
                {areaName && (
                  <button
                    type="button"
                    onClick={() => setAreaName("")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-2 hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Footer with Character Count and Tips */}
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-xs text-gray-600 font-medium">
                    Tip: Use descriptive names like "North Zone" or "City
                    Center"
                  </span>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    areaName.length > 200
                      ? "bg-red-100 text-red-700"
                      : areaName.length > 150
                      ? "bg-yellow-100 text-yellow-700"
                      : areaName.length > 50
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {areaName.length}/250
                </div>
              </div>
            </div>

            {/* Coordinates Display */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">Coordinates:</p>
                  <p className="text-sm font-mono text-gray-900">
                    {coordinates?.latitude?.toFixed(6)},{" "}
                    {coordinates?.longitude?.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {loading && (
            <div className="text-center text-sm text-gray-500">
              Fetching address...
            </div>
          )}

          {error && (
            <div className="bg-red-100 text-red-800 p-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        </form>
      </div>
    </div>
  );
};

export default AddAreaModal;
