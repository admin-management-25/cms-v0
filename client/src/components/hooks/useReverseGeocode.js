import { useState } from "react";

export function useReverseGeocode() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addresses, setAddresses] = useState([]);

  const reverseGeocode = async (lat, lng) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=dxEuToWnHB5W4e4lcqiFwu2RwKA64Ixi0BFR73kQ`
      );

      const data = await response.json();

      if (data.status !== "ok") {
        throw new Error(data.error_message || "Failed to fetch address.");
      }

      const structured = data.results.map((item) => ({
        name: item.name,
        address: item.formatted_address,
        location: item.geometry?.location,
        components: item.address_components,
      }));

      setAddresses(structured);
      return structured;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, addresses, reverseGeocode };
}
