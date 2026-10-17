
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bike,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Compass,
  Droplets,
  Dumbbell,
  Eye,
  Footprints,
  Gauge,
  Lightbulb,
  LoaderCircle,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Trees,
  Umbrella,
  Wind,
  X,
} from "lucide-react";

import {
  getCitySuggestions,
  getCurrentWeather,
  getWeatherForecast,
} from "./services/weatherService";

import "./App.css";

const DEFAULT_CITY = "Chennai";

const NAV_ITEMS = [
  { label: "Overview", icon: Activity, id: "overview" },
  { label: "Forecast", icon: CloudSun, id: "forecast" },
  { label: "Weather alerts", icon: ShieldCheck, id: "alerts" },
  { label: "Smart insights", icon: Sparkles, id: "insights" },
];

/* =====================================================
   WEATHER HELPERS
   ===================================================== */

function getWeatherType(condition = "") {
  const value = String(condition).toLowerCase();

  if (/thunder|storm/.test(value)) return "storm";
  if (/snow|sleet|blizzard/.test(value)) return "snow";
  if (/rain|drizzle|shower/.test(value)) return "rain";

  if (/cloud|overcast|mist|fog|haze/.test(value)) {
    return "cloudy";
  }

  if (/clear|sun/.test(value)) return "sunny";

  return "cloudy";
}

function WeatherIcon({ condition = "", size = 28 }) {
  const type = getWeatherType(condition);
  const props = {
    size,
    strokeWidth: 1.7,
    "aria-hidden": true,
  };

  if (type === "storm") return <CloudLightning {...props} />;
  if (type === "snow") return <CloudSnow {...props} />;
  if (type === "rain") return <CloudRain {...props} />;
  if (type === "cloudy") return <Cloud {...props} />;

  return <Sun {...props} />;
}

function WeatherIllustration({ condition = "" }) {
  const type = getWeatherType(condition);

  return (
    <div
      className={`h-weather-illustration weather-${type}`}
      role="img"
      aria-label={`Weather: ${condition}`}
    >
      {(type === "sunny" || type === "cloudy") && (
        <div className="h-sun-glow" />
      )}

      {(type === "sunny" || type === "cloudy") && (
        <div className="h-sun-disc" />
      )}

      {["cloudy", "rain", "storm", "snow"].includes(type) && (
        <div className="h-cloud-disc" />
      )}

      {["rain", "storm", "snow"].includes(type) && (
        <div className="h-rain-drops" />
      )}
    </div>
  );
}

function SectionHeading({ eyebrow, title, note, icon: Icon }) {
  return (
    <div className="h-section-heading">
      <div>
        {eyebrow && <span className="h-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>

      {Icon && (
        <div className="h-today-icon">
          <Icon size={25} strokeWidth={1.7} />
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, description }) {
  return (
    <article className="h-metric-card">
      <div className="h-metric-top">
        <div className="h-metric-icon">
          <Icon size={21} strokeWidth={1.7} />
        </div>
      </div>

      <p className="h-metric-label">{label}</p>
      <p className="h-metric-value">{value}</p>

      {description && (
        <p className="h-metric-description">{description}</p>
      )}
    </article>
  );
}

function formatDate() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function formatTime(value) {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatForecastTime(item) {
  if (item.timestamp) {
    return new Date(item.timestamp * 1000).toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        hour12: true,
      }
    );
  }

  return item.time || "--";
}

function safeNumber(value, suffix = "") {
  const number = Number(value);

  return Number.isFinite(number)
    ? `${number}${suffix}`
    : "--";
}

/* =====================================================
   SMART ACTIVITY PLANNER
   ===================================================== */

const ACTIVITY_CONFIG = [
  {
    id: "walking",
    title: "Walking",
    icon: Footprints,
    duration: "20–30 min",
    description: "Take a refreshing walk outdoors.",
  },
  {
    id: "jogging",
    title: "Jogging",
    icon: Activity,
    duration: "15–25 min",
    description: "Go for a light or moderate run.",
  },
  {
    id: "cycling",
    title: "Cycling",
    icon: Bike,
    duration: "20–40 min",
    description: "Enjoy a ride when conditions permit.",
  },
  {
    id: "workout",
    title: "Outdoor workout",
    icon: Dumbbell,
    duration: "15–30 min",
    description: "Try stretching or bodyweight exercise.",
  },
  {
    id: "picnic",
    title: "Picnic",
    icon: Trees,
    duration: "45–90 min",
    description: "Relax and spend time outdoors.",
  },
  {
    id: "driving",
    title: "Driving",
    icon: CarFront,
    duration: "Before departure",
    description: "Review weather before your journey.",
  },
];

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getActivityWeather(weather, forecast) {
  const temp = Number(weather?.temperature);
  const feelsLike = Number(weather?.feelsLike);
  const humidity = Number(weather?.humidity);
  const wind = Number(weather?.wind);
  const visibility = Number(weather?.visibility);
  const condition = String(weather?.condition || "").toLowerCase();

  const effectiveTemp = Number.isFinite(feelsLike) ? feelsLike : temp;

  const stormCondition = /thunder|storm/.test(condition);
  const rainCondition = /rain|drizzle|shower/.test(condition);
  const snowCondition = /snow|sleet|blizzard|freezing/.test(condition);
  const fogCondition = /fog|mist/.test(condition);
  const hot = effectiveTemp >= 35;
  const extremeHeat = effectiveTemp >= 40;

  const forecastItems = (Array.isArray(forecast) ? forecast : [])
    .map((item) => {
      const itemCondition = String(item.condition || "").toLowerCase();
      const rainFraction = Number(item.rain);

      const probability = Number.isFinite(rainFraction)
        ? Math.max(0, Math.min(100, rainFraction * 100))
        : /rain|drizzle|shower|snow|thunder|storm/.test(itemCondition)
          ? 70
          : 0;

      const forecastWind = Number(item.wind);
      const forecastTemp = Number(item.temp);
      const forecastStorm = /thunder|storm/.test(itemCondition);

      let score = 100;

      if (probability >= 70) score -= 40;
      else if (probability >= 40) score -= 22;
      else if (probability >= 20) score -= 10;

      if (Number.isFinite(forecastWind) && forecastWind >= 35) {
        score -= 30;
      } else if (Number.isFinite(forecastWind) && forecastWind >= 20) {
        score -= 12;
      }

      if (forecastTemp >= 40) score -= 35;
      else if (forecastTemp >= 35) score -= 20;
      else if (forecastTemp <= 5) score -= 15;

      if (forecastStorm) score = Math.min(score, 10);

      return {
        ...item,
        temp: forecastTemp,
        probability,
        score: clampScore(score),
        storm: forecastStorm,
        label: item.timestamp
          ? new Date(item.timestamp * 1000).toLocaleTimeString(
              "en-IN",
              { hour: "numeric", minute: "2-digit" }
            )
          : item.time || "Upcoming period",
      };
    })
    .filter((item) => Number.isFinite(item.temp));

  const bestForecast = forecastItems
    .filter((item) => !item.storm)
    .sort((a, b) => b.score - a.score)[0] || null;

  function evaluateActivity(id) {
    const isDriving = id === "driving";
    const reasons = [];
    const tips = [];
    let score = 100;

    if (Number.isFinite(effectiveTemp)) {
      if (effectiveTemp >= 40) {
        score -= isDriving ? 10 : 45;
        reasons.push("Extreme heat");
        tips.push(
          isDriving
            ? "Check vehicle condition and road reports."
            : "Avoid strenuous outdoor activity in extreme heat."
        );
      } else if (effectiveTemp >= 35) {
        score -= isDriving ? 0 : 25;
        reasons.push("High feels-like temperature");
        tips.push("Choose a cooler time and drink water.");
      } else if (effectiveTemp >= 30) {
        score -= isDriving ? 0 : 10;
        reasons.push("Warm conditions");
        tips.push("Stay hydrated and avoid overexertion.");
      } else if (effectiveTemp <= 5) {
        score -= isDriving ? 5 : 20;
        reasons.push("Cold conditions");
        tips.push("Wear suitable layers.");
      }
    }

    if (Number.isFinite(humidity) && humidity >= 85) {
      score -= isDriving ? 0 : 10;
      reasons.push("High humidity");
      tips.push("Reduce exercise intensity if needed.");
    }

    if (Number.isFinite(wind) && wind >= 35) {
      score -= id === "cycling" ? 30 : 15;
      reasons.push("Strong wind");
      tips.push(
        id === "cycling"
          ? "Strong wind can make cycling harder to control."
          : "Take care in exposed or windy areas."
      );
    } else if (Number.isFinite(wind) && wind >= 20) {
      score -= id === "cycling" ? 15 : 5;
      reasons.push("Breezy conditions");
    }

    if (Number.isFinite(visibility) && visibility < 2) {
      score -= isDriving ? 55 : 25;
      reasons.push("Very poor visibility");
      tips.push(
        isDriving
          ? "Consider delaying travel until visibility improves."
          : "Choose a safer location with better visibility."
      );
    } else if (Number.isFinite(visibility) && visibility < 5) {
      score -= isDriving ? 25 : 10;
      reasons.push("Reduced visibility");
    }

    if (rainCondition) {
      score -= isDriving ? 20 : id === "picnic" ? 55 : 35;
      reasons.push("Rain reported");
      tips.push(
        isDriving
          ? "Allow extra distance and drive cautiously on wet roads."
          : "Rain can make outdoor surfaces slippery."
      );
    }

    if (snowCondition) {
      score -= isDriving ? 45 : 50;
      reasons.push("Snow or icy-weather condition");
      tips.push("Check local warnings and surface conditions.");
    }

    if (fogCondition) {
      score -= isDriving ? 50 : 20;
      reasons.push("Fog or mist reported");
      tips.push(
        isDriving
          ? "Reduce speed and use appropriate vehicle lights."
          : "Choose a safer, more visible location."
      );
    }

    if (stormCondition) {
      score = Math.min(score, 10);
      reasons.push("Thunderstorm reported");
      tips.push("Avoid outdoor activity during thunderstorms.");
    }

    if (id === "picnic" && !rainCondition && !stormCondition) {
      tips.push("Bring water and sun protection if needed.");
    }

    if (id === "cycling" && !rainCondition && !stormCondition) {
      tips.push("Wear a helmet and use visible lights.");
    }

    if (id === "jogging" && !hot && !rainCondition && !stormCondition) {
      tips.push("Start at a comfortable pace.");
    }

    if (id === "workout" && !hot && !rainCondition && !stormCondition) {
      tips.push("Warm up before starting.");
    }

    if (isDriving) {
      tips.push("Check official road and weather updates before departure.");
    }

    if (reasons.length === 0) {
      reasons.push("No major issue detected in available weather data");
    }

    if (tips.length === 0) {
      tips.push("Recheck changing conditions before heading out.");
    }

    score = clampScore(score);

    let status;

    if (stormCondition || (extremeHeat && !isDriving)) {
      status = "Not recommended";
    } else if (score >= 75) {
      status = isDriving ? "Conditions look clearer" : "Good conditions";
    } else if (score >= 45) {
      status = "Use caution";
    } else {
      status = "Consider an alternative";
    }

    return {
      ...ACTIVITY_CONFIG.find((activity) => activity.id === id),
      score,
      status,
      reasons,
      tip: tips[0],
    };
  }

  return {
    activities: ACTIVITY_CONFIG.map((activity) =>
      evaluateActivity(activity.id)
    ),
    bestForecast,
    current: {
      temp,
      feelsLike,
      humidity,
      wind,
      visibility,
      condition,
      rainCondition,
      stormCondition,
      snowCondition,
      fogCondition,
      hot,
      extremeHeat,
    },
  };
}

/* =====================================================
   MAIN APP
   ===================================================== */

function App() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [cityInput, setCityInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const requestIdRef = useRef(0);
  const searchRef = useRef(null);
  const suggestionTimerRef = useRef(null);
  const skipAutocompleteRef = useRef(false);

  const loadWeather = useCallback(async (location) => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError("");
    setShowSuggestions(false);
    setSuggestions([]);

    try {
      const [current, upcoming] = await Promise.all([
        getCurrentWeather(location),
        getWeatherForecast(location),
      ]);

      if (requestId !== requestIdRef.current) return;

      setWeather(current);
      setForecast(Array.isArray(upcoming) ? upcoming : []);

      skipAutocompleteRef.current = true;
      setCityInput(current.city || DEFAULT_CITY);

      setSelectedCity(
        typeof location === "object" && location !== null
          ? location
          : null
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      setError(
        err?.message ||
          "Unable to load weather. Check your connection and try again."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadWeather(DEFAULT_CITY);

    return () => {
      requestIdRef.current += 1;

      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
    };
  }, [loadWeather]);

  /* CITY AUTOCOMPLETE */

  useEffect(() => {
    if (skipAutocompleteRef.current) {
      skipAutocompleteRef.current = false;
      return;
    }

    const query = cityInput.trim();

    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current);
    }

    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    if (
      selectedCity &&
      (
        selectedCity.name?.toLowerCase() === query.toLowerCase() ||
        selectedCity.label?.toLowerCase() === query.toLowerCase()
      )
    ) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestionTimerRef.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        const results = await getCitySuggestions(query);
        setSuggestions(Array.isArray(results) ? results : []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
    };
  }, [cityInput, selectedCity]);

  /* CLOSE SEARCH SUGGESTIONS ON OUTSIDE CLICK */

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /* NAVIGATION */

  const selectLocation = (place) => {
    if (!place) return;

    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current);
    }

    skipAutocompleteRef.current = true;
    setCityInput(place.name || place.label || "");
    setSelectedCity(place);
    setSuggestions([]);
    setShowSuggestions(false);

    loadWeather(place);
  };

  const submitSearch = (event) => {
    event.preventDefault();

    const query = cityInput.trim();

    if (!query) {
      setError("Enter a city name to search for weather.");
      return;
    }

    const exactMatch = suggestions.find(
      (place) =>
        place.name?.toLowerCase() === query.toLowerCase() ||
        place.label?.toLowerCase() === query.toLowerCase()
    );

    if (exactMatch) {
      selectLocation(exactMatch);
      return;
    }

    if (
      selectedCity &&
      (
        selectedCity.name?.toLowerCase() === query.toLowerCase() ||
        selectedCity.label?.toLowerCase() === query.toLowerCase()
      )
    ) {
      loadWeather(selectedCity);
      return;
    }

    setSelectedCity(null);
    loadWeather(query);
  };

  const clearSearch = () => {
    setCityInput("");
    setSelectedCity(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setError("");
    searchRef.current?.querySelector("input")?.focus();
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    setSidebarOpen(false);

    if (id === "overview") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /*
   * SIDEBAR ACTIVE STATE FIX:
   * Keep the selected navigation item synchronized with scrolling.
   * This ensures Smart insights stays highlighted when you reach
   * the activity planner by scrolling instead of clicking.
   */

  useEffect(() => {
    const sectionIds = ["overview", "forecast", "alerts", "insights"];

    let ticking = false;

    const updateActiveSection = () => {
      const scrollPosition = window.scrollY + 180;
      let currentSection = "overview";

      for (const id of sectionIds) {
        const section = document.getElementById(id);

        if (section && section.offsetTop <= scrollPosition) {
          currentSection = id;
        }
      }

      setActiveSection((previous) =>
        previous === currentSection ? previous : currentSection
      );

      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateActiveSection);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    updateActiveSection();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  /* CURRENT WEATHER VALUES */

  const condition = weather?.condition || "Weather";
  const visualType = getWeatherType(condition);

  const temperature = Number(weather?.temperature);
  const feelsLike = Number(weather?.feelsLike);
  const humidity = Number(weather?.humidity);
  const wind = Number(weather?.wind);
  const pressure = Number(weather?.pressure);
  const visibility = Number(weather?.visibility);
  const rain = Number(weather?.rain);

  const high = Number.isFinite(Number(weather?.high))
    ? Math.round(Number(weather.high))
    : null;

  const low = Number.isFinite(Number(weather?.low))
    ? Math.round(Number(weather.low))
    : null;

  /* WEATHER ALERTS */

  const alerts = [];

  if (Number.isFinite(temperature) && temperature >= 38) {
    alerts.push({
      type: "danger",
      title: "High temperature",
      description:
        "Stay hydrated, seek shade, and limit strenuous outdoor activities during the hottest hours.",
      icon: Sun,
      tag: "Heat advisory",
    });
  }

  if (visualType === "storm") {
    alerts.push({
      type: "danger",
      title: "Thunderstorm conditions",
      description:
        "Consider staying indoors and avoid exposed outdoor areas during thunderstorms.",
      icon: CloudLightning,
      tag: "Be cautious",
    });
  }

  if (visualType === "rain") {
    alerts.push({
      type: "warning",
      title: "Rain reported",
      description:
        "Carry an umbrella and allow extra travel time in wet conditions.",
      icon: CloudRain,
      tag: "Wet weather",
    });
  }

  if (Number.isFinite(wind) && wind >= 35) {
    alerts.push({
      type: "warning",
      title: "Strong winds",
      description:
        "Be careful around trees, temporary structures, and exposed areas.",
      icon: Wind,
      tag: "Wind advisory",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: "success",
      title: "No basic weather warning triggered",
      description:
        "No warning rule in this dashboard was triggered by the available current conditions.",
      icon: CheckCircle2,
      tag: "All clear",
    });
  }

  return (
    <div className="h-app">
      {sidebarOpen && (
        <button
          className="h-mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}

      <aside className={`h-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="h-brand">
          <div className="h-brand-mark">
            <Sun size={24} />
          </div>

          <div className="h-brand-copy">
            <span className="h-brand-name">ATMOS.</span>
            <span className="h-brand-caption">
              Weather Intelligence
            </span>
          </div>
        </div>

        <p className="h-nav-label">Workspace</p>

        <nav className="h-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ label, icon: Icon, id }) => (
            <button
              key={id}
              type="button"
              className={`h-nav-item ${
                activeSection === id ? "active" : ""
              }`}
              onClick={() => scrollToSection(id)}
              aria-current={activeSection === id ? "location" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="h-sidebar-bottom">
          <div className="h-sidebar-note">
            <div className="h-sidebar-note-icon">
              <Lightbulb size={21} />
            </div>
            <h3>A little weather wisdom</h3>
            <p>
              Plan your day with a clearer picture of the weather
              around you.
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="h-main">
        <div className="h-content">
          <header className="h-topbar">
            <button
              type="button"
              className="h-menu-button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>

            <div className="h-topbar-left">
              <p className="h-topbar-date">Workspace</p>
              <h2 className="h-topbar-title">Overview</h2>
            </div>

            <div className="h-topbar-right">
              <span className="h-current-location">
                <span className="h-current-badge-dot" />
                Live weather
              </span>

              <div className="h-topbar-date">
                <CalendarDays size={16} />
                <span>{formatDate()}</span>
              </div>
            </div>
          </header>

          {/* OVERVIEW */}

          <section className="h-welcome" id="overview">
            <div className="h-welcome-copy">
              <span className="h-eyebrow">
                Your personal weather station
              </span>
              <h1>Weather, in a new light.</h1>
              <p>
                A clearer view of today. A smarter way to plan
                tomorrow.
              </p>
            </div>
          </section>

          {/* CITY SEARCH */}

          <section
            className="h-search"
            ref={searchRef}
            aria-label="Search for a city"
          >
            <form
              className="h-search-form"
              onSubmit={submitSearch}
              autoComplete="off"
            >
              <div className="h-search-icon">
                <Search size={29} />
              </div>

              <input
                className="h-search-input"
                type="text"
                name="city"
                placeholder="Search city, town or location..."
                value={cityInput}
                onChange={(event) => {
                  setCityInput(event.target.value);
                  setSelectedCity(null);
                  setError("");
                }}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                aria-label="City name"
                aria-expanded={showSuggestions}
                aria-controls="h-city-suggestions"
                role="combobox"
              />

              {cityInput && (
                <button
                  className="h-search-clear"
                  type="button"
                  aria-label="Clear search"
                  onClick={clearSearch}
                >
                  <X size={21} />
                </button>
              )}

              <button
                className="h-search-button"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Explore"}
              </button>
            </form>

            {showSuggestions && (
              <div
                className="h-search-suggestions"
                id="h-city-suggestions"
                role="listbox"
              >
                {isSearching && (
                  <div className="h-search-empty">
                    <LoaderCircle size={17} />
                    Finding locations...
                  </div>
                )}

                {!isSearching &&
                  suggestions.map((place, index) => (
                    <button
                      type="button"
                      key={`${place.lat}-${place.lon}-${index}`}
                      className="h-search-suggestion"
                      role="option"
                      aria-selected={false}
                      onClick={() => selectLocation(place)}
                    >
                      <span className="h-search-suggestion-icon">
                        <MapPin size={19} />
                      </span>

                      <span className="h-search-suggestion-text">
                        <span className="h-search-suggestion-name">
                          {place.name}
                        </span>
                        <span className="h-search-suggestion-location">
                          {[place.state, place.country]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </span>

                      <ChevronRight
                        size={17}
                        className="h-search-suggestion-arrow"
                      />
                    </button>
                  ))}

                {!isSearching &&
                  suggestions.length === 0 &&
                  cityInput.trim().length >= 2 && (
                    <div className="h-search-empty">
                      No matching locations found.
                    </div>
                  )}
              </div>
            )}
          </section>

          {error && (
            <div className="h-error" role="alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {isLoading && !weather && (
            <div className="h-loading">
              <span className="h-spinner" />
              Loading weather conditions...
            </div>
          )}

          {weather && (
            <>
              {/* CURRENT CONDITIONS */}

              <section className="h-weather-layout">
                <article className="h-current-card">
                  <div className="h-current-top">
                    <div>
                      <div className="h-current-location">
                        <MapPin size={17} />
                        <span>
                          {weather.city}
                          {weather.latitude != null &&
                            weather.longitude != null &&
                            `, ${Number(weather.latitude).toFixed(2)}° · ${Number(weather.longitude).toFixed(2)}°`}
                        </span>
                      </div>

                      {weather.country && (
                        <p className="h-current-country">
                          {weather.country}
                        </p>
                      )}
                    </div>

                    <span className="h-current-badge">
                      <span className="h-current-badge-dot" />
                      Current
                    </span>
                  </div>

                  <div className="h-current-body">
                    <div className="h-temperature-block">
                      <span className="h-eyebrow">
                        The atmosphere right now
                      </span>

                      <h2 className="h-current-temperature">
                        {safeNumber(Math.round(temperature), "°")}
                      </h2>

                      <p className="h-current-condition">{condition}</p>

                      <p className="h-current-feels">
                        Feels like {safeNumber(Math.round(feelsLike), "°C")}
                      </p>
                    </div>

                    <WeatherIllustration condition={condition} />
                  </div>

                  <div className="h-current-footer">
                    <div className="h-current-footer-item">
                      <div className="h-current-footer-icon">
                        <ArrowUp size={18} />
                      </div>
                      <div className="h-current-footer-copy">
                        <span className="h-current-footer-label">High</span>
                        <span className="h-current-footer-value">
                          {high !== null ? `${high}°` : "--"}
                        </span>
                      </div>
                    </div>

                    <div className="h-current-footer-item">
                      <div className="h-current-footer-icon">
                        <ArrowDown size={18} />
                      </div>
                      <div className="h-current-footer-copy">
                        <span className="h-current-footer-label">Low</span>
                        <span className="h-current-footer-value">
                          {low !== null ? `${low}°` : "--"}
                        </span>
                      </div>
                    </div>

                    <div className="h-current-footer-item">
                      <div className="h-current-footer-icon">
                        <RefreshCw size={16} />
                      </div>
                      <div className="h-current-footer-copy">
                        <span className="h-current-footer-label">
                          Live observation
                        </span>
                        <span className="h-current-footer-value">
                          Updated {formatTime(weather.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="h-today-card">
                  <div className="h-today-heading">
                    <div>
                      <span className="h-eyebrow">At a glance</span>
                      <h2>Today's conditions</h2>
                    </div>
                    <div className="h-today-icon">
                      <WeatherIcon condition={condition} size={29} />
                    </div>
                  </div>

                  <div className="h-today-row">
                    <span className="h-today-row-label">Feels like</span>
                    <span className="h-today-row-value">
                      {safeNumber(Math.round(feelsLike), "°C")}
                    </span>
                  </div>

                  <div className="h-today-row">
                    <span className="h-today-row-label">Humidity</span>
                    <span className="h-today-row-value">
                      {safeNumber(humidity, "%")}
                    </span>
                  </div>

                  <div className="h-today-row">
                    <span className="h-today-row-label">Wind</span>
                    <span className="h-today-row-value">
                      {safeNumber(wind, " km/h")}
                    </span>
                  </div>

                  <div className="h-today-row">
                    <span className="h-today-row-label">Visibility</span>
                    <span className="h-today-row-value">
                      {Number.isFinite(visibility)
                        ? `${visibility} km`
                        : "--"}
                    </span>
                  </div>
                </article>
              </section>

              {/* WEATHER METRICS */}

              <section className="h-section" id="conditions">
                <SectionHeading
                  eyebrow="Weather details"
                  title="The little things that matter"
                  note="Useful measurements for your day."
                />

                <div className="h-metrics-grid">
                  <MetricCard
                    icon={Thermometer}
                    label="Feels like"
                    value={safeNumber(Math.round(feelsLike), "°C")}
                    description="Perceived temperature"
                  />

                  <MetricCard
                    icon={Droplets}
                    label="Humidity"
                    value={safeNumber(humidity, "%")}
                    description="Moisture in the air"
                  />

                  <MetricCard
                    icon={Wind}
                    label="Wind speed"
                    value={safeNumber(wind, " km/h")}
                    description="Current wind conditions"
                  />

                  <MetricCard
                    icon={Eye}
                    label="Visibility"
                    value={
                      Number.isFinite(visibility)
                        ? `${visibility} km`
                        : "--"
                    }
                    description="Reported viewing distance"
                  />

                  <MetricCard
                    icon={Gauge}
                    label="Pressure"
                    value={safeNumber(pressure, " hPa")}
                    description="Atmospheric pressure"
                  />

                  <MetricCard
                    icon={Umbrella}
                    label="Rain"
                    value={safeNumber(rain, " mm")}
                    description="Reported precipitation"
                  />

                  <MetricCard
                    icon={Sunrise}
                    label="Today's high"
                    value={high !== null ? `${high}°C` : "--"}
                    description="Forecast high temperature"
                  />

                  <MetricCard
                    icon={Sunset}
                    label="Today's low"
                    value={low !== null ? `${low}°C` : "--"}
                    description="Forecast low temperature"
                  />
                </div>
              </section>

              {/* HOURLY FORECAST */}

              <section className="h-section" id="forecast">
                <SectionHeading
                  eyebrow="Coming up"
                  title="Hourly forecast"
                  note="See how conditions change through the forecast."
                />

                <div className="h-forecast-panel">
                  <div className="h-forecast-header">
                    <div>
                      <h2>Over the next few hours</h2>
                      <p>Forecast information for {weather.city}.</p>
                    </div>
                    <span className="h-forecast-label">Forecast</span>
                  </div>

                  {forecast.length > 0 ? (
                    <div className="h-forecast-list">
                      {forecast.slice(0, 6).map((item, index) => (
                        <article
                          className="h-forecast-item"
                          key={`${item.timestamp || item.time}-${index}`}
                        >
                          <span className="h-forecast-time">
                            {formatForecastTime(item)}
                          </span>

                          <div className="h-forecast-icon">
                            <WeatherIcon condition={item.condition} size={28} />
                          </div>

                          <p className="h-forecast-temp">
                            {safeNumber(Math.round(Number(item.temp)), "°")}
                          </p>

                          <span className="h-forecast-rain">
                            <Droplets size={12} />
                            {Number.isFinite(Number(item.rain))
                              ? `${Math.round(Number(item.rain) * 100)}%`
                              : "--"}
                          </span>

                          <p className="h-forecast-condition">
                            {item.condition || "Conditions"}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="h-empty">
                      Hourly forecast data is not available.
                    </div>
                  )}
                </div>
              </section>

              {/* WEATHER ALERTS */}

              <section className="h-section" id="alerts">
                <SectionHeading
                  eyebrow="Stay prepared"
                  title="Weather alerts"
                  note="Basic observations based on current weather data."
                />

                <div className="h-alert-list">
                  {alerts.map((alert, index) => {
                    const Icon = alert.icon;

                    return (
                      <article
                        className={`h-alert-card ${alert.type}`}
                        key={`${alert.title}-${index}`}
                      >
                        <div className="h-alert-icon">
                          <Icon size={21} />
                        </div>

                        <div className="h-alert-content">
                          <h3 className="h-alert-title">{alert.title}</h3>
                          <p className="h-alert-description">
                            {alert.description}
                          </p>
                        </div>

                        <span className="h-alert-tag">{alert.tag}</span>
                      </article>
                    );
                  })}
                </div>

                <p className="h-metric-description">
                  These are app-generated observations, not official
                  emergency alerts. Check your local weather authority
                  for official warnings.
                </p>
              </section>

              {/* SMART ACTIVITY PLANNER */}

              {(() => {
                const planner = getActivityWeather(weather, forecast);

                const scoreColor = (score) => {
                  if (score >= 75) return "good";
                  if (score >= 45) return "caution";
                  return "poor";
                };

                const currentSummary = planner.current;

                return (
                  <section className="h-section" id="insights">
                    <div className="h-activity-heading">
                      <div>
                        <span className="h-eyebrow">
                          ATMOS intelligence
                        </span>
                        <h2>Smart activity planner</h2>
                        <p>
                          Discover activities that fit your weather
                          conditions.
                        </p>
                      </div>

                      <div className="h-activity-live">
                        <span className="h-current-badge-dot" />
                        Weather-based
                      </div>
                    </div>

                    <div className="h-activity-summary">
                      <div className="h-activity-summary-icon">
                        <Sparkles size={25} />
                      </div>

                      <div className="h-activity-summary-copy">
                        <span className="h-eyebrow">
                          Your day, decoded
                        </span>

                        <h3>
                          {currentSummary.stormCondition
                            ? "Prioritise safety today."
                            : currentSummary.extremeHeat
                              ? "Take it easy in the heat."
                              : currentSummary.rainCondition
                                ? "Plan around the rain."
                                : currentSummary.hot
                                  ? "Make hydration a priority."
                                  : "Make the most of your day."}
                        </h3>

                        <p>
                          {currentSummary.stormCondition
                            ? "Avoid outdoor activities during thunderstorms and check official local weather warnings."
                            : currentSummary.extremeHeat
                              ? "Avoid strenuous outdoor exercise in extreme heat. Consider an indoor alternative."
                              : currentSummary.rainCondition
                                ? "Wet conditions can affect walking, cycling and picnics. Check the forecast before leaving."
                                : currentSummary.hot
                                  ? "Choose a cooler time for exercise, drink water and take breaks."
                                  : "Compare activity scores and upcoming forecast periods before planning your day."}
                        </p>
                      </div>
                    </div>

                    <div className="h-activity-grid">
                      {planner.activities.map((activity) => {
                        const Icon = activity.icon;
                        const colorClass = scoreColor(activity.score);

                        return (
                          <article
                            className={`h-activity-card ${colorClass}`}
                            key={activity.id}
                          >
                            <div className="h-activity-card-top">
                              <div className="h-activity-icon">
                                <Icon size={25} strokeWidth={1.8} />
                              </div>

                              <span
                                className={`h-activity-status ${colorClass}`}
                              >
                                {activity.status}
                              </span>
                            </div>

                            <h3>{activity.title}</h3>

                            <p className="h-activity-description">
                              {activity.description}
                            </p>

                            <div className="h-activity-score-row">
                              <span>Suitability score</span>
                              <strong>{activity.score}/100</strong>
                            </div>

                            <div
                              className="h-activity-score-track"
                              role="progressbar"
                              aria-label={`${activity.title} suitability`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={activity.score}
                            >
                              <div
                                className={`h-activity-score-fill ${colorClass}`}
                                style={{
                                  width: `${activity.score}%`,
                                }}
                              />
                            </div>

                            <div className="h-activity-details">
                              <div className="h-activity-detail">
                                <Clock3 size={15} />
                                <span>{activity.duration}</span>
                              </div>

                              <div className="h-activity-detail">
                                <Thermometer size={15} />
                                <span>
                                  {Number.isFinite(currentSummary.feelsLike)
                                    ? `${Math.round(currentSummary.feelsLike)}°C feels like`
                                    : Number.isFinite(currentSummary.temp)
                                      ? `${Math.round(currentSummary.temp)}°C`
                                      : "Temperature unavailable"}
                                </span>
                              </div>
                            </div>

                            <div className="h-activity-reason">
                              <span className="h-activity-reason-label">
                                Weather assessment
                              </span>
                              <p>{activity.reasons.join(" · ")}</p>
                            </div>

                            <div className="h-activity-tip">
                              <Lightbulb size={17} />
                              <p>{activity.tip}</p>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className="h-best-time-card">
                      <div className="h-best-time-icon">
                        <Clock3 size={24} />
                      </div>

                      <div className="h-best-time-copy">
                        <span className="h-eyebrow">Plan ahead</span>
                        <h3>Compare upcoming forecast periods</h3>

                        {planner.bestForecast ? (
                          <p>
                            Among the available forecast periods,{" "}
                            <strong>{planner.bestForecast.label}</strong>{" "}
                            has a comparatively favourable weather score
                            of{" "}
                            <strong>
                              {planner.bestForecast.score}/100
                            </strong>
                            , with a reported precipitation probability
                            of{" "}
                            <strong>
                              {Math.round(
                                planner.bestForecast.probability
                              )}%
                            </strong>
                            . This estimate is not a guarantee of safe
                            conditions.
                          </p>
                        ) : (
                          <p>
                            More forecast data is needed to compare
                            upcoming periods. Check the hourly forecast
                            before planning outdoor activities.
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="h-activity-disclaimer">
                      Scores are heuristic estimates based on available
                      weather data, not official safety ratings.
                      Forecast data can be incomplete. For driving,
                      follow official warnings and current road
                      conditions.
                    </p>
                  </section>
                );
              })()}
            </>
          )}

          {/* FOOTER */}

          <footer className="h-footer">
            <p>
              ATMOS © {new Date().getFullYear()} · Made for the elements.
            </p>
            <span className="h-footer-brand">WEATHER INTELLIGENCE</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
