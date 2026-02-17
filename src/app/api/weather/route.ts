import { NextResponse } from "next/server";
import { getWeatherData } from "@/lib/weather/weather-service";
import { buildSevereWeatherAlerts } from "@/lib/weather/severe-alerts";

// Hualien City coordinates
const HUALIEN_LAT = 23.99;
const HUALIEN_LON = 121.60;

export async function GET() {
  try {
    const { data, fallbackUsed, providerErrors } = await getWeatherData({
      latitude: HUALIEN_LAT,
      longitude: HUALIEN_LON,
      timezone: "Asia/Taipei",
      forecastDays: 7,
      historyDays: 3,
    });

    const alerts = buildSevereWeatherAlerts({
      current: {
        temperatureC: data.current.temperatureC,
        humidityPercent: data.current.humidityPercent,
        windSpeedKmh: data.current.windSpeedKmh,
        uvIndex: data.current.uvIndex,
      },
      forecastRainMm: data.forecast.map((day) => day.precipitationMm),
    });

    return NextResponse.json({
      current: {
        temperature_2m: data.current.temperatureC,
        relative_humidity_2m: data.current.humidityPercent,
        precipitation: data.current.precipitationMm,
        rain: data.current.rainMm,
        wind_speed_10m: data.current.windSpeedKmh,
        wind_direction_10m: data.current.windDirectionDeg,
        weather_code: data.current.weatherCode,
        apparent_temperature: data.current.apparentTemperatureC,
        uv_index: data.current.uvIndex,
      },
      daily: {
        time: data.forecast.map((day) => day.date),
        temperature_2m_max: data.forecast.map((day) => day.tempMaxC),
        temperature_2m_min: data.forecast.map((day) => day.tempMinC),
        precipitation_sum: data.forecast.map((day) => day.precipitationMm),
        rain_sum: data.forecast.map((day) => day.rainMm),
        uv_index_max: data.forecast.map((day) => day.uvIndexMax),
        weather_code: data.forecast.map((day) => day.weatherCode),
        wind_speed_10m_max: data.forecast.map((day) => day.windSpeedMaxKmh),
        sunrise: data.forecast.map((day) => day.sunrise),
        sunset: data.forecast.map((day) => day.sunset),
      },
      history: {
        time: data.history.map((day) => day.date),
        temperature_2m_max: data.history.map((day) => day.tempMaxC),
        temperature_2m_min: data.history.map((day) => day.tempMinC),
        precipitation_sum: data.history.map((day) => day.precipitationMm),
        rain_sum: data.history.map((day) => day.rainMm),
        uv_index_max: data.history.map((day) => day.uvIndexMax),
        weather_code: data.history.map((day) => day.weatherCode),
        wind_speed_10m_max: data.history.map((day) => day.windSpeedMaxKmh),
        sunrise: data.history.map((day) => day.sunrise),
        sunset: data.history.map((day) => day.sunset),
      },
      meta: {
        source: data.source,
        fetchedAt: data.fetchedAt,
        fallbackUsed,
        providerErrors,
      },
      alerts,
    });
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "無法取得天氣資料" },
      { status: 500 }
    );
  }
}
