import { NextResponse } from "next/server";
import { getWeatherData } from "@/lib/weather/weather-service";
import { buildSevereWeatherAlerts } from "@/lib/weather/severe-alerts";
import { calculateDataConfidence } from "@/lib/weather/data-confidence";

// Hualien City coordinates
const HUALIEN_LAT = 23.99;
const HUALIEN_LON = 121.60;

export async function GET() {
  try {
    const weatherPromise = getWeatherData({
      latitude: HUALIEN_LAT,
      longitude: HUALIEN_LON,
      timezone: "Asia/Taipei",
      forecastDays: 7,
      historyDays: 3,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new DOMException("Weather request timed out", "TimeoutError")), 10_000)
    );

    const { data, fallbackUsed, providerErrors } = await Promise.race([
      weatherPromise,
      timeoutPromise,
    ]);

    const alerts = buildSevereWeatherAlerts({
      current: {
        temperatureC: data.current.temperatureC,
        humidityPercent: data.current.humidityPercent,
        windSpeedKmh: data.current.windSpeedKmh,
        uvIndex: data.current.uvIndex,
      },
      forecastRainMm: data.forecast.map((day) => day.precipitationMm),
    });

    const confidence = calculateDataConfidence({
      fetchedAt: data.fetchedAt,
      source: data.source,
      fallbackUsed,
      providerErrors,
      forecastPoints: data.forecast.length,
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
        confidence,
      },
      alerts,
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    console.error("Weather API error:", error);
    return NextResponse.json(
      {
        error: isTimeout ? "天氣服務逾時，請稍後再試" : "無法取得天氣資料",
        code: isTimeout ? "TIMEOUT" : "FETCH_FAILED",
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
