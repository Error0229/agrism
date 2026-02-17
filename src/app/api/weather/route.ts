import { NextResponse } from "next/server";

// Hualien City coordinates
const HUALIEN_LAT = 23.99;
const HUALIEN_LON = 121.60;

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function GET() {
  try {
    const params = new URLSearchParams({
      latitude: String(HUALIEN_LAT),
      longitude: String(HUALIEN_LON),
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
      timezone: "Asia/Taipei",
      forecast_days: "7",
    });

    const response = await fetch(`${OPEN_METEO_URL}?${params}`, {
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "無法取得天氣資料" },
      { status: 500 }
    );
  }
}
