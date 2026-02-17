import { mockWeatherProvider } from "@/lib/weather/providers/mock-weather-provider";
import { openMeteoProvider } from "@/lib/weather/providers/open-meteo-provider";
import type { NormalizedWeatherData, WeatherQuery } from "@/lib/weather/types";

export interface WeatherServiceResult {
  data: NormalizedWeatherData;
  fallbackUsed: boolean;
  providerErrors: string[];
}

const providers = [openMeteoProvider, mockWeatherProvider];

export async function getWeatherData(query: WeatherQuery): Promise<WeatherServiceResult> {
  const providerErrors: string[] = [];

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];

    try {
      const data = await provider.fetchWeather(query);
      return {
        data,
        fallbackUsed: index > 0,
        providerErrors,
      };
    } catch (error) {
      providerErrors.push(`${provider.source}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  throw new Error(`No weather provider succeeded. ${providerErrors.join(" | ")}`);
}

