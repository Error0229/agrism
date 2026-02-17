"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Thermometer,
  Droplets,
  Wind,
  Loader2,
  RefreshCw,
} from "lucide-react";

function getWeatherInfo(code: number): { label: string; icon: typeof Sun } {
  if (code === 0) return { label: "晴天", icon: Sun };
  if (code <= 3) return { label: "多雲", icon: Cloud };
  if (code <= 49) return { label: "霧", icon: CloudFog };
  if (code <= 59) return { label: "毛毛雨", icon: CloudRain };
  if (code <= 69) return { label: "下雨", icon: CloudRain };
  if (code <= 79) return { label: "下雪", icon: CloudSnow };
  if (code <= 84) return { label: "陣雨", icon: CloudRain };
  if (code <= 94) return { label: "雷雨", icon: CloudLightning };
  return { label: "暴風雨", icon: CloudLightning };
}

interface WeatherCurrent {
  temperature_2m: number;
  relative_humidity_2m: number;
  precipitation: number;
  wind_speed_10m: number;
  weather_code: number;
  apparent_temperature: number;
  uv_index: number;
}

interface WeatherDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weather_code: number[];
  precipitation_sum: number[];
}

interface WeatherMeta {
  source?: string;
  confidence?: {
    confidenceScore: number;
    confidenceLevel: "low" | "medium" | "high";
    freshnessLabel: "fresh" | "stale" | "expired";
  };
}

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

export function WeatherWidget() {
  const [current, setCurrent] = useState<WeatherCurrent | null>(null);
  const [daily, setDaily] = useState<WeatherDaily | null>(null);
  const [meta, setMeta] = useState<WeatherMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/weather");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.error) throw new Error();
      setCurrent(data.current);
      setDaily(data.daily);
      setMeta(data.meta ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  if (loading && !current) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          載入天氣...
        </CardContent>
      </Card>
    );
  }

  if (error || !current) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">天氣資料暫時無法取得</p>
          <Button variant="outline" size="sm" onClick={fetchWeather}>
            <RefreshCw className="size-3 mr-1" />重試
          </Button>
        </CardContent>
      </Card>
    );
  }

  const info = getWeatherInfo(current.weather_code);
  const Icon = info.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">花蓮即時天氣</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href="/farm-management?tab=weather">詳細天氣 →</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <Icon className="size-10 text-amber-500 mx-auto" />
            <p className="text-xs mt-1">{info.label}</p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <Thermometer className="size-3.5 text-red-500" />
              <span className="text-lg font-bold">{current.temperature_2m}°C</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="size-3.5 text-blue-500" />
              <span className="text-sm">{current.relative_humidity_2m}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CloudRain className="size-3.5 text-blue-400" />
              <span className="text-sm">{current.precipitation}mm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind className="size-3.5 text-gray-500" />
              <span className="text-sm">{current.wind_speed_10m}km/h</span>
            </div>
          </div>
        </div>

        {/* Mini 3-day forecast */}
        {daily && (
          <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t">
            {daily.time.slice(1, 4).map((day, i) => {
              const dInfo = getWeatherInfo(daily.weather_code[i + 1]);
              const DIcon = dInfo.icon;
              const d = new Date(day);
              return (
                <div key={day} className="text-center p-1.5 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">週{DAY_NAMES[d.getDay()]}</p>
                  <DIcon className="size-4 mx-auto my-0.5 text-amber-500" />
                  <p className="text-xs">
                    {Math.round(daily.temperature_2m_max[i + 1])}° / {Math.round(daily.temperature_2m_min[i + 1])}°
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-2">
          資料來源：{meta?.source ?? "open-meteo"}
          {meta?.confidence ? `・信心度 ${meta.confidence.confidenceScore}/100` : ""}
        </p>
      </CardContent>
    </Card>
  );
}
