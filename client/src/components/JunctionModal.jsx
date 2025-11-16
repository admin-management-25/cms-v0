import { useState, useEffect } from "react";
import { uploadToCloudinary } from "./AddLocationModal";
import axios from "./axios";
import Swal from "sweetalert2";

export default function JunctionModal({
  isOpen,
  coords,
  onClose,
  locationId,
  onSuccess,
}) {
  const [imageFile, setImageFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setImageFile(null);
      setNotes("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (!coords) {
      console.log("Location Was NoT getting in JunctionModal : !!");
      return;
    }
    try {
      let imageUrl = null;
      if (imageFile) imageUrl = await uploadToCloudinary(imageFile);

      const payload = {
        lat: coords.lat,
        lng: coords.lng,
        image: imageUrl,
        notes: notes.trim(),
      };

      const response = await axios.post(
        `/api/locations/add-junction/${locationId}`,
        payload
      );

      if (response.status === 200) {
        setLoading(false);
        const { data } = response;
        onClose();
        Swal.fire({
          icon: "success",
          title: "Saved",
          text: data.message || "Junction box added successfully.",
          toast: true,
          position: "top-end",
          timer: 1800,
          showConfirmButton: false,
        });
        onSuccess(data.data);
      }
    } catch (error) {
      console.log("Error While Saving the Junction Box..!! : ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[999999]">
      <div className="bg-white p-6 rounded-xl shadow-xl w-96 relative animate-fadeIn">
        {/* Header */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Add Junction Box
        </h2>

        {/* Coordinates */}
        <div className="text-sm text-gray-600 mb-4">
          <p>
            <b>Latitude:</b> {coords?.lat}
          </p>
          <p>
            <b>Longitude:</b> {coords?.lng}
          </p>
        </div>

        {/* Image Upload */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          className="w-full border rounded px-2 py-1 mb-4"
        />

        {/* Notes */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="3"
          className="w-full border rounded px-2 py-1 mb-4"
          placeholder="Enter notes..."
        />

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
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
            {loading ? "Saving..." : "Save Junction"}
          </button>
        </div>

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
      </div>
    </div>
  );
}
