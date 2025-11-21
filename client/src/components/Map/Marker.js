import Swal from "sweetalert2";
import { renderJunctionBoxMarkers } from "./utils";

function createImageModal(images) {
  // Create modal overlay
  const modalOverlay = document.createElement("div");
  modalOverlay.className =
    "fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4";
  modalOverlay.style.backdropFilter = "blur(5px)";

  // Create modal container
  const modalContainer = document.createElement("div");
  modalContainer.className =
    "bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col";

  // Create header with close button
  const modalHeader = document.createElement("div");
  modalHeader.className =
    "flex justify-between items-center p-6 border-b border-gray-200";

  const modalTitle = document.createElement("h2");
  modalTitle.className = "text-2xl font-bold text-gray-800";
  modalTitle.textContent = "All Images";

  const closeButton = document.createElement("button");
  closeButton.innerHTML = `
        <svg class="w-6 h-6 text-gray-500 hover:text-gray-700 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
    `;
  closeButton.className = "p-2 hover:bg-gray-100 rounded-full transition";

  // Create image container
  const imageContainer = document.createElement("div");
  imageContainer.className = "flex-1 overflow-y-auto p-6";

  // Create images grid
  const imagesGrid = document.createElement("div");
  imagesGrid.className = "grid grid-cols-1 md:grid-cols-2 gap-6";

  // Add images to grid
  images.forEach((imgSrc, index) => {
    const imageWrapper = document.createElement("div");
    imageWrapper.className =
      "group relative overflow-hidden rounded-xl bg-gray-100";

    const img = document.createElement("img");
    img.src = imgSrc;
    img.alt = `Location image ${index + 1}`;
    img.className =
      "w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105";
    img.loading = "lazy";

    imageWrapper.appendChild(img);
    imagesGrid.appendChild(imageWrapper);
  });

  // Assemble the modal
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  imageContainer.appendChild(imagesGrid);
  modalContainer.appendChild(modalHeader);
  modalContainer.appendChild(imageContainer);
  modalOverlay.appendChild(modalContainer);

  // Add to document
  document.body.appendChild(modalOverlay);
  document.body.style.overflow = "hidden";

  // Close functionality
  const handleEscape = (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  };

  const closeModal = () => {
    document.body.removeChild(modalOverlay);
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleEscape);
  };

  closeButton.addEventListener("click", closeModal);

  // Close on overlay click (outside modal)
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", handleEscape);
}

export const createLocationMarkerElement = (
  location,
  drawCable,
  setHoveredLocation,
  mapInstance,
  userInstance,
  turf,
  addJunctionBox
) => {
  const el = document.createElement("div");
  el.style.zIndex = "5";
  el.className =
    "w-10 h-10 flex items-center justify-center rounded-full shadow-lg border border-gray-300 bg-white hover:scale-110 transition-transform duration-200 cursor-pointer";

  const span = document.createElement("span");
  span.className = "text-xl";
  span.innerText = location.serviceType?.icon || "📍";
  el.appendChild(span);

  const popupDiv = document.createElement("div");
  popupDiv.className =
    "location-popup hidden absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white p-3 rounded shadow-lg border z-10 w-64";
  popupDiv.innerHTML = `
  <div class="max-w-xs bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
    <!-- Header with gradient background -->
    <div class="bg-gradient-to-r from-blue-600 to-purple-700 p-4 text-white">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h3 class="font-bold text-lg truncate">${
            location.serviceName?.name || "Unknown Service"
          }</h3>
          <div class="flex items-center mt-1">
            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A1 1 0 013 10V3a1 1 0 011-1h7a1 1 0 011 1v7z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm font-medium">${
              location.serviceType?.name || "Unknown Type"
            }</span>
          </div>
        </div>
        <div class="bg-white bg-opacity-20 rounded-full p-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Content Section -->
    <div class="p-4">
      <!-- Coordinates in elegant format -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="flex items-center text-xs text-gray-500 mb-1">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
            </svg>
            LATITUDE
          </div>
          <div class="font-mono text-sm font-semibold text-gray-800">
            ${location.coordinates?.latitude?.toFixed(6) || "N/A"}
          </div>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="flex items-center text-xs text-gray-500 mb-1">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
            </svg>
            LONGITUDE
          </div>
          <div class="font-mono text-sm font-semibold text-gray-800">
            ${location.coordinates?.longitude?.toFixed(6) || "N/A"}
          </div>
        </div>
      </div>

      <!-- Key Metrics -->
      <div class="space-y-3">
        <!-- Distance Card -->
        <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div class="flex items-center">
            <div class="bg-blue-100 p-2 rounded-lg mr-3">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
            <div>
              <div class="text-xs text-gray-500">DISTANCE FROM HUB</div>
              <div class="font-semibold text-gray-800">${
                location.distanceFromCentralHub || 0
              }m</div>
            </div>
          </div>
        </div>

        <!-- Notes Section (if available) -->
        ${
          location.notes
            ? `
          <div class="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <div class="flex items-start">
              <div class="bg-amber-100 p-2 rounded-lg mr-3 mt-0.5">
                <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </div>
              <div class="flex-1">
                <div class="text-xs text-amber-600 font-medium mb-1">NOTES</div>
                <div class="text-sm text-gray-700 leading-relaxed">${location.notes}</div>
              </div>
            </div>
          </div>
        `
            : ""
        }

        <!-- Timestamp -->
        <div class="flex items-center justify-between pt-2 border-t border-gray-100">
          <div class="flex items-center text-gray-500">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="text-xs">Last Updated</span>
          </div>
          <div class="text-xs text-gray-600 font-medium">
            ${new Date(location.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>

   
`;

  // 👉 Buttons container
  const btnContainer = document.createElement("div");
  btnContainer.className = "grid grid-cols-2 md:grid-cols-4 gap-2 mt-3";
  // 2 columns on mobile, 4 on medium+ screens

  const viewImages = document.createElement("button");
  viewImages.innerText = "View All Images";
  viewImages.className =
    "px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition";
  btnContainer.appendChild(viewImages);

  // Make Cable button
  const makeBtn = document.createElement("button");
  makeBtn.innerText = "Make Cable";
  makeBtn.className =
    "px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition";
  btnContainer.appendChild(makeBtn);
  // Add Junction Box button
  const jBoxBtn = document.createElement("button");
  jBoxBtn.innerHTML = `
  
  Add Junction Box
`;
  jBoxBtn.className =
    "py-1 bg-blue-600 text-white text-xs rounded flex items-center gap-1 hover:bg-blue-700 transition";
  btnContainer.appendChild(jBoxBtn);

  // Show Junction Box button
  // Show Junction Box button - Teal version
  const showJuncBoxBtn = document.createElement("button");
  showJuncBoxBtn.innerHTML = `
  Show Junction Box
`;
  showJuncBoxBtn.className =
    "py-1 text-center bg-teal-600 text-white text-xs rounded flex items-center gap-1 hover:bg-teal-700 transition";
  btnContainer.appendChild(showJuncBoxBtn);

  const closeJuncBoxBtn = document.createElement("button");
  closeJuncBoxBtn.innerHTML = `
  <svg class="w-3 h-3 mr-1 inline-block" fill="none" stroke="currentColor" stroke-width="2"
    viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 18L18 6M6 6l12 12"></path>
  </svg>
  Close Junction Box
`;
  closeJuncBoxBtn.className =
    "py-1 bg-gray-200 text-gray-700 text-xs rounded flex items-center gap-1 hover:bg-gray-300 transition";
  btnContainer.appendChild(closeJuncBoxBtn);

  // Save button (hidden initially)
  const saveBtn = document.createElement("button");
  saveBtn.innerText = "Save";
  saveBtn.className =
    "px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition hidden";
  btnContainer.appendChild(saveBtn);

  // Cancel button (hidden initially)
  const cancelBtn = document.createElement("button");
  cancelBtn.innerText = "Cancel";
  cancelBtn.className =
    "px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition hidden";
  btnContainer.appendChild(cancelBtn);

  // Cancel button (hidden initially)
  const cancelBoxBtn = document.createElement("button");
  cancelBoxBtn.innerText = "Cancel Adding Junctions";
  cancelBoxBtn.className =
    "py-1 bg-red-500 hidden text-white text-xs rounded hover:bg-red-600 transition hidden";
  btnContainer.appendChild(cancelBoxBtn);

  popupDiv.appendChild(btnContainer);
  el.appendChild(popupDiv);

  // 🧠 Handlers
  let cancelHandler = null;
  let saveHandler = null;
  let boxCancelHandler = null;

  // Add click event to the button
  viewImages.addEventListener("click", function () {
    // Get the images from your location object
    const images = [];
    if (location.image) images.push(location.image);
    if (location.image2) images.push(location.image2);

    if (images.length === 0) {
      alert("No images available");
      return;
    }

    createImageModal(images);
  });

  makeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    drawCable(
      location,
      (cancelCb) => (cancelHandler = cancelCb),
      (saveCb) => (saveHandler = saveCb),
      mapInstance,
      userInstance,
      turf
    );

    makeBtn.classList.add("hidden");
    saveBtn.classList.remove("hidden");
    cancelBtn.classList.remove("hidden");
  });

  jBoxBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    addJunctionBox(
      location,
      (cancelCb) => (boxCancelHandler = cancelCb),
      mapInstance,
      userInstance
    );

    jBoxBtn.classList.add("hidden");
    makeBtn.classList.add("hidden");
    showJuncBoxBtn.classList.add("hidden");
    cancelBoxBtn.classList.remove("hidden");
  });

  let junctionBoxes = []; // must contain actual Marker instances

  // SHOW
  showJuncBoxBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    // Clear old markers
    junctionBoxes.forEach((m) => m.remove());

    // Render markers
    junctionBoxes = renderJunctionBoxMarkers([location], mapInstance);

    // UI toggle
    jBoxBtn.classList.add("hidden");
    makeBtn.classList.add("hidden");
    cancelBoxBtn.classList.add("hidden");
    showJuncBoxBtn.classList.add("hidden");
    closeJuncBoxBtn.classList.remove("hidden");
  });

  document.addEventListener("junction-deleted", (e) => {
    const updatedLocation = e.detail?.location;
    const deletedId = e.detail?.junctionBoxId;

    if (!updatedLocation || !deletedId) return;

    // 1️⃣ Find the marker that matches the deleted junction box
    const targetMarker = junctionBoxes.find((m) => m._junctionId === deletedId);

    // 2️⃣ Remove only that marker
    if (targetMarker) {
      console.log("The tarketMarker (deletedId in Markers) : ", targetMarker);
      targetMarker.remove();
      console.log("Removed marker:", targetMarker);
    }

    // 3️⃣ Filter it out from array
    junctionBoxes = junctionBoxes.filter((m) => m._junctionId !== deletedId);
    closeJuncBoxBtn.classList.remove("hidden");
  });

  // CLOSE
  closeJuncBoxBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    // Remove all markers
    junctionBoxes.forEach((m) => m.remove());
    junctionBoxes = [];

    // Restore UI
    closeJuncBoxBtn.classList.add("hidden");
    jBoxBtn.classList.remove("hidden");
    makeBtn.classList.remove("hidden");
    showJuncBoxBtn.classList.remove("hidden");
  });

  // --- INITIAL CHECK ---
  if (location.junctionBoxes && location.junctionBoxes.length > 0) {
    closeJuncBoxBtn.classList.remove("hidden");
  } else {
    closeJuncBoxBtn.classList.add("hidden");
  }

  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    cancelHandler?.();
    makeBtn.classList.remove("hidden");
    saveBtn.classList.add("hidden");
    cancelBtn.classList.add("hidden");
  });

  saveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    saveHandler?.();
    makeBtn.classList.remove("hidden");
    saveBtn.classList.add("hidden");
    cancelBtn.classList.add("hidden");
  });

  cancelBoxBtn.addEventListener("click", async (e) => {
    e.stopPropagation();

    const res = await Swal.fire({
      title: "Cancel Creation of Junction Box?",
      text: "Are you sure you want to cancel you may lost everything you added now?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Cancel",
      cancelButtonText: "No",
    });

    if (res.isConfirmed) {
      // Run the supplied callback
      boxCancelHandler?.();

      // Reset buttons
      makeBtn.classList.remove("hidden");
      jBoxBtn.classList.remove("hidden");
      showJuncBoxBtn.classList.remove("hidden");
      cancelBoxBtn.classList.add("hidden");
    }
  });

  // ✅ Only show/hide on click
  el.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent map click from interfering

    const isHidden = popupDiv.classList.contains("hidden");
    document
      .querySelectorAll(".location-popup")
      .forEach((p) => p.classList.add("hidden")); // close others

    if (isHidden) {
      popupDiv.classList.remove("hidden");
      setHoveredLocation(location);
    } else {
      popupDiv.classList.add("hidden");
      setHoveredLocation(null);
    }
  });

  return el;
};

export const createJunctionBoxMarker = (junction, mapInstance, location) => {
  const { coordinates, notes, image, createdAt } = junction;
  const { map, olaMaps } = mapInstance;

  // Enhanced Marker Element
  const el = document.createElement("div");
  el.className =
    "w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 border-2 border-amber-700 shadow-lg cursor-pointer hover:scale-110 transition-all duration-200";
  el.title = "Junction Box ⚡";

  // Enhanced icon
  const span = document.createElement("span");
  span.className = "text-sm font-bold text-white drop-shadow-md";
  span.innerText = "⚡";
  el.appendChild(span);

  // Enhanced Popup Design - Non-transparent
  const popupDiv = document.createElement("div");
  popupDiv.className =
    "junction-popup hidden absolute bg-white rounded-xl shadow-xl border border-gray-300 z-50 w-80";

  popupDiv.innerHTML = `
    <!-- Header -->
    <div class="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-white rounded-t-xl">
      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <div class="bg-white/20 p-1.5 rounded-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-base">Junction Box</h3>
            <p class="text-amber-100 text-xs">Electrical Connection Point</p>
          </div>
        </div>
        <button class="close-popup text-white/90 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Content Section -->
    <div class="p-4 space-y-3">
      <!-- Coordinates -->
      <div class="space-y-2">
        <div class="flex items-center text-xs text-gray-600 font-medium">
          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
          </svg>
          COORDINATES
        </div>
        <div class="flex space-x-2">
          <div class="flex-1 bg-gray-50 rounded-lg p-2 border border-gray-200">
            <div class="text-xs text-gray-500 mb-1">Latitude</div>
            <div class="font-mono text-sm font-semibold text-gray-800">
              ${coordinates.latitude.toFixed(6)}
            </div>
          </div>
          <div class="flex-1 bg-gray-50 rounded-lg p-2 border border-gray-200">
            <div class="text-xs text-gray-500 mb-1">Longitude</div>
            <div class="font-mono text-sm font-semibold text-gray-800">
              ${coordinates.longitude.toFixed(6)}
            </div>
          </div>
        </div>
      </div>

      <!-- Notes Section -->
      ${
        notes
          ? `
        <div class="space-y-2">
          <div class="flex items-center text-xs text-gray-600 font-medium">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            NOTES
          </div>
          <div class="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <p class="text-sm text-gray-700">${notes}</p>
          </div>
        </div>
      `
          : ""
      }

      <!-- Timestamp -->
      <div class="flex items-center justify-between pt-2 border-t border-gray-200">
        <div class="flex items-center text-gray-500 text-xs">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Created
        </div>
        <div class="text-xs text-gray-600 font-medium">
          ${new Date(createdAt).toLocaleDateString()} • ${new Date(
    createdAt
  ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-2 pt-2">
        ${
          image
            ? `
          <button class="view-image-btn flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span>View Image</span>
          </button>
        `
            : '<div class="flex-1"></div>'
        }
        <button class="delete-junction-btn flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          <span>Delete</span>
        </button>
      </div>
    </div>
  `;

  // Add to DOM
  document.body.appendChild(popupDiv);

  let popupOpen = false;

  //-- CLICK HANDLER
  el.addEventListener("click", (e) => {
    e.stopPropagation();

    if (!popupOpen) {
      const screenPos = map.project([
        junction.coordinates.longitude,
        junction.coordinates.latitude,
      ]);

      popupDiv.style.left = `${screenPos.x}px`;
      popupDiv.style.top = `${screenPos.y}px`;
      popupDiv.style.transform = "translate(-55px, -220px)";

      popupDiv.classList.remove("hidden");
      popupOpen = true;
    } else {
      popupDiv.classList.add("hidden");
      popupOpen = false;
    }
  });

  // Close popup button
  popupDiv.querySelector(".close-popup").addEventListener("click", (e) => {
    e.stopPropagation();
    popupDiv.classList.add("hidden");
    popupOpen = false;
  });

  // View Image button
  if (image) {
    popupDiv.querySelector(".view-image-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      createImageModal([image]);
    });
  }

  // Delete button
  popupDiv
    .querySelector(".delete-junction-btn")
    .addEventListener("click", async (e) => {
      e.stopPropagation();

      const result = await Swal.fire({
        title: "Delete Junction Box?",
        text: "This action cannot be undone!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        const event = new CustomEvent("delete-junction-box", {
          detail: { junctionBox: junction, locationId: location._id },
        });
        // markers.forEach((m) => m.remove());
        window.dispatchEvent(event);
        popupDiv.classList.add("hidden");
        popupOpen = false;
      }
    });

  // Create Mapbox marker
  const marker = olaMaps
    .addMarker({ element: el, anchor: "center" })
    .setLngLat([coordinates.longitude, coordinates.latitude])
    .addTo(map);
  marker._junctionId = junction._id;
  return marker;
};

export const createSubHubMarker = (hub, mapInstance) => {
  const { coordinates, notes, image, createdAt, name } = hub;
  const { map, olaMaps } = mapInstance;

  // Marker element (different design)
  const el = document.createElement("div");
  el.className =
    "w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 border-2 border-teal-700 shadow-lg cursor-pointer hover:scale-110 transition-all duration-200";
  el.title = "Sub-Hub 📡";

  // ICON
  const span = document.createElement("span");
  span.className = "text-sm font-bold text-white drop-shadow-md";
  span.innerText = "📡";
  el.appendChild(span);

  // Popup container
  const popupDiv = document.createElement("div");
  popupDiv.className =
    "subhub-popup hidden absolute bg-white rounded-xl shadow-xl border border-gray-300 z-50 w-80";

  popupDiv.innerHTML = `
    <!-- Header -->
    <div class="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-white rounded-t-xl">
      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <div class="bg-white/20 p-1.5 rounded-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8c-1.1 0-2 .9-2 2v5h4v-5c0-1.1-.9-2-2-2zM12 3a9 9 0 100 18 9 9 0 000-18z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-base">Sub-Hub</h3>
            <p class="text-teal-100 text-xs">Connection Distribution Point</p>
          </div>
        </div>
        <button class="close-popup text-white/90 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Content Section -->
    <div class="p-4 space-y-3">

      <!-- Coordinates -->
      <div class="space-y-2">
        <div class="flex items-center text-xs text-gray-600 font-medium">
          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clip-rule="evenodd"/>
          </svg>
          COORDINATES
        </div>

        <div class="flex space-x-2">
          <div class="flex-1 bg-gray-50 rounded-lg p-2 border border-gray-200">
            <div class="text-xs text-gray-500 mb-1">Latitude</div>
            <div class="font-mono text-sm font-semibold text-gray-800">
              ${coordinates.latitude.toFixed(6)}
            </div>
          </div>

          <div class="flex-1 bg-gray-50 rounded-lg p-2 border border-gray-200">
            <div class="text-xs text-gray-500 mb-1">Longitude</div>
            <div class="font-mono text-sm font-semibold text-gray-800">
              ${coordinates.longitude.toFixed(6)}
            </div>
          </div>
        </div>
      </div>

      <!-- Hub Name -->
      ${
        name
          ? `
        <div class="space-y-2">
          <div class="flex items-center text-xs text-gray-600 font-medium">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 7h.01M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm4 14h10M7 3v4M17 3v4" />
            </svg>
            HUB NAME
          </div>
          <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p class="text-sm text-gray-700">${name}</p>
          </div>
        </div>`
          : ""
      }
      
      <!-- Notes -->
      ${
        notes
          ? `
      <div class="space-y-2">
        <div class="flex items-center text-xs text-gray-600 font-medium">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          NOTES
        </div>
        <div class="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
          <p class="text-sm text-gray-700">${notes}</p>
        </div>
      </div>`
          : ""
      }

      <!-- Timestamp -->
      <div class="flex items-center justify-between pt-2 border-t border-gray-200">
        <div class="flex items-center text-gray-500 text-xs">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Created
        </div>
        <div class="text-xs text-gray-600 font-medium">
          ${new Date(createdAt).toLocaleDateString()} • ${new Date(
    createdAt
  ).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}
        </div>
      </div>

      <!-- Buttons -->
      <div class="flex space-x-2 pt-2">
        ${
          image
            ? `
        <button class="view-image-btn flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span>View Image</span>
        </button>`
            : '<div class="flex-1"></div>'
        }

        <button class="delete-subhub-btn flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          <span>Delete</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(popupDiv);

  let popupOpen = false;

  // Marker click
  el.addEventListener("click", (e) => {
    e.stopPropagation();

    if (!popupOpen) {
      const screenPos = map.project([
        coordinates.longitude,
        coordinates.latitude,
      ]);

      popupDiv.style.left = `${screenPos.x}px`;
      popupDiv.style.top = `${screenPos.y}px`;
      popupDiv.style.transform = "translate(-55px, -220px)";

      popupDiv.classList.remove("hidden");
      popupOpen = true;
    } else {
      popupDiv.classList.add("hidden");
      popupOpen = false;
    }
  });

  // Close popup
  popupDiv.querySelector(".close-popup").addEventListener("click", () => {
    popupDiv.classList.add("hidden");
    popupOpen = false;
  });

  // View image
  if (image) {
    popupDiv.querySelector(".view-image-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      createImageModal([image]);
    });
  }

  // Delete Sub-Hub
  popupDiv
    .querySelector(".delete-subhub-btn")
    .addEventListener("click", async (e) => {
      e.stopPropagation();

      const result = await Swal.fire({
        title: "Delete Sub-Hub?",
        text: "This action cannot be undone!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      });

      if (result.isConfirmed) {
        const event = new CustomEvent("delete-subhub", {
          detail: { hub },
        });

        window.dispatchEvent(event);
        popupDiv.classList.add("hidden");
        popupOpen = false;
      }
    });

  // Final: add marker to map
  const marker = olaMaps
    .addMarker({ element: el, anchor: "center" })
    .setLngLat([coordinates.longitude, coordinates.latitude])
    .addTo(map);

  marker._hubId = hub._id;

  return marker;
};

export const createMarker = (cls) => {
  // ✅ Marker 1
  const m = document.createElement("div");
  m.className = `${cls}`;
  m.style.width = "30px";
  m.style.height = "30px";
  m.style.borderRadius = "50%";
  m.style.background = "#22c55e";
  m.style.border = "2px solid white";
  m.style.display = "flex";
  m.style.alignItems = "center";
  m.style.justifyContent = "center";
  m.style.color = "white";
  m.style.fontSize = "18px";
  m.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
  m.style.cursor = "pointer";
  m.textContent = "✓";
  return m;
};

export const popupDesign = (id) => {
  return `
    <div style="padding:6px;font-size:14px;">
      Hello from <b>Ola Maps</b> 👋  
      <br/><br/>

      <button id="accept-btn" data-id="${id}" style="
        padding:6px 10px;
        background:#22c55e;
        color:white;
        border:none;
        border-radius:4px;
        cursor:pointer;
        margin-right:6px;">
        Accept
      </button>

      <button id="cancel-btn" data-id="${id}" style="
        padding:6px 10px;
        background:#f87171;
        color:white;
        border:none;
        border-radius:4px;
        cursor:pointer;">
        Cancel
      </button>
    </div>
  `;
};
