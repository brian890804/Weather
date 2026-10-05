import type { ReactNode } from "react";
import type {
  WeatherPeriod,
  ParsedCityData,
  ParsedTownshipData,
} from "../types/weather";

export interface MobileWeatherProps {
  cities: ParsedCityData[];
  selectedCity: string;
  selectedTownship: string;
  setSelectedCityAndTownship: (city: string, township: string) => void;
  townships: ParsedTownshipData[];
  periods: WeatherPeriod[];
  displayPeriod: WeatherPeriod | null;
  autoCurrentPeriod: WeatherPeriod | null;
  selectedPeriodTime: string | null;
  onSelectPeriod: (startTime: string) => void;
  lastFetchedAt: string | null;
}

export interface DayForecast {
  dateStr: string;
  dayLabel: string;
  minTemp: number;
  maxTemp: number;
  weather: string;
  weatherCode: string;
  maxPop: number;
  startTime: string;
  description?: string;
}

export interface SkyTheme {
  bg: string;
  glow: string;
  neonPrimary: string;
  neonSecondary: string;
  neonGlow: string;
  neonAuraBg: string;
  glass: string;
  glassBorder: string;
  dimGlass: string;
  dimBorder: string;
  cardGradient: string;
  cardItemGradient: string;
  textPrimary: string;
  textSecondary: string;
  accentText: string;
  weatherType: "sunny" | "rainy" | "cloudy" | "night" | "storm";
}

export interface HudMetricItem {
  key: string;
  label: string;
  subLabel: string;
  value: string;
  percent: number;
  neonColor: string;
  neonGlow: string;
  miniIcon: ReactNode;
}

export interface BentoCardData {
  key: string;
  icon: ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
}

export interface ClothingGuide {
  title: string;
  detail: string;
  emoji: string;
}

export interface ClothingTip {
  key: string;
  label: string;
  value: string;
  color: string;
}

export interface ActiveDayDetails {
  dayLabel: string;
  dateStr: string;
  description?: string;
  weather: string;
  bentoCards: BentoCardData[];
  cloth: ClothingGuide;
  tips: ClothingTip[];
}
