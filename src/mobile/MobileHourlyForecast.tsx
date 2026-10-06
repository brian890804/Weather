import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import type { WeatherPeriod } from "../types/weather";
import WeatherIcon from "../components/WeatherIcon/WeatherIcon";
import type { SkyTheme } from "./types";
import { useWeatherStore } from "../store/weatherStore";

interface MobileHourlyForecastProps {
  periods: WeatherPeriod[];
  autoCurrentPeriod: WeatherPeriod | null;
  selectedPeriodTime: string | null;
  onSelectPeriod: (startTime: string) => void;
  sky: SkyTheme;
}

export default function MobileHourlyForecast({
  periods,
  autoCurrentPeriod,
  selectedPeriodTime,
  onSelectPeriod,
  sky,
}: MobileHourlyForecastProps) {
  const realtimeTemps = useWeatherStore((s) => s.realtimeTemps);
  const realtimeWeatherMap = useWeatherStore((s) => s.realtimeWeather);
  const townshipStations = useWeatherStore((s) => s.townshipStations);
  const userSelectedStations = useWeatherStore((s) => s.userSelectedStations);
  const selectedCity = useWeatherStore((s) => s.selectedCity);
  const selectedTownship = useWeatherStore((s) => s.selectedTownship);
  const townshipKey = selectedTownship
    ? `${selectedCity}_${selectedTownship}`
    : null;

  const stationsList = townshipKey && townshipStations[townshipKey] ? townshipStations[townshipKey] : [];
  const manualStationName = townshipKey ? userSelectedStations[townshipKey] : null;
  const activeStation = stationsList.find((st) => st.stationName === manualStationName) || (townshipKey && realtimeWeatherMap[townshipKey] ? realtimeWeatherMap[townshipKey] : null);

  const realtimeTemp =
    activeStation?.temp ||
    (townshipKey && realtimeTemps[townshipKey]
      ? realtimeTemps[townshipKey]
      : realtimeTemps[selectedCity]);
  const realtimeWxText = activeStation?.weather;
  const realtimeRainNow = activeStation?.rainNow ?? 0;
  const isRealtimeRaining = Boolean(realtimeWxText?.includes("雨") || realtimeRainNow > 0);

  return (
    <Box
      sx={{
        p: "4px 0 2px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        my: 0.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: "4px",
          mb: "10px",
        }}
      >
        <Typography
          sx={{
            fontSize: 17,
            fontWeight: 700,
            color: "#FFF",
            letterSpacing: 0.3,
          }}
        >
          ⏱️ 逐 3 小時預報
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          touchAction: "pan-x",
          overscrollBehaviorX: "contain",
          scrollSnapType: "x mandatory",
          "&::-webkit-scrollbar": { display: "none" },
          pb: "2px",
        }}
      >
        {periods.map((p) => {
          const isCur = p.startTime === autoCurrentPeriod?.startTime;
          const isSel = selectedPeriodTime
            ? p.startTime === selectedPeriodTime
            : isCur;
          const pv = parseInt(p.probabilityOfPrecipitation) || 0;
          return (
            <Box
              key={p.startTime}
              onClick={() => onSelectPeriod(p.startTime)}
              sx={{
                flex: "0 0 calc((100% - 24px) / 4)",
                width: "calc((100% - 24px) / 4)",
                minWidth: "calc((100% - 24px) / 4)",
                maxWidth: "calc((100% - 24px) / 4)",
                boxSizing: "border-box",
                scrollSnapAlign: "start",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: "8px",
                px: "2px",
                gap: "2px",
                background: isSel
                  ? `linear-gradient(135deg, ${sky.neonPrimary}38 0%, ${sky.neonSecondary}1f 100%)`
                  : sky.cardItemGradient,
                border: isSel
                  ? `1px solid ${sky.neonPrimary}99`
                  : `1px solid ${sky.dimBorder}`,
                boxShadow: isSel
                  ? `0 0 14px ${sky.neonPrimary}4d`
                  : "0 2px 6px rgba(0,0,0,0.18)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                WebkitTapHighlightColor: "transparent",
                "&:active": { transform: "scale(0.96)" },
              }}
            >
              {/* 1. 日期標籤 */}
              <Box
                sx={{
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  noWrap
                  sx={{
                    fontSize: 12,
                    fontWeight: isCur ? 800 : 600,
                    color: isCur ? "#7DD3FC" : sky.textSecondary,
                    lineHeight: 1,
                  }}
                >
                  {dayjs(p.startTime).format("M/D")}
                  {isCur ? " (現)" : ""}
                </Typography>
              </Box>

              {/* 2. 時間標籤 */}
              <Box
                sx={{
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: isCur ? 800 : 700,
                    color: isCur
                      ? "#FFF"
                      : isSel
                        ? sky.textPrimary
                        : sky.textSecondary,
                    lineHeight: 1,
                  }}
                >
                  {dayjs(p.startTime).format("HH:mm")}
                </Typography>
              </Box>

              {/* 3. 天氣圖示 */}
              <Box
                sx={{
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  my: "2px",
                }}
              >
                <WeatherIcon
                  weatherCode={isCur && isRealtimeRaining ? "08" : p.weatherCode}
                  weather={isCur && realtimeWxText ? realtimeWxText : (isCur && realtimeRainNow > 0 ? `${p.weather}有雨` : p.weather)}
                  startTime={p.startTime}
                  size={50}
                />
              </Box>

              {/* 4. 降雨機率 */}
              <Box
                sx={{
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: pv > 0 ? "#7DD3FC" : "transparent",
                    lineHeight: 1,
                  }}
                >
                  {pv > 0 ? `${pv}%` : "-"}
                </Typography>
              </Box>

              {/* 5. 氣溫 */}
              <Box
                sx={{
                  width: "100%",
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    width: "100%",
                    textAlign: "center",
                    fontSize: isCur && realtimeTemp ? 16.5 : 17.5,
                    fontWeight: 800,
                    color: sky.textPrimary,
                    lineHeight: 1,
                  }}
                >
                  {isCur && realtimeTemp
                    ? `${realtimeTemp}°`
                    : `${p.temperature}°`}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
