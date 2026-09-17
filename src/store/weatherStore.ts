import { create } from 'zustand';
import type { ParsedCityData } from '../types/weather';

export type TabCategory = 'overview' | 'temperature' | 'wind' | 'rain' | 'comfort';

const CITY_KEY = 'weather_selected_city';
const TOWNSHIP_KEY = 'weather_selected_township';

function loadSavedCity(): string {
  try {
    return localStorage.getItem(CITY_KEY) || '臺北市';
  } catch {
    return '臺北市';
  }
}

function saveCity(name: string) {
  try {
    localStorage.setItem(CITY_KEY, name);
  } catch {
    /* ignore */
  }
}

function loadSavedTownship(): string {
  try {
    return localStorage.getItem(TOWNSHIP_KEY) || '';
  } catch {
    return '';
  }
}

function saveTownship(name: string) {
  try {
    localStorage.setItem(TOWNSHIP_KEY, name);
  } catch {
    /* ignore */
  }
}

interface WeatherState {
  // 所有縣市資料
  cities: ParsedCityData[];
  setCities: (data: ParsedCityData[]) => void;

  // 選中的縣市 (大 Tab)
  selectedCity: string;
  setSelectedCity: (cityName: string) => void;

  // 選中的鄉鎮區 (小 Tab)
  selectedTownship: string;
  setSelectedTownship: (townshipName: string) => void;

  // 選中的時段 (null = 自動當前時段)
  selectedPeriodTime: string | null;
  setSelectedPeriodTime: (t: string | null) => void;

  // 天氣維度分頁
  activeTab: TabCategory;
  setActiveTab: (tab: TabCategory) => void;

  // 載入狀態與進度
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  loadProgress: number; // 0 ~ 100
  setLoadProgress: (p: number) => void;

  // 錯誤
  error: string | null;
  setError: (msg: string | null) => void;

  // 上次更新時間
  lastFetchedAt: string | null;
  setLastFetchedAt: (t: string | null) => void;
}

export const useWeatherStore = create<WeatherState>((set, get) => ({
  cities: [],
  setCities: (data) => {
    const currentCity = get().selectedCity;
    const currentTownship = get().selectedTownship;

    // 確保 selectedCity 存在
    const foundCity = data.find((c) => c.cityName === currentCity) || data[0];
    const newCityName = foundCity ? foundCity.cityName : '臺北市';

    // 確保 selectedTownship 存在於該縣市
    let newTownshipName = currentTownship;
    if (foundCity && foundCity.townships.length > 0) {
      const foundTownship = foundCity.townships.find((t) => t.townshipName === currentTownship);
      newTownshipName = foundTownship ? foundTownship.townshipName : foundCity.townships[0].townshipName;
    }

    saveCity(newCityName);
    saveTownship(newTownshipName);

    set({
      cities: data,
      selectedCity: newCityName,
      selectedTownship: newTownshipName,
    });
  },

  selectedCity: loadSavedCity(),
  setSelectedCity: (cityName: string) => {
    saveCity(cityName);
    // 切換縣市時，自動挑選該縣市第 1 個鄉鎮或記憶中的鄉鎮
    const city = get().cities.find((c) => c.cityName === cityName);
    let newTownship = '';
    if (city && city.townships.length > 0) {
      const savedTownship = loadSavedTownship();
      const hasSaved = city.townships.some((t) => t.townshipName === savedTownship);
      newTownship = hasSaved ? savedTownship : city.townships[0].townshipName;
      saveTownship(newTownship);
    }
    set({
      selectedCity: cityName,
      selectedTownship: newTownship,
      selectedPeriodTime: null,
    });
  },

  selectedTownship: loadSavedTownship(),
  setSelectedTownship: (townshipName: string) => {
    saveTownship(townshipName);
    set({
      selectedTownship: townshipName,
      selectedPeriodTime: null,
    });
  },

  selectedPeriodTime: null,
  setSelectedPeriodTime: (t) => set({ selectedPeriodTime: t }),

  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),

  isLoading: false,
  setIsLoading: (v) => set({ isLoading: v }),
  loadProgress: 0,
  setLoadProgress: (p) => set({ loadProgress: p }),

  error: null,
  setError: (msg) => set({ error: msg }),

  lastFetchedAt: null,
  setLastFetchedAt: (t) => set({ lastFetchedAt: t }),
}));
