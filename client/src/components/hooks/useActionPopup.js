import { useState, useEffect } from "react";

export const useActionPopup = (map) => {
  const [showActionPopup, setShowActionPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [clickedCoordinates, setClickedCoordinates] = useState(null);

  // Update popup position when map moves/zooms
  useEffect(() => {
    if (!map || !showActionPopup || !clickedCoordinates) return;

    const updatePopupPosition = () => {
      const canvas = map.getCanvas();
      const rect = canvas.getBoundingClientRect();

      // Project the lng/lat to screen coordinates
      const point = map.project([
        clickedCoordinates.longitude,
        clickedCoordinates.latitude,
      ]);

      setPopupPosition({
        x: point.x + rect.left,
        y: point.y + rect.top,
      });
    };

    // Update position on map move/zoom
    map.on("move", updatePopupPosition);
    map.on("zoom", updatePopupPosition);

    return () => {
      map.off("move", updatePopupPosition);
      map.off("zoom", updatePopupPosition);
    };
  }, [map, showActionPopup, clickedCoordinates]);

  const openPopup = (coordinates, screenPosition) => {
    setClickedCoordinates(coordinates);
    setPopupPosition(screenPosition);
    setShowActionPopup(true);
  };

  const closePopup = () => {
    setShowActionPopup(false);
  };

  return {
    showActionPopup,
    popupPosition,
    clickedCoordinates,
    openPopup,
    closePopup,
  };
};
