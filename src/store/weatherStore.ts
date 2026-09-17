import { create } from 'zustand';
import type { ParsedLocationData } from '../types/weather';

export type TabCategory = 'overview' | 'temperature' | 'wind' | 'rain' | 'comfort';

const LOCATION_KEY = 'weather_selected_location';

function loadSavedLocation(): string {
  try { return localStorage.getItem(LOCATION_KEY) ?? ''; } catch { return ''; }
}
function saveLocation(name: string) {
  try { localStorage.setItem(LOCATION_KEY, name); } catch { /* ignore */ }
}

interface WeatherState {
  // 資料
  locations: ParsedLocationData[];
  setLocations: (data: ParsedLocationData[]) => void;

  // 選中的縣市
  selectedLocation: string;
  setSelectedLocation: (name: string) => void;

  // 選中的時段（startTime ISO string，null = 自動判斷當前時段）
  selectedPeriodTime: string | null;
  setSelectedPeriodTime: (t: string | null) => void;

  // 分頁
  activeTab: TabCategory;
  setActiveTab: (tab: TabCategory) => void;

  // 載入狀態
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;

  // 錯誤
  error: string | null;
  setError: (msg: string | null) => void;

  // 上次更新時間
  lastFetchedAt: string | null;
  setLastFetchedAt: (t: string | null) => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  locations: [],
  setLocations: (data) => set({ locations: data }),

  selectedLocation: loadSavedLocation(),
  setSelectedLocation: (name) => {
    saveLocation(name);
    set({ selectedLocation: name, selectedPeriodTime: null });
  },

  selectedPeriodTime: null,
  setSelectedPeriodTime: (t) => set({ selectedPeriodTime: t }),

  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),

  isLoading: false,
  setIsLoading: (v) => set({ isLoading: v }),

  error: null,
  setError: (msg) => set({ error: msg }),

  lastFetchedAt: null,
  setLastFetchedAt: (t) => set({ lastFetchedAt: t }),
}));
