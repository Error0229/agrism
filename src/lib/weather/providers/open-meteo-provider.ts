import type {
  NormalizedWeatherCurrent,
  NormalizedWeatherData,
  NormalizedWeatherDay,
  WeatherProvider,
  WeatherQuery,
} from "@/lib/weather/types";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    rain: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    weather_code: number;
    uv_index: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    rain_sum: number[];
    uv_index_max: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapCurrent(current: OpenMeteoResponse["current"]): NormalizedWeatherCurrent {
  return {
    temperatureC: asNumber(current.temperature_2m),
    apparentTemperatureC: asNumber(current.apparent_temperature),
    humidityPercent: asNumber(current.relative_humidity_2m),
    precipitationMm: asNumber(current.precipitation),
    rainMm: asNumber(current.rain),
    windSpeedKmh: asNumber(current.wind_speed_10m),
    windDirectionDeg: asNumber(current.wind_direction_10m),
    weatherCode: asNumber(current.weather_code),
    uvIndex: asNumber(current.uv_index),
  };
}

function mapDailyDay(daily: OpenMeteoResponse["daily"], index: number): NormalizedWeatherDay {
  return {
    date: String(daily.time[index] ?? ""),
    tempMaxC: asNumber(daily.temperature_2m_max[index]),
    tempMinC: asNumber(daily.temperature_2m_min[index]),
    precipitationMm: asNumber(daily.precipitation_sum[index]),
    rainMm: asNumber(daily.rain_sum[index]),
    uvIndexMax: asNumber(daily.uv_index_max[index]),
    weatherCode: asNumber(daily.weather_code[index]),
    windSpeedMaxKmh: asNumber(daily.wind_speed_10m_max[index]),
    sunrise: daily.sunrise[index] ?? null,
    sunset: daily.sunset[index] ?? null,
  };
}

function mapDaily(daily: OpenMeteoResponse["daily"]) {
  return daily.time.map((_, index) => mapDailyDay(daily, index)).filter((item) => item.date);
}

export const openMeteoProvider: WeatherProvider = {
  source: "open-meteo",
  async fetchWeather(query: WeatherQuery): Promise<NormalizedWeatherData> {
    const params = new URLSearchParams({
      latitude: String(query.latitude),
      longitude: String(query.longitude),
      timezone: query.timezone,
      forecast_days: String(query.forecastDays),
      past_days: String(query.historyDays),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "precipitation",
        "rain",
        "wind_speed_10m",
        "wind_direction_10m",
        "weather_code",
        "apparent_temperature",
        "uv_index",
      ].join(","),
      daily: [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "rain_sum",
        "uv_index_max",
        "weather_code",
        "wind_speed_10m_max",
        "sunrise",
        "sunset",
      ].join(","),
    });

    const response = await fetch(`${OPEN_METEO_URL}?${params}`, {
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const json = (await response.json()) as OpenMeteoResponse;
    const allDays = mapDaily(json.daily);
    const historyCount = Math.max(0, Math.min(query.historyDays, allDays.length));

    return {
      source: "open-meteo",
      fetchedAt: new Date().toISOString(),
      current: mapCurrent(json.current),
      history: allDays.slice(0, historyCount),
      forecast: allDays.slice(historyCount),
    };
  },
};

