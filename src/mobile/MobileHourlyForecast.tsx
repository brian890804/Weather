import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import type { WeatherPeriod } from "../types/weather";
import WeatherIcon from "../components/WeatherIcon/WeatherIcon";
import type { SkyTheme } from "./types";

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
          mb: "6px",
        }}
      >
        <Typography
          sx={{
            fontSize: 13.5,
            fontWeight: 700,
            color: sky.textSecondary,
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
                bgcolor: isSel ? `${sky.neonPrimary}22` : "transparent",
                border: isSel
                  ? `1px solid ${sky.neonPrimary}8c`
                  : "1px solid transparent",
                boxShadow: isSel ? `0 0 12px ${sky.neonPrimary}40` : "none",
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
                    fontSize: 11,
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
                    fontSize: 14.5,
                    fontWeight: isCur ? 800 : 700,
                    color: isCur
                      ? "#FFFFFF"
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
                  weatherCode={p.weatherCode}
                  weather={p.weather}
                  startTime={p.startTime}
                  size={34}
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
                    fontSize: 12,
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
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 16.5,
                    fontWeight: 800,
                    color: sky.textPrimary,
                    lineHeight: 1,
                    fontFamily: "monospace, sans-serif",
                  }}
                >
                  {p.temperature}°
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
