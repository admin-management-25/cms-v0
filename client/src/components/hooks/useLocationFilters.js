// hooks/useLocationFilters.js
import { useMemo } from "react";
import * as turf from "@turf/turf";

export const useLocationFilters = (locations, filters, areas = []) => {
  return useMemo(() => {
    if (!locations || locations.length === 0) return [];

    let filtered = [...locations];

    // Search filter
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

    // Service filter
    if (filters.service?.length > 0) {
      filtered = filtered.filter((location) =>
        filters.service.includes(location.serviceName?._id)
      );
    }

    // Service Type filter
    if (filters.serviceType?.length > 0) {
      filtered = filtered.filter((location) =>
        filters.serviceType.includes(location.serviceType?._id)
      );
    }

    // ✅ NEW - Area filter with polygon geometry check
    if (filters.areas?.length > 0) {
      // Get selected areas
      const selectedAreas = areas.filter((area) =>
        filters.areas.includes(area._id)
      );

      filtered = filtered.filter((location) => {
        // Create point from location coordinates
        const locationPoint = turf.point([
          location.coordinates.longitude,
          location.coordinates.latitude,
        ]);

        // Check if location is within ANY of the selected areas
        return selectedAreas.some((area) => {
          // If area has a polygon, check if point is inside
          if (area.polygon && area.polygon.coordinates) {
            try {
              const polygon = turf.polygon([area.polygon.coordinates]);
              return turf.booleanPointInPolygon(locationPoint, polygon);
            } catch (error) {
              console.error(
                `Error checking polygon for area ${area._id}:`,
                error
              );
              return false;
            }
          }

          // If no polygon, check distance from area center (fallback)
          const areaPoint = turf.point([
            area.coordinates.longitude,
            area.coordinates.latitude,
          ]);

          // Use radius if available, otherwise default to 500m
          const radius = area.polygon?.radius || 500;
          const distance = turf.distance(locationPoint, areaPoint, {
            units: "meters",
          });

          return distance <= radius;
        });
      });
    }

    // Distance Range filter
    if (filters.distanceRange?.length > 0) {
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

    // Sorting
    if (filters.sortBy?.length > 0) {
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
          if (filters.sortOrder?.includes("desc")) {
            return aValue < bValue ? 1 : -1;
          }
          return aValue > bValue ? 1 : -1;
        });
      });
    }

    return filtered;
  }, [locations, filters, areas]);
};
