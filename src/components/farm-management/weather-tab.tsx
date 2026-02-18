"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFarmManagement } from "@/lib/store/farm-management-context";
import { useFields } from "@/lib/store/fields-context";
import { formatDate } from "@/lib/utils/date-helpers";
import {
  buildFieldContextSignature,
  evaluateReplanTriggers,
  evaluateWeatherAnomalies,
  type AutomationSnapshot,
  type ReplanTrigger,
} from "@/lib/automation/rules";
import {
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  CloudRain,
  Cloud,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Loader2,
} from "lucide-react";
import type { WeatherAlert } from "@/lib/weather/severe-alerts";

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs
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

interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    rain: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    weather_code: number;
    apparent_temperature: number;
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
  alerts?: WeatherAlert[];
  meta?: {
    source?: string;
    fetchedAt?: string;
    fallbackUsed?: boolean;
    confidence?: {
      freshnessMinutes: number;
      freshnessLabel: "fresh" | "stale" | "expired";
      confidenceScore: number;
      confidenceLevel: "low" | "medium" | "high";
    };
  };
}

const CONDITIONS = ["晴天", "多雲", "陰天", "小雨", "大雨", "雷雨", "颱風"];

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];
const BEGINNER_DEFAULTS_KEY = "hualien-automation-beginner-defaults";
const AUTOMATION_SNAPSHOT_KEY = "hualien-automation-last-snapshot";

export function WeatherTab() {
  const { weatherLogs, addWeatherLog, removeWeatherLog } = useFarmManagement();
  const { fields } = useFields();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [temperature, setTemperature] = useState("");
  const [rainfall, setRainfall] = useState("");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");

  // Live weather state
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [replanTriggers, setReplanTriggers] = useState<ReplanTrigger[]>([]);
  const [beginnerDefaults, setBeginnerDefaults] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(BEGINNER_DEFAULTS_KEY) === "1";
  });

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weather");
      if (!res.ok) throw new Error("API 回應異常");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWeather(data);
      setLastFetched(new Date());

      if (typeof window !== "undefined") {
        let prevSnapshot: AutomationSnapshot | null = null;
        try {
          const raw = window.localStorage.getItem(AUTOMATION_SNAPSHOT_KEY);
          if (raw) prevSnapshot = JSON.parse(raw) as AutomationSnapshot;
        } catch {
          prevSnapshot = null;
        }

        const nextSnapshot: AutomationSnapshot = {
          alertIds: Array.isArray(data.alerts) ? data.alerts.map((alert: WeatherAlert) => alert.id).sort() : [],
          confidenceLevel: data.meta?.confidence?.confidenceLevel,
          fieldContextSignature: buildFieldContextSignature(fields.map((field) => ({ id: field.id, context: field.context }))),
        };
        setReplanTriggers(evaluateReplanTriggers(prevSnapshot, nextSnapshot));
        window.localStorage.setItem(AUTOMATION_SNAPSHOT_KEY, JSON.stringify(nextSnapshot));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得天氣資料失敗");
    } finally {
      setLoading(false);
    }
  }, [fields]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const automationSuggestions = useMemo(() => {
    if (!weather) return [];
    return evaluateWeatherAnomalies({
      current: {
        temperatureC: weather.current.temperature_2m,
        windSpeedKmh: weather.current.wind_speed_10m,
      },
      forecastRainMm: weather.daily.precipitation_sum,
      alerts: weather.alerts ?? [],
      confidenceLevel: weather.meta?.confidence?.confidenceLevel,
      beginnerDefaults,
    });
  }, [weather, beginnerDefaults]);

  const toggleBeginnerDefaults = (nextValue: boolean) => {
    setBeginnerDefaults(nextValue);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BEGINNER_DEFAULTS_KEY, nextValue ? "1" : "0");
    }
  };

  const handleAdd = () => {
    if (!condition && !temperature && !rainfall) return;
    addWeatherLog({
      date: new Date(date).toISOString(),
      temperature: temperature ? parseFloat(temperature) : undefined,
      rainfall: rainfall ? parseFloat(rainfall) : undefined,
      condition: condition || undefined,
      notes: notes || undefined,
    });
    setTemperature("");
    setRainfall("");
    setNotes("");
  };

  const sorted = [...weatherLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const currentInfo = weather ? getWeatherInfo(weather.current.weather_code) : null;
  const CurrentIcon = currentInfo?.icon ?? Sun;

  return (
    <div className="space-y-4 pt-4">
      {/* Live weather */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">花蓮即時天氣</h3>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="size-3.5 rounded border-muted-foreground/40"
              checked={beginnerDefaults}
              onChange={(event) => toggleBeginnerDefaults(event.target.checked)}
            />
            新手保守模式
          </label>
          <a
            href="https://www.cwa.gov.tw/V8/C/W/Town/Town.html?TID=1001504"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            中央氣象署
          </a>
          <Button variant="ghost" size="sm" onClick={fetchWeather} disabled={loading}>
            <RefreshCw className={`size-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            更新
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && !weather && (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            載入天氣資料中...
          </CardContent>
        </Card>
      )}

      {weather && (
        <>
          {/* Current weather card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <CurrentIcon className="size-12 text-amber-500 mx-auto" />
                  <p className="text-sm font-medium mt-1">{currentInfo?.label}</p>
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Thermometer className="size-4 text-red-500 shrink-0" />
                    <div>
                      <p className="text-2xl font-bold">{weather.current.temperature_2m}°C</p>
                      <p className="text-xs text-muted-foreground">體感 {weather.current.apparent_temperature}°C</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="size-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-lg font-semibold">{weather.current.relative_humidity_2m}%</p>
                      <p className="text-xs text-muted-foreground">濕度</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CloudRain className="size-4 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-lg font-semibold">{weather.current.precipitation} mm</p>
                      <p className="text-xs text-muted-foreground">降水量</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="size-4 text-gray-500 shrink-0" />
                    <div>
                      <p className="text-lg font-semibold">{weather.current.wind_speed_10m} km/h</p>
                      <p className="text-xs text-muted-foreground">風速</p>
                    </div>
                  </div>
                </div>
              </div>
              {weather.current.uv_index > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Sun className="size-4 text-orange-500" />
                  <span>UV 指數：<strong>{weather.current.uv_index}</strong></span>
                  <span className="text-muted-foreground">
                    {weather.current.uv_index <= 2 ? "（低）" :
                     weather.current.uv_index <= 5 ? "（中等）" :
                     weather.current.uv_index <= 7 ? "（高）" :
                     weather.current.uv_index <= 10 ? "（非常高）" : "（極高）"}
                  </span>
                </div>
              )}
              {lastFetched && (
                <p className="mt-2 text-xs text-muted-foreground">
                  資料來源：Open-Meteo（免費天氣 API）・最後更新：{lastFetched.toLocaleTimeString("zh-TW")}
                </p>
              )}
              {weather.meta?.confidence && (
                <p className="mt-1 text-xs text-muted-foreground">
                  資料信心度：{weather.meta.confidence.confidenceScore}/100（{weather.meta.confidence.confidenceLevel}）・
                  新鮮度：{weather.meta.confidence.freshnessLabel}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 7-day forecast */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">7 天天氣預報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weather.daily.time.map((day, i) => {
                  const info = getWeatherInfo(weather.daily.weather_code[i]);
                  const DayIcon = info.icon;
                  const d = new Date(day);
                  const isToday = i === 0;
                  return (
                    <div
                      key={day}
                      className={`text-center p-2 rounded-lg ${
                        isToday ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/50"
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {isToday ? "今天" : `週${DAY_NAMES[d.getDay()]}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{`${d.getMonth() + 1}/${d.getDate()}`}</p>
                      <DayIcon className="size-5 mx-auto my-1.5 text-amber-500" />
                      <p className="text-xs">{info.label}</p>
                      <p className="text-sm font-semibold mt-1">
                        {Math.round(weather.daily.temperature_2m_max[i])}°
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(weather.daily.temperature_2m_min[i])}°
                      </p>
                      {weather.daily.precipitation_sum[i] > 0 && (
                        <p className="text-xs text-blue-500 mt-0.5">
                          {weather.daily.precipitation_sum[i]}mm
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Automation suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">自動調整建議（需確認）</CardTitle>
            </CardHeader>
            <CardContent>
              {automationSuggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">目前沒有需要調整的規則建議。</p>
              ) : (
                <ul className="space-y-2">
                  {automationSuggestions.map((suggestion) => (
                    <li
                      key={suggestion.id}
                      className={
                        suggestion.severity === "critical"
                          ? "rounded border border-red-200 bg-red-50/40 p-3"
                          : suggestion.severity === "warning"
                          ? "rounded border border-amber-200 bg-amber-50/40 p-3"
                          : "rounded border border-sky-200 bg-sky-50/40 p-3"
                      }
                    >
                      <p className="text-sm font-medium">{suggestion.title}</p>
                      <p className="text-xs mt-1">{suggestion.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{suggestion.rationale}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {suggestion.requiresConfirmation ? "需使用者確認後執行" : "僅提供操作提醒"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {replanTriggers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">重規劃觸發條件</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {replanTriggers.map((trigger) => (
                    <li
                      key={trigger.id}
                      className={
                        trigger.severity === "critical"
                          ? "text-red-600"
                          : trigger.severity === "warning"
                          ? "text-amber-600"
                          : "text-blue-600"
                      }
                    >
                      {trigger.reason}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Farming insights from weather */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">農務天氣提示</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(weather.alerts ?? []).map((alert) => (
                  <li
                    key={alert.id}
                    className={
                      alert.severity === "critical"
                        ? "text-red-600"
                        : alert.severity === "warning"
                        ? "text-amber-600"
                        : "text-green-600"
                    }
                  >
                    <span className="font-medium">{alert.title}</span>
                    <span className="text-foreground"> - {alert.recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* Manual weather log section */}
      <div className="border-t pt-4 mt-6">
        <h3 className="text-lg font-semibold mb-3">手動天氣紀錄</h3>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input type="number" placeholder="溫度°C" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
              <Input type="number" placeholder="降雨mm" value={rainfall} onChange={(e) => setRainfall(e.target.value)} />
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue placeholder="天況" /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={!condition && !temperature && !rainfall}>
                <Plus className="size-4 mr-1" />新增
              </Button>
            </div>
            <Input className="mt-2" placeholder="備註（選填）" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </CardContent>
        </Card>

        <div className="space-y-2 mt-3">
          {sorted.map((log) => (
            <Card key={log.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium">{formatDate(log.date)}</span>
                    {log.condition && <span>{log.condition}</span>}
                    {log.temperature != null && <span>{log.temperature}°C</span>}
                    {log.rainfall != null && <span>{log.rainfall}mm</span>}
                    {log.notes && <span className="text-muted-foreground">{log.notes}</span>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeWeatherLog(log.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sorted.length === 0 && (
          <p className="text-center text-muted-foreground py-4 text-sm">尚無手動天氣紀錄</p>
        )}
      </div>
    </div>
  );
}
