
import { useMemo, useState } from "react";
import {
  Sparkles,
  Bike,
  Shirt,
  Footprints,
  CloudRain,
  Wind,
  Thermometer,
  ArrowUpRight,
} from "lucide-react";

const activities = [
  { id: "ride", label: "Bike commute", icon: Bike },
  { id: "laundry", label: "Dry clothes", icon: Shirt },
  { id: "outdoor", label: "Outdoor plans", icon: Footprints },
];

function getRecommendation(activity, weather) {
  const rain = Number(weather.rain);
  const wind = Number(weather.wind);
  const temp = Number(weather.temperature);

  if (activity === "laundry") {
    if (rain >= 45) {
      return {
        title: "Better to dry indoors",
        message:
          "The rain probability is high. Avoid leaving clothes exposed outside.",
        level: "caution",
      };
    }

    if (rain >= 20) {
      return {
        title: "Keep an eye on the sky",
        message:
          "There is some chance of rain. Check the hourly forecast before drying clothes.",
        level: "moderate",
      };
    }

    return {
      title: "A reasonable time to dry",
      message:
        "The rain probability is relatively low. Check local conditions before hanging clothes.",
      level: "good",
    };
  }

  if (activity === "ride") {
    if (rain >= 60 || wind >= 35) {
      return {
        title: "Take extra precautions",
        message:
          "Rain or strong wind may affect your ride. Check road conditions and consider delaying if unsafe.",
        level: "caution",
      };
    }

    if (rain >= 30 || wind >= 25 || temp >= 38) {
      return {
        title: "Plan your ride carefully",
        message:
          "Check the hourly forecast, carry rain protection when appropriate, and stay hydrated.",
        level: "moderate",
      };
    }

    return {
      title: "Conditions look manageable",
      message:
        "The selected weather factors look relatively favourable. Always check traffic and road conditions.",
      level: "good",
    };
  }

  if (rain >= 45 || wind >= 30 || temp >= 38) {
    return {
      title: "Consider an alternative",
      message:
        "Weather may affect outdoor comfort. Consider an indoor option or a different time.",
      level: "caution",
    };
  }

  if (rain >= 20 || wind >= 20 || temp >= 34) {
    return {
      title: "Stay flexible",
      message:
        "Your plans may be affected by changing conditions. Check the forecast again before leaving.",
      level: "moderate",
    };
  }

  return {
    title: "Looks good to plan",
    message:
      "The selected weather factors look relatively favourable for outdoor activities.",
    level: "good",
  };
}

function Weather({ weather }) {
  const [activity, setActivity] = useState("ride");

  const recommendation = useMemo(
    () => getRecommendation(activity, weather),
    [activity, weather]
  );

  return (
    <section className="decision-section" id="planner">
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE ATMOS SIGNATURE FEATURE</p>
          <h2>Your day, decoded.</h2>
        </div>
        <span className="decision-sparkle">
          <Sparkles size={20} />
        </span>
      </div>

      <div className="decision-layout">
        <div className="decision-left">
          <p className="decision-question">
            What are you planning to do?
          </p>
          <p className="decision-description">
            Choose an activity. ATMOS will interpret the available weather
            information and explain what to consider.
          </p>

          <div className="activity-options">
            {activities.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                className={`activity-option ${
                  activity === id ? "selected" : ""
                }`}
                onClick={() => setActivity(id)}
                aria-pressed={activity === id}
              >
                <span className="activity-icon">
                  <Icon size={19} />
                </span>
                <span>{label}</span>
                <span className="activity-arrow">
                  <ArrowUpRight size={16} />
                </span>
              </button>
            ))}
          </div>
        </div>

        <article
          className={`recommendation-card ${recommendation.level}`}
          aria-live="polite"
        >
          <div className="recommendation-top">
            <span className="recommendation-icon">
              {recommendation.level === "caution" ? (
                <CloudRain size={23} />
              ) : recommendation.level === "moderate" ? (
                <Wind size={23} />
              ) : (
                <Sparkles size={23} />
              )}
            </span>
            <span className="recommendation-tag">
              ATMOS RECOMMENDATION
            </span>
          </div>

          <h3>{recommendation.title}</h3>
          <p>{recommendation.message}</p>

          <div className="recommendation-reason">
            <Thermometer size={17} />
            <span>
              {Math.round(weather.temperature)}°C · {weather.rain}% rain
              probability · {weather.wind} km/h wind
            </span>
          </div>

          <span className="recommendation-disclaimer">
            Guidance based on selected weather factors, not a safety guarantee.
          </span>
        </article>
      </div>
    </section>
  );
}

export default Weather;
