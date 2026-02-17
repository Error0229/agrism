export type WeatherAlertSeverity = "info" | "warning" | "critical";
export type WeatherAlertType = "rain" | "wind" | "heat" | "cold" | "uv" | "humidity";

export interface WeatherAlert {
  id: string;
  type: WeatherAlertType;
  severity: WeatherAlertSeverity;
  title: string;
  recommendation: string;
}

interface AlertInput {
  current: {
    temperatureC: number;
    humidityPercent: number;
    windSpeedKmh: number;
    uvIndex: number;
  };
  forecastRainMm: number[];
}

function pushAlert(target: WeatherAlert[], alert: WeatherAlert) {
  if (target.some((item) => item.id === alert.id)) return;
  target.push(alert);
}

export function buildSevereWeatherAlerts(input: AlertInput): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const heavyRainSoon = input.forecastRainMm.slice(0, 3).some((rain) => rain >= 30);
  const noRainSoon = input.forecastRainMm.slice(0, 3).every((rain) => rain <= 0);

  if (input.current.temperatureC >= 35) {
    pushAlert(alerts, {
      id: "heat-critical",
      type: "heat",
      severity: "critical",
      title: "高溫警示",
      recommendation: "避開正午作業，增加灌溉頻率並加強遮陰。",
    });
  } else if (input.current.temperatureC >= 32) {
    pushAlert(alerts, {
      id: "heat-warning",
      type: "heat",
      severity: "warning",
      title: "高溫風險",
      recommendation: "建議調整作業時段並補充灌溉。",
    });
  }

  if (input.current.temperatureC <= 10) {
    pushAlert(alerts, {
      id: "cold-warning",
      type: "cold",
      severity: "warning",
      title: "低溫風險",
      recommendation: "注意防寒覆蓋，降低低溫逆境影響。",
    });
  }

  if (heavyRainSoon) {
    pushAlert(alerts, {
      id: "rain-critical",
      type: "rain",
      severity: "critical",
      title: "強降雨風險",
      recommendation: "提前清理排水路徑，並安排病害預防作業。",
    });
  } else if (noRainSoon) {
    pushAlert(alerts, {
      id: "rain-dry",
      type: "rain",
      severity: "info",
      title: "短期少雨",
      recommendation: "檢查灌溉排程，避免土壤含水量不足。",
    });
  }

  if (input.current.windSpeedKmh >= 40) {
    pushAlert(alerts, {
      id: "wind-warning",
      type: "wind",
      severity: "warning",
      title: "強風風險",
      recommendation: "加強棚架與支撐結構，避免植株倒伏。",
    });
  }

  if (input.current.uvIndex >= 8) {
    pushAlert(alerts, {
      id: "uv-warning",
      type: "uv",
      severity: "warning",
      title: "高 UV 風險",
      recommendation: "戶外作業請做好防曬，避免中午長時間曝曬。",
    });
  }

  if (input.current.humidityPercent >= 85) {
    pushAlert(alerts, {
      id: "humidity-warning",
      type: "humidity",
      severity: "warning",
      title: "高濕度病害風險",
      recommendation: "改善通風並加強真菌性病害巡檢。",
    });
  }

  if (alerts.length === 0) {
    pushAlert(alerts, {
      id: "stable-info",
      type: "rain",
      severity: "info",
      title: "天氣狀況穩定",
      recommendation: "可依計畫執行農務作業。",
    });
  }

  return alerts;
}

