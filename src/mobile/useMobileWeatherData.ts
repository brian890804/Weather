import React, { useMemo } from "react";
import dayjs from "dayjs";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import AirIcon from "@mui/icons-material/Air";
import NavigationIcon from "@mui/icons-material/Navigation";
import DeckIcon from "@mui/icons-material/Deck";
import RoofingIcon from "@mui/icons-material/Roofing";
import type { WeatherPeriod } from "../types/weather";
import type { DayForecast, HudMetricItem, ActiveDayDetails } from "./types";
import { useWeatherStore } from "../store/weatherStore";
import { computeActiveDayDetails } from "./dayDetailsHelper";
import {
  calculateSteadmanApparentTemp,
  calculateIndoorApparentTemp,
} from "../utils/weatherUtils";

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
      // 移除今天，只保留明天起的未來 6 天預報
      const futureDays = cityWeekly.filter((day) => day.dateStr > today).slice(0, 6);
      return futureDays.map((day) => {
        const preFix = day.dateStr === tmr ? "明天 " : "";
        const lbl = `${preFix}${dayjs(day.dateStr).format("M/D (dd)")}`;
        // 若週預報 (F-D0047-091) 的 maxPop 為 0，但 3 天逐時預報 (F-D0047-049) 中該日有提供 3 小時降雨機率，則進行融合
        let fusedPop = day.maxPop;
        if (fusedPop === 0 && periods.length > 0) {
          const matchedDayPeriods = periods.filter(
            (p) => dayjs(p.startTime).format("YYYY-MM-DD") === day.dateStr,
          );
          if (matchedDayPeriods.length > 0) {
            const pops = matchedDayPeriods
              .map((p) => parseInt(p.probabilityOfPrecipitation))
              .filter((v) => !isNaN(v) && v > 0);
            if (pops.length > 0) {
              fusedPop = Math.max(...pops);
            }
          }
        }

        return {
          ...day,
          maxPop: fusedPop,
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
      .filter((d) => d > today)
      .slice(0, 6)
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
          d === tmr
            ? "明天 " + dayjs(d).format("M/D (dd)")
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
  const realtimeWeatherMap = useWeatherStore((s) => s.realtimeWeather);
  const townshipStations = useWeatherStore((s) => s.townshipStations);
  const userSelectedStations = useWeatherStore((s) => s.userSelectedStations);

  // ── 第一頁 4 大指標 (Cyberpunk HUD 圓形儀表) 與生活小語 ──
  const page1Data = useMemo(() => {
    if (!period) return { metrics: [], livingTip: "" };

    const now = dayjs();
    const isViewingCurrent = !selectedPeriodTime || (now.isAfter(dayjs(period.startTime)) && now.isBefore(dayjs(period.endTime)));
    const townshipKey = selectedTownship ? `${selectedCity}_${selectedTownship}` : null;

    const stationsList = townshipKey && townshipStations[townshipKey] ? townshipStations[townshipKey] : [];
    const manualStationName = townshipKey ? userSelectedStations[townshipKey] : null;
    const activeStation = stationsList.find((st) => st.stationName === manualStationName) || (townshipKey && realtimeWeatherMap[townshipKey] ? realtimeWeatherMap[townshipKey] : null);

    const rtTemp = activeStation?.temp || (isViewingCurrent && townshipKey && realtimeTemps[townshipKey])
      ? (activeStation?.temp || realtimeTemps[townshipKey!])
      : (isViewingCurrent && realtimeTemps[selectedCity])
      ? realtimeTemps[selectedCity]
      : null;
    const rtWind = activeStation?.wind || (isViewingCurrent && townshipKey && realtimeWinds[townshipKey])
      ? (activeStation?.wind || realtimeWinds[townshipKey!])
      : (isViewingCurrent && realtimeWinds[selectedCity])
      ? realtimeWinds[selectedCity]
      : null;

    const isRainingNow = isViewingCurrent && (
      (activeStation?.rainNow && activeStation.rainNow > 0) ||
      (activeStation?.weather && (activeStation.weather.includes("雨") || activeStation.weather.includes("陣雨"))) ||
      (period.weather && (period.weather.includes("雨") || period.weather.includes("陣雨")))
    );

    // 計算精準室外體感（含實測風速散熱）：依氣象署 Steadman 公式由「氣溫 + 相對濕度 + 風速」動態計算
    const tempNum = isViewingCurrent && rtTemp ? parseFloat(rtTemp) : parseFloat(period.temperature);
    const rhNum = parseFloat(activeStation?.humidity || period.relativeHumidity) || 65;
    const windNum = rtWind ? parseFloat(rtWind.windSpeed) : (parseFloat(period.windSpeed) || 2);

    let outdoorAppTempStr = period.maxApparentTemperature;
    let indoorAppTempStr = period.maxApparentTemperature;

    if (!isNaN(tempNum)) {
      outdoorAppTempStr = calculateSteadmanApparentTemp(tempNum, rhNum, windNum);
      indoorAppTempStr = calculateIndoorApparentTemp(tempNum, rhNum);
    }

    const outdoorAppTemp = Number(outdoorAppTempStr) || 20;
    const indoorAppTemp = Number(indoorAppTempStr) || 20;
    const outdoorPercent = Math.min(100, Math.max(15, (outdoorAppTemp / 40) * 100));
    const indoorPercent = Math.min(100, Math.max(15, (indoorAppTemp / 40) * 100));
    const popVal = parseInt(popStr) || 0;

    const windDir = period.windDirection || "偏東風";
    const windDirText = rtWind ? rtWind.windCardinal : getWindCardinal(windDir);
    const windDirDeg = rtWind ? rtWind.windDegree : getWindDegree(windDir);

    // 穿衣生活指南計算（依室外真實體感溫度判斷）
    let clothTitle = "短袖輕裝";
    let clothDetail = "純棉短袖，天氣宜人";
    let clothIcon = "👕";
    if (outdoorAppTemp >= 30) {
      clothTitle = "清涼透氣";
      clothDetail = "短袖為宜，注意防曬補水";
      clothIcon = "☀️";
    } else if (outdoorAppTemp >= 25) {
      clothTitle = "短袖輕裝";
      clothDetail = "短袖衣物，通風舒適";
      clothIcon = "👕";
    } else if (outdoorAppTemp >= 20) {
      clothTitle = "薄款外套";
      clothDetail = "薄外套或薄長袖";
      clothIcon = "🧥";
    } else if (outdoorAppTemp >= 15) {
      clothTitle = "保暖衣物";
      clothDetail = "長袖毛衣或風衣保暖";
      clothIcon = "🧣";
    } else {
      clothTitle = "厚實防寒";
      clothDetail = "羽絨厚外套，注意防寒";
      clothIcon = "🧤";
    }

    // 雨具提醒計算（若現場測站回報有雨，或降雨機率 >= 10% 提醒備傘，>= 40% 務必帶傘）
    let umbrellaTip = "無需攜傘";
    if (isRainingNow || popVal >= 40) {
      umbrellaTip = isRainingNow ? "現場有雨 · 務必帶傘" : "務必攜傘";
    } else if (popVal >= 10) {
      umbrellaTip = "建議備折疊傘";
    }

    // 整合穿衣生活指南小語
    const livingTip = `${clothIcon} ${clothTitle} · ${clothDetail} · ${isRainingNow || popVal >= 10 ? "🌧 " : ""}${umbrellaTip}`;

    const metrics: HudMetricItem[] = [
      {
        key: "outdoorApparentTemp",
        label: "室外體感",
        subLabel: "含風速散熱",
        value: `${outdoorAppTempStr}°`,
        percent: outdoorPercent,
        neonColor: "#FF7A00",
        neonGlow: "rgba(255, 122, 0, 0.65)",
        miniIcon: React.createElement(DeckIcon, { sx: { fontSize: 20 } }),
      },
      {
        key: "indoorApparentTemp",
        label: "室內體感",
        subLabel: "弱風/遮蔽環境",
        value: `${indoorAppTempStr}°`,
        percent: indoorPercent,
        neonColor: "#F59E0B",
        neonGlow: "rgba(245, 158, 11, 0.65)",
        miniIcon: React.createElement(RoofingIcon, { sx: { fontSize: 21 } }),
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
    ];

    return { metrics, livingTip };
  }, [
    period,
    popStr,
    selectedPeriodTime,
    selectedTownship,
    selectedCity,
    realtimeTemps,
    realtimeWinds,
    realtimeWeatherMap,
    townshipStations,
    userSelectedStations,
  ]);

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

  const page1Metrics = page1Data.metrics;
  const livingTip = page1Data.livingTip;

  return {
    dailyList,
    dayHighLow,
    page1Metrics,
    livingTip,
    activeForecastDate,
    activeDayForecast,
    activeDayDetails,
  };
}
