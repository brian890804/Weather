import React, { useMemo } from "react";
import { twTime } from "../utils/time";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import NavigationIcon from "@mui/icons-material/Navigation";
import DeckIcon from "@mui/icons-material/Deck";
import RoofingIcon from "@mui/icons-material/Roofing";
import type { WeatherPeriod } from "../types/weather";
import type { DayForecast, HudMetricItem, ActiveDayDetails } from "./types";
import { useWeatherStore } from "../store/weatherStore";
import { useActiveStation } from "../hooks/useActiveStation";
import { computeActiveDayDetails } from "./dayDetailsHelper";
import { computeLiveConditions, isPeriodNow } from "../utils/liveConditions";

interface UseMobileWeatherDataParams {
  selectedCity: string;
  periods: WeatherPeriod[];
  period: WeatherPeriod | null;
  /** 涵蓋現在的時段：氣溫與室內 / 室外體感一律以「現在」計算，不跟著選取的時段變動 */
  nowPeriod: WeatherPeriod | null;
  selectedForecastDate: string;
  popStr: string;
  skyTextPrimary: string;
}

function formatTemp(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function useMobileWeatherData({
  selectedCity,
  periods,
  period,
  nowPeriod,
  selectedForecastDate,
  popStr,
  skyTextPrimary,
}: UseMobileWeatherDataParams) {
  const weeklyForecasts = useWeatherStore((s) => s.weeklyForecasts);
  const cityWeekly = weeklyForecasts[selectedCity];
  const { station, isCityFallback } = useActiveStation();

  // ── 未來 7 天預報 (優先使用 CWA 權威 1 週 7 天預報) ──
  const dailyList = useMemo(() => {
    const today = twTime().format("YYYY-MM-DD");
    const tmr = twTime().add(1, "day").format("YYYY-MM-DD");

    if (cityWeekly && cityWeekly.length > 0) {
      // 移除今天，只保留明天起的未來 6 天預報
      const futureDays = cityWeekly.filter((day) => day.dateStr > today).slice(0, 6);
      return futureDays.map((day): DayForecast => {
        const preFix = day.dateStr === tmr ? "明天 " : "";
        const lbl = `${preFix}${twTime(day.dateStr).format("M/D (dd)")}`;
        // 融合降雨機率：若 3 天逐 3 小時預報中該日有提供 3 小時降雨機率，取全日最大機率
        let fusedPop = day.maxPop;
        const pops = periods
          .filter((p) => twTime(p.startTime).format("YYYY-MM-DD") === day.dateStr)
          .map((p) => parseInt(p.probabilityOfPrecipitation))
          .filter((v) => !isNaN(v));
        if (pops.length > 0) {
          fusedPop = Math.max(fusedPop ?? 0, ...pops);
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
      const d = twTime(p.startTime).format("YYYY-MM-DD");
      if (!groups[d]) groups[d] = [];
      groups[d].push(p);
    });

    const list: DayForecast[] = [];
    Object.keys(groups)
      .sort()
      .filter((d) => d > today)
      .slice(0, 6)
      .forEach((d) => {
        const items = groups[d];
        const los = items.map((p) => parseFloat(p.minTemperature)).filter((v) => !isNaN(v));
        const his = items.map((p) => parseFloat(p.maxTemperature)).filter((v) => !isNaN(v));
        if (los.length === 0 || his.length === 0) return;
        const pops = items.map((p) => parseInt(p.probabilityOfPrecipitation)).filter((v) => !isNaN(v));
        const lbl =
          d === tmr
            ? "明天 " + twTime(d).format("M/D (dd)")
            : twTime(d).format("M/D (dd)");
        const rep =
          items.find((p) => twTime(p.startTime).hour() >= 11) || items[0];
        list.push({
          dateStr: d,
          dayLabel: lbl,
          minTemp: Math.min(...los),
          maxTemp: Math.max(...his),
          weather: rep.weather,
          weatherCode: rep.weatherCode,
          maxPop: pops.length > 0 ? Math.max(...pops) : null,
          startTime: rep.startTime,
          description: rep.weatherDescription,
        });
      });
    return list;
  }, [cityWeekly, periods]);

  // ── 所選時段「當日」的最高溫與最低溫（今天會併入測站今日實測極值） ──
  const dayHighLow = useMemo(() => {
    if (!period) return { max: "--", min: "--" };
    const targetDate = twTime(period.startTime).format("YYYY-MM-DD");
    let max: number | null = null;
    let min: number | null = null;

    const weeklyDay = cityWeekly?.find((d) => d.dateStr === targetDate);
    if (weeklyDay && weeklyDay.maxTemp > -99 && weeklyDay.minTemp < 99) {
      max = weeklyDay.maxTemp;
      min = weeklyDay.minTemp;
    } else {
      const sameDay = periods.filter(
        (p) => twTime(p.startTime).format("YYYY-MM-DD") === targetDate,
      );
      const his = sameDay.map((p) => parseFloat(p.maxTemperature)).filter((v) => !isNaN(v));
      const los = sameDay.map((p) => parseFloat(p.minTemperature)).filter((v) => !isNaN(v));
      if (his.length > 0) max = Math.max(...his);
      if (los.length > 0) min = Math.min(...los);
    }

    if (targetDate === twTime().format("YYYY-MM-DD") && station) {
      const obsHigh = parseFloat(station.dailyHigh ?? "");
      const obsLow = parseFloat(station.dailyLow ?? "");
      if (!isNaN(obsHigh)) max = max === null ? obsHigh : Math.max(max, obsHigh);
      if (!isNaN(obsLow)) min = min === null ? obsLow : Math.min(min, obsLow);
    }

    return {
      max: max === null ? "--" : formatTemp(max),
      min: min === null ? "--" : formatTemp(min),
    };
  }, [period, periods, cityWeekly, station]);

  // ── 第一頁 4 大指標 (Cyberpunk HUD 圓形儀表) 與生活小語 ──
  const page1Data = useMemo(() => {
    if (!period) return { metrics: [], livingTip: "" };

    const live = computeLiveConditions(period, station, {
      isNow: isPeriodNow(period),
      isCityFallback,
    });

    // 室內 / 室外體感與穿衣建議只看「現在」：測站實測優先，無新鮮觀測時退回當前時段預報
    const nowLive = computeLiveConditions(nowPeriod ?? period, station, {
      isNow: true,
      isCityFallback,
    });
    const outdoorAppTemp = parseFloat(nowLive.outdoorApparent);
    const indoorAppTemp = parseFloat(nowLive.indoorApparent);
    const outdoorPercent = isNaN(outdoorAppTemp) ? 0 : Math.min(100, Math.max(15, (outdoorAppTemp / 40) * 100));
    const indoorPercent = isNaN(indoorAppTemp) ? 0 : Math.min(100, Math.max(15, (indoorAppTemp / 40) * 100));
    const popVal = parseInt(popStr);
    const hasPop = !isNaN(popVal);

    // 穿衣生活指南計算（依室外體感溫度判斷；無體感資料時退回氣溫）
    const clothBasis = !isNaN(outdoorAppTemp) ? outdoorAppTemp : parseFloat(nowLive.temperature);
    let clothTitle = "--";
    let clothDetail = "暫無溫度資料";
    let clothIcon = "👕";
    if (isNaN(clothBasis)) {
      // 保持無資料狀態
    } else if (clothBasis >= 30) {
      clothTitle = "清涼透氣";
      clothDetail = "短袖為宜，注意防曬補水";
      clothIcon = "☀️";
    } else if (clothBasis >= 25) {
      clothTitle = "短袖輕裝";
      clothDetail = "短袖衣物，通風舒適";
      clothIcon = "👕";
    } else if (clothBasis >= 20) {
      clothTitle = "薄款外套";
      clothDetail = "薄外套或薄長袖";
      clothIcon = "🧥";
    } else if (clothBasis >= 15) {
      clothTitle = "保暖衣物";
      clothDetail = "長袖毛衣或風衣保暖";
      clothIcon = "🧣";
    } else {
      clothTitle = "厚實防寒";
      clothDetail = "羽絨厚外套，注意防寒";
      clothIcon = "🧤";
    }

    // 雨具提醒：「現場有雨」只來自測站天氣現象；預報有雨或機率 >= 40% 務必帶傘，>= 10% 建議備傘
    let umbrellaTip = "無需攜傘";
    if (live.isRainingObserved) {
      umbrellaTip = "現場有雨 · 務必帶傘";
    } else if (live.isRainForecast || (hasPop && popVal >= 40)) {
      umbrellaTip = "預報有雨 · 務必攜傘";
    } else if (hasPop && popVal >= 10) {
      umbrellaTip = "建議備折疊傘";
    } else if (!hasPop) {
      umbrellaTip = "暫無降雨機率資料";
    }
    const rainHint = live.isRainingObserved || live.isRainForecast || (hasPop && popVal >= 10);

    // 整合穿衣生活指南小語
    const livingTip = `${clothIcon} ${clothTitle} · ${clothDetail} · ${rainHint ? "🌧 " : ""}${umbrellaTip}`;

    const metrics: HudMetricItem[] = [
      {
        key: "outdoorApparentTemp",
        label: "室外體感",
        subLabel: nowLive.temperatureObserved ? "實測含風速散熱" : "預報體感",
        value: isNaN(outdoorAppTemp) ? "--" : `${nowLive.outdoorApparent}°`,
        percent: outdoorPercent,
        neonColor: "#FF7A00",
        neonGlow: "rgba(255, 122, 0, 0.65)",
        miniIcon: React.createElement(DeckIcon, { sx: { fontSize: 20 } }),
      },
      {
        key: "indoorApparentTemp",
        label: "室內體感",
        subLabel: "弱風/遮蔽環境",
        value: isNaN(indoorAppTemp) ? "--" : `${nowLive.indoorApparent}°`,
        percent: indoorPercent,
        neonColor: "#F59E0B",
        neonGlow: "rgba(245, 158, 11, 0.65)",
        miniIcon: React.createElement(RoofingIcon, { sx: { fontSize: 21 } }),
      },
      {
        key: "pop",
        label: "降雨",
        subLabel: "本時段機率",
        value: hasPop ? `${popVal}%` : "--",
        percent: hasPop ? Math.min(100, Math.max(5, popVal)) : 0,
        neonColor: "#00F0FF",
        neonGlow: "rgba(0, 240, 255, 0.75)",
        miniIcon: React.createElement(WaterDropIcon, { sx: { fontSize: 18 } }),
      },
      {
        key: "windDirection",
        label: "風向",
        subLabel: live.windObserved ? "即測風向" : "預報風向",
        value: live.windCardinal,
        percent: 85,
        neonColor: "#00FF9F",
        neonGlow: "rgba(0, 255, 159, 0.7)",
        miniIcon: React.createElement(NavigationIcon, {
          sx: {
            fontSize: 26,
            transform: `rotate(${live.windDegree ?? 0}deg)`,
            opacity: live.windDegree === null ? 0.35 : 1,
            filter: "drop-shadow(0 0 6px #00FF9F)",
            transition: "transform 0.4s ease",
          },
        }),
      },
    ];

    return { metrics, livingTip };
  }, [period, nowPeriod, popStr, station, isCityFallback]);

  // ── 第二頁選中的日期（預設為清單第一天，即明天） ──
  const activeForecastDate = useMemo(() => {
    if (
      selectedForecastDate &&
      dailyList.some((d) => d.dateStr === selectedForecastDate)
    ) {
      return selectedForecastDate;
    }
    return dailyList[0]?.dateStr || twTime().format("YYYY-MM-DD");
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
      skyTextPrimary,
    );
  }, [activeDayForecast, periods, skyTextPrimary]);

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
