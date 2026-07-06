export const API_ERROR_MESSAGES = {
  400: "Bad request. Please check your search parameters.",
  401: "Authentication failed. Please check your API key.",
  403: "Access forbidden. Check your API permissions.",
  404: "Location or resource not found.",
  429: "Rate limit exceeded. Please try again later.",
  500: "Internal server error. Please try again later.",
  502: "Bad gateway. Please try again later.",
  503: "Service unavailable. Please try again later.",
  network: "Network error. Please check your internet connection and try again.",
};

export function getApiErrorMessage(status) {
  if (API_ERROR_MESSAGES[status]) {
    return API_ERROR_MESSAGES[status];
  }
  if (status >= 500) {
    return "Server error. Please try again later.";
  } else if (status >= 400) {
    return `Client error (${status}). Please check your request.`;
  } else {
    return `Unexpected error (${status}).`;
  }
}