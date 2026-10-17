
import axios from "axios";

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const weatherClient = axios.create({
  baseURL: "https://api.openweathermap.org/data/2.5",
  timeout: 10000,
});

const geoClient = axios.create({
  baseURL: "https://api.openweathermap.org/geo/1.0",
  timeout: 10000,
});

// Handle API errors in one place
function handleApiError(error) {
  if (error.response) {
    const status = error.response.status;

    if (status === 401) {
      throw new Error(
        "Invalid API key. Check your OpenWeatherMap API key."
      );
    }

    if (status === 404) {
      throw new Error(
        "Location not found. Try another city name."
      );
    }

    if (status === 429) {
      throw new Error(
        "Too many requests. Please wait and try again."
      );
    }

    throw new Error(
      error.response.data?.message ||
        "Unable to retrieve weather information."
    );
  }

  if (error.code === "ECONNABORTED") {
    throw new Error(
      "Request timed out. Please check your internet connection."
    );
  }

  throw new Error(
    error.message || "Network error. Please try again."
  );
}

// Check API key
function checkApiKey() {
  if (!API_KEY) {
    throw new Error(
      "OpenWeatherMap API key is missing. Check your .env file."
    );
  }
}

// Get worldwide location suggestions while typing
export async function getCitySuggestions(query) {
  const searchText = query.trim();

  if (searchText.length < 2) {
    return [];
  }

  checkApiKey();

  try {
    const response = await geoClient.get("/direct", {
      params: {
        q: searchText,
        limit: 5,
        appid: API_KEY,
      },
    });

    const uniqueLocations = new Map();

    response.data.forEach((place) => {
      const location = {
        name: place.name || "",
        state: place.state || "",
        country: place.country || "",
        lat: place.lat,
        lon: place.lon,
      };

      const key = [
        location.name.toLowerCase(),
        location.state.toLowerCase(),
        location.country.toLowerCase(),
        location.lat,
        location.lon,
      ].join("-");

      uniqueLocations.set(key, {
        ...location,
        label: [
          location.name,
          location.state,
          location.country,
        ]
          .filter(Boolean)
          .join(", "),
      });
    });

    return Array.from(uniqueLocations.values());
  } catch (error) {
    handleApiError(error);
  }
}

// Get coordinates for a city name
export async function getCityCoordinates(city) {
  checkApiKey();

  try {
    const response = await geoClient.get("/direct", {
      params: {
        q: city.trim(),
        limit: 1,
        appid: API_KEY,
      },
    });

    if (!response.data.length) {
      throw new Error(
        "Location not found. Please enter a valid city name."
      );
    }

    const place = response.data[0];

    return {
      name: place.name,
      state: place.state || "",
      country: place.country || "",
      lat: place.lat,
      lon: place.lon,
    };
  } catch (error) {
    if (error instanceof Error && !error.response) {
      throw error;
    }

    handleApiError(error);
  }
}

// Get current weather using a city name or coordinates
export async function getCurrentWeather(location) {
  checkApiKey();

  try {
    let coordinates;

    if (
      typeof location === "object" &&
      location !== null &&
      typeof location.lat === "number" &&
      typeof location.lon === "number"
    ) {
      coordinates = {
        lat: location.lat,
        lon: location.lon,
      };
    } else {
      coordinates = await getCityCoordinates(
        String(location || "")
      );
    }

    const response = await weatherClient.get("/weather", {
      params: {
        lat: coordinates.lat,
        lon: coordinates.lon,
        appid: API_KEY,
        units: "metric",
      },
    });

    const data = response.data;

    return {
      city: data.name,
      country: data.sys?.country || "",
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      condition: data.weather?.[0]?.description || "Unknown",
      humidity: data.main.humidity,
      wind: Math.round((data.wind?.speed || 0) * 3.6),
      pressure: data.main.pressure,
      visibility:
        typeof data.visibility === "number"
          ? Number((data.visibility / 1000).toFixed(1))
          : null,
      rain: data.rain?.["1h"] || data.rain?.["3h"] || 0,
      high: Math.round(data.main.temp_max),
      low: Math.round(data.main.temp_min),
      icon: data.weather?.[0]?.icon || "01d",
      latitude: data.coord.lat,
      longitude: data.coord.lon,
      updatedAt: new Date(data.dt * 1000),
    };
  } catch (error) {
    handleApiError(error);
  }
}

// Get the upcoming weather forecast
export async function getWeatherForecast(location) {
  checkApiKey();

  try {
    let coordinates;

    if (
      typeof location === "object" &&
      location !== null &&
      typeof location.lat === "number" &&
      typeof location.lon === "number"
    ) {
      coordinates = {
        lat: location.lat,
        lon: location.lon,
      };
    } else {
      coordinates = await getCityCoordinates(
        String(location || "")
      );
    }

    const response = await weatherClient.get("/forecast", {
      params: {
        lat: coordinates.lat,
        lon: coordinates.lon,
        appid: API_KEY,
        units: "metric",
        cnt: 8,
      },
    });

    return response.data.list.map((item) => ({
      time: new Date(item.dt * 1000).toLocaleTimeString(
        "en-US",
        {
          hour: "numeric",
          hour12: true,
        }
      ),
      temp: Math.round(item.main.temp),
      condition: item.weather?.[0]?.description || "Unknown",
      icon: item.weather?.[0]?.icon || "01d",
      rain: item.pop || 0,
      humidity: item.main.humidity,
      wind: Math.round((item.wind?.speed || 0) * 3.6),
      pressure: item.main.pressure,
      timestamp: item.dt,
    }));
  } catch (error) {
    handleApiError(error);
  }
}
