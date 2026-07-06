import { TA_PROXY_URL, X_DH2642_Group, X_DH2642_Key, TRIPADVISOR_API_KEY } from "./apiConfig";
import { getApiErrorMessage } from "./apiErrorMessages";


function taFetch(path, params = {}) {
  const url = TA_PROXY_URL + path + "?" + new URLSearchParams({
    key: TRIPADVISOR_API_KEY,
    language: "en",
    ...params,
  });
  const retryCount = 3;
  const retryDelay = 4000;

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function executeFetch(attempt = 0) {
    try {
      const rsp = await fetch(url, {
        headers: {
          "X-DH2642-Group": X_DH2642_Group,
          "X-DH2642-Key":   X_DH2642_Key,
        }
      });

      if (!rsp.ok) {
        const shouldRetry = rsp.status >= 500 || rsp.status === 429;
        if (attempt < retryCount && shouldRetry) {
          await wait(retryDelay * (attempt + 1));
          return executeFetch(attempt + 1);
        }
        if (!shouldRetry) {
          throw new Error(getApiErrorMessage(rsp.status));
        }
        return null;
      }
      return rsp.json();
    } catch (error) {
      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      if (attempt < retryCount) {
        await wait(retryDelay * (attempt + 1));
        return executeFetch(attempt + 1);
      }
      throw new Error(getApiErrorMessage('network'));
    }
  }
  return executeFetch();
}

export function searchNearbyAttractions(lat, lng, radius = 10, radiusUnit = "km") {
  return taFetch("/location/search", {
    searchQuery: "attractions",
    category:    "attractions",
    latLong:     `${lat},${lng}`,
    radius,
    radiusUnit,
  }).then(json => (json?.data || []).slice(0, 10));
}
window.searchNearbyAttractions = searchNearbyAttractions;

export function searchLocations(query, category = "") {
  const params = { searchQuery: query };
  if (category) params.category = category;
  return taFetch("/location/search", params)
    .then(json => (json?.data || []).filter(item => /^\d{6}$/.test(item.location_id)).slice(0, 8));
}

export function getLocationDetails(locationId) {
  return taFetch(`/location/${locationId}/details`, { currency: "USD" });
}

export function getLocationPhotos(locationId, limit = 5) {
  return taFetch(`/location/${locationId}/photos`, { limit })
    .then(json => json?.data || [])
    .catch(() => []);
}

export function getLocationReviews(locationId, limit = 5) {
  return taFetch(`/location/${locationId}/reviews`, { limit })
    .then(json => json?.data || []);
}
