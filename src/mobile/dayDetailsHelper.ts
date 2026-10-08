import React from "react";
import dayjs from "dayjs";
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
  currentPeriod: WeatherPeriod | null,
  skyTextPrimary: string,
): ActiveDayDetails {
  const isToday = activeDayForecast.dateStr === dayjs().format("YYYY-MM-DD");

  const dayPeriods = periods.filter(
    (p) =>
      dayjs(p.startTime).format("YYYY-MM-DD") === activeDayForecast.dateStr,
  );

  // ── 全日指標統計：聚合當天所有時段（若有）計算全日最高/最低、最大降雨、全日平均濕度、盛行風與最大風力等 ──
  const validAppTemps = dayPeriods
    .map((p) => parseFloat(p.maxApparentTemperature || p.temperature))
    .filter((v) => !isNaN(v));
  const appTempMin =
    validAppTemps.length > 0
      ? Math.min(...validAppTemps)
      : activeDayForecast.minTemp;
  const appTempMax =
    validAppTemps.length > 0
      ? Math.max(...validAppTemps)
      : activeDayForecast.maxTemp;

  // 體感溫度顯示：全日區間 (如 22° ~ 30°C)；若是今天且在看當前時段，顯示當前體感與今日區間
  const appTempValue = `${appTempMin}° ~ ${appTempMax}°C`;
  const diffMax = appTempMax - activeDayForecast.maxTemp;
  const diffLabel =
    diffMax > 0
      ? `全日體感比實際高約 ${diffMax}°`
      : diffMax < 0
        ? `全日體感比實際低約 ${Math.abs(diffMax)}°`
        : "全日體感接近實際氣溫";

  // 降雨機率：全日最大降雨機率 (Max POP)，符合氣象防雨安全準則
  const allDayPops = [
    activeDayForecast.maxPop || 0,
    ...dayPeriods.map((p) => parseInt(p.probabilityOfPrecipitation) || 0),
  ];
  let popVal = Math.max(...allDayPops);
  if (popVal === 0 && (activeDayForecast.weather?.includes("雨") || activeDayForecast.description?.includes("雨"))) {
    popVal = activeDayForecast.weather.includes("陣雨") || activeDayForecast.weather.includes("雷雨") ? 40 : 30;
  }

  // 風向風速：統計當日最大級數與常見風向
  let maxBeaufort = 2;
  let maxWindMs = 0;
  let prevailingDir = "";
  const dirCounts: Record<string, number> = {};

  dayPeriods.forEach((p) => {
    const b = parseInt(p.beaufortScale) || 0;
    if (b > maxBeaufort) maxBeaufort = b;
    const ws = parseFloat(p.windSpeed) || 0;
    if (ws > maxWindMs) maxWindMs = ws;
    const dir =
      p.windDirection && p.windDirection !== "-" ? p.windDirection : "";
    if (dir) {
      dirCounts[dir] = (dirCounts[dir] || 0) + 1;
    }
  });

  const sortedDirs = Object.entries(dirCounts).sort((a, b) => b[1] - a[1]);
  prevailingDir = sortedDirs[0]?.[0] || "偏東風";
  const windSpeed =
    maxWindMs > 0 ? `最大 ${maxWindMs.toFixed(1)} m/s` : `${maxBeaufort} 級風`;
  const windSub = `${prevailingDir} · 最大 ${maxBeaufort} 級 (${beaufortLabel(String(maxBeaufort))})`;

  // 相對濕度：全日平均濕度
  const validHum = dayPeriods
    .map((p) => parseFloat(p.relativeHumidity))
    .filter((v) => !isNaN(v));
  const avgHumidity =
    validHum.length > 0
      ? Math.round(validHum.reduce((a, b) => a + b, 0) / validHum.length)
      : popVal > 50
        ? 78
        : popVal > 20
          ? 70
          : 62;
  const humidity = `${avgHumidity}%`;
  const validDew = dayPeriods
    .map((p) => parseFloat(p.dewPoint))
    .filter((v) => !isNaN(v));
  const avgDew =
    validDew.length > 0
      ? (validDew.reduce((a, b) => a + b, 0) / validDew.length).toFixed(1)
      : null;
  const humSub = avgDew ? `露點 ${avgDew}°C` : "全日平均相對濕度";

  // 紫外線指數：全日最高紫外線
  const validUvs = dayPeriods
    .map((p) => parseInt(p.uvIndex))
    .filter((v) => !isNaN(v) && v >= 0);
  const maxUvVal = validUvs.length > 0 ? Math.max(...validUvs) : null;
  const uvVal =
    maxUvVal !== null
      ? `${maxUvVal} 級`
      : activeDayForecast.weather.includes("晴")
        ? "7 級"
        : activeDayForecast.weather.includes("多雲")
          ? "5 級"
          : "3 級";
  const uvSub =
    maxUvVal !== null
      ? maxUvVal >= 8
        ? "危險/過量級防曬"
        : maxUvVal >= 6
          ? "高量級防曬"
          : maxUvVal >= 3
            ? "中量級防曬"
            : "微量級防護"
      : activeDayForecast.weather.includes("晴")
        ? "高量級防曬"
        : activeDayForecast.weather.includes("多雲")
          ? "中量級防曬"
          : "低量微防護";

  // 舒適度指數：綜合全日舒適度描述
  const comfortDescriptions = Array.from(
    new Set(
      dayPeriods
        .map((p) => p.maxComfortIndexDescription)
        .filter((d) => d && d !== "-"),
    ),
  );
  const comfortVal =
    comfortDescriptions.length > 1
      ? `${comfortDescriptions[0]} 至 ${comfortDescriptions[comfortDescriptions.length - 1]}`
      : comfortDescriptions[0] ||
        (activeDayForecast.maxTemp >= 30
          ? "悶熱"
          : activeDayForecast.maxTemp >= 25
            ? "舒適"
            : activeDayForecast.maxTemp >= 20
              ? "涼爽"
              : "稍有寒意");
  const comfortSub = `氣溫 ${activeDayForecast.minTemp}° ~ ${activeDayForecast.maxTemp}°C`;

  let cloth = {
    title: "短袖輕裝",
    detail: "薄短袖，天氣宜人舒適",
    emoji: "👕",
  };
  if (appTempMax >= 30) {
    cloth = {
      title: "清涼透氣",
      detail: "純棉短袖，注意防曬補水",
      emoji: "☀️",
    };
  } else if (appTempMax >= 25) {
    cloth = {
      title: "短袖輕裝",
      detail: "薄短袖，天氣宜人舒適",
      emoji: "👕",
    };
  } else if (appTempMax >= 20) {
    cloth = {
      title: "輕薄外套",
      detail: "長袖配薄夾克，舒適防風",
      emoji: "🧥",
    };
  } else if (appTempMax >= 15) {
    cloth = { title: "保暖毛衣", detail: "厚上衣與防風外套", emoji: "🧣" };
  } else {
    cloth = {
      title: "防寒大衣",
      detail: "羽絨外套，注意保暖防寒",
      emoji: "🧤",
    };
  }

  // ── 雨具與外出活動邏輯（與 Page 1 嚴格一致：只要天氣文字含「雨」或機率達標即判定帶傘） ──
  const isRainingCondition =
    dayPeriods.some(
      (p) =>
        p.weather && (p.weather.includes("雨") || p.weather.includes("陣雨")),
    ) ||
    (activeDayForecast.weather &&
      (activeDayForecast.weather.includes("雨") ||
        activeDayForecast.weather.includes("陣雨"))) ||
    popVal >= 40;

  const needUmbrella = isRainingCondition || popVal >= 10;

  const rainTipValue = isRainingCondition
    ? activeDayForecast.weather?.includes("陣雨") ||
      dayPeriods.some((p) => p.weather?.includes("陣雨"))
      ? "🌧 陣雨必備雨具"
      : "🌧 務必攜傘"
    : popVal >= 40
      ? "🌧 務必攜傘"
      : popVal >= 10
        ? "☂️ 建議備傘"
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
      value: !needUmbrella && popVal < 20 ? "🏃 適合外出" : "🏠 留意天氣",
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
      value: `${popVal}%`,
      sub: isRainingCondition
        ? "有雨 · 建議攜帶雨具"
        : popVal >= 40
          ? "外出務必帶傘"
          : popVal >= 10
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
