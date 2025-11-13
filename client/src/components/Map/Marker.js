import Swal from "sweetalert2";

export const createLocationMarkerElement = (
  location,
  drawCable,
  setHoveredLocation,
  mapInstance,
  userInstance,
  turf
) => {
  const el = document.createElement("div");
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

  // 👉 Buttons container
  const btnContainer = document.createElement("div");
  btnContainer.className = "flex gap-2 mt-3";

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

  popupDiv.appendChild(btnContainer);
  el.appendChild(popupDiv);

  // 🧠 Handlers
  let cancelHandler = null;
  let saveHandler = null;

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
