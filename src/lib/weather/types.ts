export interface WeatherQuery {
  latitude: number;
  longitude: number;
  timezone: string;
  forecastDays: number;
  historyDays: number;
}

export interface NormalizedWeatherCurrent {
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  precipitationMm: number;
  rainMm: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  weatherCode: number;
  uvIndex: number;
}

export interface NormalizedWeatherDay {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationMm: number;
  rainMm: number;
  uvIndexMax: number;
  weatherCode: number;
  windSpeedMaxKmh: number;
  sunrise: string | null;
  sunset: string | null;
}

export interface NormalizedWeatherData {
  source: string;
  fetchedAt: string;
  current: NormalizedWeatherCurrent;
  forecast: NormalizedWeatherDay[];
  history: NormalizedWeatherDay[];
}

export interface WeatherProvider {
  source: string;
  fetchWeather: (query: WeatherQuery) => Promise<NormalizedWeatherData>;
}

