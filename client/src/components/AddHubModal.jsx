import { useState } from "react";
import { X, Building2, MapPin, Upload, Image as ImageIcon } from "lucide-react";
import { uploadToCloudinary } from "./AddLocationModal";
import Swal from "sweetalert2";
import axios from "./axios";
import { showToast } from "./Map/utils";

const AddHubModal = ({ isOpen, onClose, coordinates, onHubCreated }) => {
  const [hubName, setHubName] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState(null);
  const [image2, setImage2] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [image2Preview, setImage2Preview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleImageChange = (e, imageNumber) => {
    const file = e.target.files[0];
    if (file) {
      if (imageNumber === 1) {
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
      } else {
        setImage2(file);
        setImage2Preview(URL.createObjectURL(file));
      }
    }
  };

  const removeImage = (imageNumber) => {
    if (imageNumber === 1) {
      setImage(null);
      setImagePreview(null);
    } else {
      setImage2(null);
      setImage2Preview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create FormData for file uploads
      let image1Url = null;
      let image2Url = null;

      if (image) image1Url = await uploadToCloudinary(image);
      if (image2) image2Url = await uploadToCloudinary(image2);

      const hubData = {
        name: hubName,
        notes,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        ...(image1Url && { image: image1Url }),
        ...(image2Url && { image2: image2Url }),
      };

      console.log("Submitting Hub data:", hubData);

      const response = await axios.post("/api/hubs", hubData, {
        headers: {
          "Content-Type": "application/json", // ✅ Force JSON
        },
      });
      const { data } = response;
      if (data.success) {
        showToast("success", data.message);
        onHubCreated(data.data);
      } else {
        showToast("error", data.message || "Something went wrong.");
      }
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating hub:", error);
      showToast("error", error.response?.data?.message || "Server Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setHubName("");
    setNotes("");
    setImage(null);
    setImage2(null);
    setImagePreview(null);
    setImage2Preview(null);
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
        className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Add New Hub</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Hub Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hub Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={hubName}
                onChange={(e) => setHubName(e.target.value)}
                placeholder="Enter hub name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or details about this hub..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Image 1 Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hub Image/Diagram
              </label>

              {!imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    id="image1"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 1)}
                    className="hidden"
                  />
                  <label
                    htmlFor="image1"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      PNG, JPG, GIF up to 10MB
                    </span>
                  </label>
                </div>
              ) : (
                <div className="relative border border-gray-300 rounded-lg p-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(1)}
                    className="absolute top-4 right-4 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Image 2 Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Image/Diagram
              </label>

              {!image2Preview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    id="image2"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 2)}
                    className="hidden"
                  />
                  <label
                    htmlFor="image2"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      PNG, JPG, GIF up to 10MB
                    </span>
                  </label>
                </div>
              ) : (
                <div className="relative border border-gray-300 rounded-lg p-2">
                  <img
                    src={image2Preview}
                    alt="Preview 2"
                    className="w-full h-48 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(2)}
                    className="absolute top-4 right-4 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Hub"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHubModal;
