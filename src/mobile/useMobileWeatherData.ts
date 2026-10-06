import React, { useMemo } from "react";
import dayjs from "dayjs";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import AirIcon from "@mui/icons-material/Air";
import NavigationIcon from "@mui/icons-material/Navigation";
import type { WeatherPeriod } from "../types/weather";
import type { DayForecast, HudMetricItem, ActiveDayDetails } from "./types";
import { useWeatherStore } from "../store/weatherStore";
import { computeActiveDayDetails } from "./dayDetailsHelper";
import { calculateSteadmanApparentTemp } from "../utils/weatherUtils";

function getWindDegree(dir: string): number {
  if (!dir) return 0;
  const d = dir.trim();
  if (d.includes("北") && d.includes("東")) return 45;
  if (d.includes("南") && d.includes("東")) return 135;
  if (d.includes("南") && d.includes("西")) return 225;
  if (d.includes("北") && d.includes("西")) return 315;
  if (d.includes("北")) return 0;
  if (d.includes("東")) return 90;
  if (d.includes("南")) return 180;
  if (d.includes("西")) return 270;
  return 0;
}

function getWindCardinal(dir: string): string {
  if (!dir) return "--";
  const d = dir.trim();
  if (d.includes("北") && d.includes("東")) return "東北";
  if (d.includes("南") && d.includes("東")) return "東南";
  if (d.includes("南") && d.includes("西")) return "西南";
  if (d.includes("北") && d.includes("西")) return "西北";
  if (d.includes("北")) return "北";
  if (d.includes("東")) return "東";
  if (d.includes("南")) return "南";
  if (d.includes("西")) return "西";
  return "--";
}

interface UseMobileWeatherDataParams {
  selectedCity: string;
  periods: WeatherPeriod[];
  period: WeatherPeriod | null;
  selectedForecastDate: string;
  popStr: string;
  skyTextPrimary: string;
}

export function useMobileWeatherData({
  selectedCity,
  periods,
  period,
  selectedForecastDate,
  popStr,
  skyTextPrimary,
}: UseMobileWeatherDataParams) {
  const weeklyForecasts = useWeatherStore((s) => s.weeklyForecasts);
  const cityWeekly = weeklyForecasts[selectedCity];

  // ── 未來 7 天預報 (優先使用 CWA 權威 1 週 7 天預報) ──
  const dailyList = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    const tmr = dayjs().add(1, "day").format("YYYY-MM-DD");

    if (cityWeekly && cityWeekly.length > 0) {
      return cityWeekly.slice(0, 7).map((day) => {
        const preFix =
          day.dateStr === today ? "今天 " : day.dateStr === tmr ? "明天 " : "";
        const lbl = `${preFix}${dayjs(day.dateStr).format("M/D (dd)")}`;
        return {
          ...day,
          dayLabel: lbl,
        };
      });
    }

    if (!periods.length) return [];
    const groups: Record<string, WeatherPeriod[]> = {};
    periods.forEach((p) => {
      const d = dayjs(p.startTime).format("YYYY-MM-DD");
      if (!groups[d]) groups[d] = [];
      groups[d].push(p);
    });

    const list: DayForecast[] = Object.keys(groups)
      .sort()
      .slice(0, 7)
      .map((d) => {
        const items = groups[d];
        let lo = 99,
          hi = -99,
          popMax = 0;
        items.forEach((p) => {
          const lo2 =
            parseInt(p.minTemperature) || parseInt(p.temperature) || 0;
          const hi2 =
            parseInt(p.maxTemperature) || parseInt(p.temperature) || 0;
          const pv = parseInt(p.probabilityOfPrecipitation) || 0;
          if (lo2 < lo) lo = lo2;
          if (hi2 > hi) hi = hi2;
          if (pv > popMax) popMax = pv;
        });
        const lbl =
          d === today
            ? "今天"
            : d === tmr
              ? "明天"
              : dayjs(d).format("M/D (dd)");
        const rep =
          items.find((p) => dayjs(p.startTime).hour() >= 11) || items[0];
        return {
          dateStr: d,
          dayLabel: lbl,
          minTemp: lo === 99 ? 20 : lo,
          maxTemp: hi === -99 ? 28 : hi,
          weather: rep.weather,
          weatherCode: rep.weatherCode,
          maxPop: popMax,
          startTime: rep.startTime,
          description: rep.weatherDescription,
        };
      });
    return list;
  }, [cityWeekly, periods]);

  // ── 當日（或所選時段）全天最高溫與最低溫 ──
  const dayHighLow = useMemo(() => {
    if (!period) return { max: "--", min: "--" };
    const targetDate = dayjs(period.startTime).format("YYYY-MM-DD");

    const matchedDaily =
      dailyList.find((d) => d.dateStr === targetDate) || dailyList[0];
    if (matchedDaily && matchedDaily.maxTemp !== matchedDaily.minTemp) {
      return {
        max: String(matchedDaily.maxTemp),
        min: String(matchedDaily.minTemp),
      };
    }

    const sameDayPeriods = periods.filter(
      (p) => dayjs(p.startTime).format("YYYY-MM-DD") === targetDate,
    );
    if (sameDayPeriods.length > 0) {
      const temps = sameDayPeriods
        .map((p) => parseInt(p.temperature))
        .filter((t) => !isNaN(t));
      if (temps.length > 0) {
        const max = Math.max(...temps);
        const min = Math.min(...temps);
        if (max !== min) {
          return { max: String(max), min: String(min) };
        }
      }
    }

    const nearbyTemps = periods
      .slice(0, 8)
      .map((p) => parseInt(p.temperature))
      .filter((t) => !isNaN(t));
    if (nearbyTemps.length > 0) {
      const max = Math.max(...nearbyTemps);
      const min = Math.min(...nearbyTemps);
      if (max !== min) {
        return { max: String(max), min: String(min) };
      }
    }

    const curTemp = parseInt(period.temperature) || 24;
    return {
      max: String(curTemp + 2),
      min: String(curTemp - 3),
    };
  }, [period, periods, dailyList]);

  const selectedTownship = useWeatherStore((s) => s.selectedTownship);
  const selectedPeriodTime = useWeatherStore((s) => s.selectedPeriodTime);
  const realtimeTemps = useWeatherStore((s) => s.realtimeTemps);
  const realtimeWinds = useWeatherStore((s) => s.realtimeWinds);

  // ── 第一頁 4 大指標 (Cyberpunk HUD 圓形儀表) ──
  const page1Metrics: HudMetricItem[] = useMemo(() => {
    if (!period) return [];

    const now = dayjs();
    const isViewingCurrent = !selectedPeriodTime || (now.isAfter(dayjs(period.startTime)) && now.isBefore(dayjs(period.endTime)));
    const townshipKey = selectedTownship ? `${selectedCity}_${selectedTownship}` : null;
    const rtTemp = (isViewingCurrent && townshipKey && realtimeTemps[townshipKey])
      ? realtimeTemps[townshipKey]
      : (isViewingCurrent && realtimeTemps[selectedCity])
      ? realtimeTemps[selectedCity]
      : null;
    const rtWind = (isViewingCurrent && townshipKey && realtimeWinds[townshipKey])
      ? realtimeWinds[townshipKey]
      : (isViewingCurrent && realtimeWinds[selectedCity])
      ? realtimeWinds[selectedCity]
      : null;

    // 計算精準體感溫度：若為當前實況，依氣象署 Steadman 公式由「實測氣溫 + 相對濕度 + 實測風速」動態計算
    let computedAppTempStr = period.maxApparentTemperature;
    if (isViewingCurrent && rtTemp) {
      const curTempNum = parseFloat(rtTemp);
      const curRhNum = parseFloat(period.relativeHumidity) || 65;
      const curWindNum = rtWind ? parseFloat(rtWind.windSpeed) : (parseFloat(period.windSpeed) || 2);
      if (!isNaN(curTempNum)) {
        computedAppTempStr = calculateSteadmanApparentTemp(curTempNum, curRhNum, curWindNum);
      }
    }

    const appTemp = Number(computedAppTempStr) || 20;
    const tempPercent = Math.min(100, Math.max(15, (appTemp / 40) * 100));
    const popVal = parseInt(popStr) || 0;

    const windDir = period.windDirection || "偏東風";
    const windDirText = rtWind ? rtWind.windCardinal : getWindCardinal(windDir);
    const windDirDeg = rtWind ? rtWind.windDegree : getWindDegree(windDir);
    const windVal = rtWind ? parseFloat(rtWind.windSpeed) : (parseFloat(period.windSpeed) || 0);
    const windSpeedText = rtWind ? `${rtWind.windSpeed}m/s` : `${period.windSpeed}m/s`;
    const windPercent = Math.min(100, Math.max(15, (windVal / 15) * 100));

    return [
      {
        key: "apparentTemp",
        label: "體感",
        subLabel: isViewingCurrent && rtTemp ? "實測精算體感" : "體感溫度",
        value: `${computedAppTempStr}°`,
        percent: tempPercent,
        neonColor: "#FF7A00",
        neonGlow: "rgba(255, 122, 0, 0.65)",
        miniIcon: React.createElement(ThermostatIcon, { sx: { fontSize: 21 } }),
      },
      {
        key: "pop",
        label: "降雨",
        subLabel: "降雨機率",
        value: `${popStr}%`,
        percent: Math.min(100, Math.max(5, popVal)),
        neonColor: "#00F0FF",
        neonGlow: "rgba(0, 240, 255, 0.75)",
        miniIcon: React.createElement(WaterDropIcon, { sx: { fontSize: 18 } }),
      },
      {
        key: "windDirection",
        label: "風向",
        subLabel: rtWind ? "即測風向" : "風向方位",
        value: windDirText,
        percent: 85,
        neonColor: "#00FF9F",
        neonGlow: "rgba(0, 255, 159, 0.7)",
        miniIcon: React.createElement(NavigationIcon, {
          sx: {
            fontSize: 26,
            transform: `rotate(${windDirDeg}deg)`,
            filter: "drop-shadow(0 0 6px #00FF9F)",
            transition: "transform 0.4s ease",
          },
        }),
      },
      {
        key: "windSpeed",
        label: "風速",
        subLabel: rtWind ? "即測風速" : "風向風速",
        value: windSpeedText,
        percent: windPercent,
        neonColor: "#D946EF",
        neonGlow: "rgba(217, 70, 239, 0.7)",
        miniIcon: React.createElement(AirIcon, { sx: { fontSize: 20 } }),
      },
    ];
  }, [period, popStr, selectedPeriodTime, selectedTownship, selectedCity, realtimeWinds]);

  // ── 第二頁選中的日期（預設為今天） ──
  const activeForecastDate = useMemo(() => {
    if (
      selectedForecastDate &&
      dailyList.some((d) => d.dateStr === selectedForecastDate)
    ) {
      return selectedForecastDate;
    }
    return dailyList[0]?.dateStr || dayjs().format("YYYY-MM-DD");
  }, [selectedForecastDate, dailyList]);

  // 選中日期的預報概況
  const activeDayForecast = useMemo(() => {
    return (
      dailyList.find((d) => d.dateStr === activeForecastDate) ||
      dailyList[0] ||
      null
    );
  }, [dailyList, activeForecastDate]);

  // ── 第二頁依選取日期動態計算：6 大核心氣象指標、穿衣指南與提醒 ──
  const activeDayDetails: ActiveDayDetails | null = useMemo(() => {
    if (!activeDayForecast) return null;
    return computeActiveDayDetails(
      activeDayForecast,
      periods,
      period,
      skyTextPrimary,
    );
  }, [activeDayForecast, periods, period, skyTextPrimary]);

  return {
    dailyList,
    dayHighLow,
    page1Metrics,
    activeForecastDate,
    activeDayForecast,
    activeDayDetails,
  };
}
