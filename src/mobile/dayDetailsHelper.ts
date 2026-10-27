import React from "react";
import { twTime } from "../utils/time";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import AirIcon from "@mui/icons-material/Air";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import type { WeatherPeriod } from "../types/weather";
import type { DayForecast, ActiveDayDetails } from "./types";
import { beaufortLabel } from "../utils/weatherUtils";

export function computeActiveDayDetails(
  activeDayForecast: DayForecast,
  periods: WeatherPeriod[],
  skyTextPrimary: string,
): ActiveDayDetails {
  const day = activeDayForecast;
  const dayPeriods = periods.filter(
    (p) => twTime(p.startTime).format("YYYY-MM-DD") === day.dateStr,
  );

  // ── 全日指標：優先聚合逐 3 小時時段；該日不在 3 天預報範圍內時，改用一週預報 (F-D0047-091) 的同項數值 ──
  // 任何缺資料的項目一律顯示 "--"，不推估、不填預設值
  const nums = (vals: string[]) => vals.map((v) => parseFloat(v)).filter((v) => !isNaN(v));

  // 體感溫度：全日區間
  const appMaxs = nums(dayPeriods.map((p) => p.maxApparentTemperature));
  const appMins = nums(dayPeriods.map((p) => p.minApparentTemperature));
  const appTempMax: number | null =
    appMaxs.length > 0 ? Math.max(...appMaxs) : day.maxApparentTemp ?? null;
  const appTempMin: number | null =
    appMins.length > 0 ? Math.min(...appMins) : day.minApparentTemp ?? null;
  const appTempValue =
    appTempMin !== null && appTempMax !== null ? `${appTempMin}° ~ ${appTempMax}°C` : "--";
  const hasDayTemp = day.maxTemp > -99 && day.minTemp < 99;
  let diffLabel = "暫無體感資料";
  if (appTempMax !== null && hasDayTemp) {
    const diffMax = Math.round((appTempMax - day.maxTemp) * 10) / 10;
    diffLabel =
      diffMax > 0
        ? `最高體感比最高溫高約 ${diffMax}°`
        : diffMax < 0
          ? `最高體感比最高溫低約 ${Math.abs(diffMax)}°`
          : "最高體感接近最高溫";
  }

  // 降雨機率：全日最大降雨機率 (Max POP)；氣象署未提供時為 null
  const periodPops = dayPeriods
    .map((p) => parseInt(p.probabilityOfPrecipitation))
    .filter((v) => !isNaN(v));
  const popCandidates = [...periodPops, ...(day.maxPop !== null ? [day.maxPop] : [])];
  const popVal: number | null = popCandidates.length > 0 ? Math.max(...popCandidates) : null;

  // 風向風速：統計當日最大級數、最大風速與最常見風向
  const bfts = nums(dayPeriods.map((p) => p.beaufortScale));
  const wss = nums(dayPeriods.map((p) => p.windSpeed));
  const maxBeaufort: number | null = bfts.length > 0 ? Math.max(...bfts) : day.maxBeaufort ?? null;
  const maxWindMs: number | null = wss.length > 0 ? Math.max(...wss) : day.maxWindSpeed ?? null;
  const dirCounts: Record<string, number> = {};
  dayPeriods.forEach((p) => {
    if (p.windDirection && p.windDirection !== "-") {
      dirCounts[p.windDirection] = (dirCounts[p.windDirection] || 0) + 1;
    }
  });
  const prevailingDir =
    Object.entries(dirCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || day.windDirection || "--";
  const windSpeed =
    maxWindMs !== null
      ? `最大 ${maxWindMs.toFixed(1)} m/s`
      : maxBeaufort !== null
        ? `${maxBeaufort} 級風`
        : "--";
  const windSub =
    maxBeaufort !== null
      ? `${prevailingDir} · 最大 ${maxBeaufort} 級 (${beaufortLabel(String(maxBeaufort))})`
      : prevailingDir;

  // 相對濕度：全日平均濕度
  const hums = nums(dayPeriods.map((p) => p.relativeHumidity));
  const avgHumidity: number | null =
    hums.length > 0
      ? Math.round(hums.reduce((a, b) => a + b, 0) / hums.length)
      : day.avgHumidity ?? null;
  const humidity = avgHumidity !== null ? `${avgHumidity}%` : "--";
  const dews = nums(dayPeriods.map((p) => p.dewPoint));
  const avgDew =
    dews.length > 0 ? (dews.reduce((a, b) => a + b, 0) / dews.length).toFixed(1) : null;
  const humSub = avgDew ? `露點 ${avgDew}°C` : "全日平均相對濕度";

  // 紫外線指數：氣象署一週預報提供的當日白天紫外線指數與分級
  const uvVal = day.uvIndex !== undefined ? `${day.uvIndex} 級` : "--";
  const uvSub =
    day.uvIndex !== undefined
      ? day.uvLevel
        ? `${day.uvLevel}${day.uvIndex >= 6 ? " · 注意防曬" : ""}`
        : "紫外線指數"
      : "暫無紫外線資料";

  // 舒適度：依舒適度指數由低到高呈現範圍
  const comfortPairs: { index: number; desc: string }[] = [];
  dayPeriods.forEach((p) => {
    const lo = parseFloat(p.minComfortIndex);
    const hi = parseFloat(p.maxComfortIndex);
    if (!isNaN(lo) && p.minComfortIndexDescription && p.minComfortIndexDescription !== "-") {
      comfortPairs.push({ index: lo, desc: p.minComfortIndexDescription });
    }
    if (!isNaN(hi) && p.maxComfortIndexDescription && p.maxComfortIndexDescription !== "-") {
      comfortPairs.push({ index: hi, desc: p.maxComfortIndexDescription });
    }
  });
  comfortPairs.sort((a, b) => a.index - b.index);
  const comfortLo = comfortPairs[0]?.desc ?? day.comfortRange?.minDesc;
  const comfortHi = comfortPairs[comfortPairs.length - 1]?.desc ?? day.comfortRange?.maxDesc;
  const comfortVal =
    comfortLo && comfortHi
      ? comfortLo === comfortHi
        ? comfortLo
        : `${comfortLo} 至 ${comfortHi}`
      : "--";
  const comfortSub = hasDayTemp ? `氣溫 ${day.minTemp}° ~ ${day.maxTemp}°C` : "--";

  // 穿衣指南依全日最高體感判斷；無體感資料時退回最高溫
  const clothBasis = appTempMax ?? (hasDayTemp ? day.maxTemp : null);

  let cloth = {
    title: "短袖輕裝",
    detail: "薄短袖，天氣宜人舒適",
    emoji: "👕",
  };
  if (clothBasis === null) {
    cloth = { title: "--", detail: "暫無溫度資料", emoji: "👕" };
  } else if (clothBasis >= 30) {
    cloth = {
      title: "清涼透氣",
      detail: "純棉短袖，注意防曬補水",
      emoji: "☀️",
    };
  } else if (clothBasis >= 25) {
    cloth = {
      title: "短袖輕裝",
      detail: "薄短袖，天氣宜人舒適",
      emoji: "👕",
    };
  } else if (clothBasis >= 20) {
    cloth = {
      title: "輕薄外套",
      detail: "長袖配薄夾克，舒適防風",
      emoji: "🧥",
    };
  } else if (clothBasis >= 15) {
    cloth = { title: "保暖毛衣", detail: "厚上衣與防風外套", emoji: "🧣" };
  } else {
    cloth = {
      title: "防寒大衣",
      detail: "羽絨外套，注意保暖防寒",
      emoji: "🧤",
    };
  }

  // ── 雨具與外出活動邏輯（與 Page 1 一致：預報天氣文字含「雨」或機率達標即判定帶傘） ──
  const pop = popVal ?? -1;
  const isRainingCondition =
    dayPeriods.some((p) => p.weather?.includes("雨")) ||
    Boolean(day.weather?.includes("雨")) ||
    pop >= 40;

  const needUmbrella = isRainingCondition || pop >= 10;

  const rainTipValue = isRainingCondition
    ? day.weather?.includes("陣雨") || dayPeriods.some((p) => p.weather?.includes("陣雨"))
      ? "🌧 陣雨必備雨具"
      : "🌧 務必攜傘"
    : pop >= 10
      ? "☂️ 建議備傘"
      : popVal === null
        ? "❔ 暫無降雨機率"
        : "☀️ 無需攜傘";

  const tips = [
    {
      key: "rain",
      label: "雨具提醒",
      value: rainTipValue,
      color: needUmbrella ? "#7DD3FC" : "#34D399",
    },
    {
      key: "activity",
      label: "戶外活動",
      value: !needUmbrella && popVal !== null && popVal < 20 ? "🏃 適合外出" : "🏠 留意天氣",
      color: skyTextPrimary,
    },
  ];

  const bentoCards = [
    {
      key: "apparentTemp",
      icon: React.createElement(ThermostatIcon),
      iconColor: "#FB923C",
      iconBg: "rgba(251,146,60,0.22)",
      label: "體感溫度",
      value: appTempValue,
      sub: diffLabel,
    },
    {
      key: "pop",
      icon: React.createElement(WaterDropIcon),
      iconColor: "#38BDF8",
      iconBg: "rgba(56,189,248,0.22)",
      label: "降雨機率",
      value: popVal !== null ? `${popVal}%` : "--",
      sub: popVal === null
        ? isRainingCondition
          ? "預報有雨 · 氣象署未提供機率"
          : "氣象署未提供降雨機率"
        : isRainingCondition
          ? "預報有雨 · 建議攜帶雨具"
          : pop >= 10
            ? "建議備折疊傘"
            : "降雨機率低",
    },
    {
      key: "wind",
      icon: React.createElement(AirIcon),
      iconColor: "#A5B4FC",
      iconBg: "rgba(165,180,252,0.22)",
      label: "風向風速",
      value: windSpeed,
      sub: windSub,
    },
    {
      key: "humidity",
      icon: React.createElement(WaterDropIcon),
      iconColor: "#2DD4BF",
      iconBg: "rgba(45,212,191,0.22)",
      label: "平均相對濕度",
      value: humidity,
      sub: humSub,
    },
    {
      key: "uv",
      icon: React.createElement(WbSunnyIcon),
      iconColor: "#F59E0B",
      iconBg: "rgba(245,158,11,0.22)",
      label: "紫外線指數",
      value: uvVal,
      sub: uvSub,
    },
    {
      key: "comfort",
      icon: React.createElement(WbSunnyIcon),
      iconColor: "#34D399",
      iconBg: "rgba(52,211,153,0.22)",
      label: "舒適度指數",
      value: comfortVal,
      sub: comfortSub,
    },
  ];

  return {
    dayLabel: activeDayForecast.dayLabel,
    dateStr: activeDayForecast.dateStr,
    description: activeDayForecast.description,
    weather: activeDayForecast.weather,
    bentoCards,
    cloth,
    tips,
  };
}
