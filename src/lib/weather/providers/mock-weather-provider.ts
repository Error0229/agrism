import type { NormalizedWeatherData, NormalizedWeatherDay, WeatherProvider, WeatherQuery } from "@/lib/weather/types";

const ISO_DAY = 24 * 60 * 60 * 1000;

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function buildDay(baseDate: Date, dayOffset: number): NormalizedWeatherDay {
  const date = new Date(baseDate.getTime() + dayOffset * ISO_DAY);
  const absolute = Math.abs(dayOffset);

  return {
    date: formatDate(date),
    tempMaxC: 28 + (dayOffset % 3),
    tempMinC: 21 + (dayOffset % 2),
    precipitationMm: dayOffset % 4 === 0 ? 8 : absolute % 2 === 0 ? 2 : 0,
    rainMm: dayOffset % 4 === 0 ? 6 : absolute % 2 === 0 ? 1 : 0,
    uvIndexMax: 6 + (absolute % 3),
    weatherCode: dayOffset % 4 === 0 ? 61 : dayOffset % 2 === 0 ? 2 : 1,
    windSpeedMaxKmh: 14 + (absolute % 6),
    sunrise: `${formatDate(date)}T06:10`,
    sunset: `${formatDate(date)}T17:35`,
  };
}

export const mockWeatherProvider: WeatherProvider = {
  source: "mock-weather",
  async fetchWeather(query: WeatherQuery): Promise<NormalizedWeatherData> {
    const now = new Date();
    const history = Array.from({ length: query.historyDays }, (_, i) => buildDay(now, -(query.historyDays - i)));
    const forecast = Array.from({ length: query.forecastDays }, (_, i) => buildDay(now, i));

    return {
      source: "mock-weather",
      fetchedAt: now.toISOString(),
      current: {
        temperatureC: 27,
        apparentTemperatureC: 30,
        humidityPercent: 76,
        precipitationMm: 0.4,
        rainMm: 0.2,
        windSpeedKmh: 16,
        windDirectionDeg: 120,
        weatherCode: 2,
        uvIndex: 6,
      },
      history,
      forecast,
    };
  },
};

