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
    (p) => dayjs(p.startTime).format("YYYY-MM-DD") === activeDayForecast.dateStr,
  );

  const repPeriod =
    isToday && currentPeriod
      ? currentPeriod
      : dayPeriods.find((p) => {
          const h = dayjs(p.startTime).hour();
          return h >= 11 && h <= 15;
        }) ||
        dayPeriods[0] ||
        null;

  const appTemp = repPeriod?.maxApparentTemperature
    ? Number(repPeriod.maxApparentTemperature)
    : activeDayForecast.maxTemp;
  const actTemp = repPeriod?.temperature
    ? Number(repPeriod.temperature)
    : Math.round((activeDayForecast.maxTemp + activeDayForecast.minTemp) / 2);
  const diff = appTemp - actTemp;
  const diffLabel =
    diff > 0
      ? `比實際高 ${diff}°`
      : diff < 0
        ? `比實際低 ${Math.abs(diff)}°`
        : "體感接近實際";

  const popVal = repPeriod?.probabilityOfPrecipitation
    ? parseInt(repPeriod.probabilityOfPrecipitation) || 0
    : activeDayForecast.maxPop || 0;

  const windSpeed = repPeriod?.windSpeed
    ? `${repPeriod.windSpeed} m/s`
    : "2~3 級";
  const windSub = repPeriod?.windDirection
    ? `${repPeriod.windDirection} · ${repPeriod.beaufortScale || 2}級 (${beaufortLabel(repPeriod.beaufortScale || "2")})`
    : "偏東風 · 陣風微弱";

  const humidity = repPeriod?.relativeHumidity
    ? `${repPeriod.relativeHumidity}%`
    : `${popVal > 50 ? 78 : popVal > 20 ? 70 : 62}%`;
  const humSub = repPeriod?.dewPoint
    ? `露點 ${repPeriod.dewPoint}°C`
    : "全日平均濕度";

  const uvVal =
    repPeriod?.uvIndex && repPeriod.uvIndex !== "-"
      ? `${repPeriod.uvIndex} 級`
      : activeDayForecast.weather.includes("晴")
        ? "7 級"
        : activeDayForecast.weather.includes("多雲")
          ? "5 級"
          : "3 級";
  const uvSub = repPeriod?.uvExposureLevel
    ? `${repPeriod.uvExposureLevel}防護`
    : activeDayForecast.weather.includes("晴")
      ? "高量級防曬"
      : activeDayForecast.weather.includes("多雲")
        ? "中量級防曬"
        : "低量微防護";

  const comfortVal = repPeriod?.maxComfortIndexDescription
    ? repPeriod.maxComfortIndexDescription
    : activeDayForecast.maxTemp >= 30
      ? "悶熱"
      : activeDayForecast.maxTemp >= 25
        ? "舒適"
        : activeDayForecast.maxTemp >= 20
          ? "涼爽"
          : "稍有寒意";
  const comfortSub = `氣溫 ${activeDayForecast.minTemp}° ~ ${activeDayForecast.maxTemp}°`;

  let cloth = {
    title: "短袖輕裝",
    detail: "薄短袖，天氣宜人舒適",
    emoji: "👕",
  };
  if (appTemp >= 30) {
    cloth = {
      title: "清涼透氣",
      detail: "純棉短袖，注意防曬補水",
      emoji: "☀️",
    };
  } else if (appTemp >= 25) {
    cloth = {
      title: "短袖輕裝",
      detail: "薄短袖，天氣宜人舒適",
      emoji: "👕",
    };
  } else if (appTemp >= 20) {
    cloth = {
      title: "輕薄外套",
      detail: "長袖配薄夾克，舒適防風",
      emoji: "🧥",
    };
  } else if (appTemp >= 15) {
    cloth = { title: "保暖毛衣", detail: "厚上衣與防風外套", emoji: "🧣" };
  } else {
    cloth = {
      title: "防寒大衣",
      detail: "羽絨外套，注意保暖防寒",
      emoji: "🧤",
    };
  }

  const tips = [
    {
      key: "rain",
      label: "雨具提醒",
      value:
        popVal >= 50
          ? "🌧 務必攜傘"
          : popVal >= 30
            ? "☂️ 建議備傘"
            : "☀️ 無需攜傘",
      color: popVal >= 30 ? "#7DD3FC" : "#34D399",
    },
    {
      key: "activity",
      label: "戶外活動",
      value: popVal < 30 ? "🏃 適合外出" : "🏠 建議待室內",
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
      value: `${appTemp}°C`,
      sub: diffLabel,
    },
    {
      key: "pop",
      icon: React.createElement(WaterDropIcon),
      iconColor: "#38BDF8",
      iconBg: "rgba(56,189,248,0.22)",
      label: "降雨機率",
      value: `${popVal}%`,
      sub:
        popVal >= 50
          ? "建議攜帶雨具"
          : popVal >= 20
            ? "局部短暫陣雨"
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
      label: "相對濕度",
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
