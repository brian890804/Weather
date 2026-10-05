import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import WeatherIcon from "../components/WeatherIcon/WeatherIcon";
import type { DayForecast, ActiveDayDetails, SkyTheme } from "./types";

interface MobileSevenDayListProps {
  dailyList: DayForecast[];
  activeForecastDate: string;
  onSelectForecastDate: (dateStr: string) => void;
  activeDayDetails: ActiveDayDetails | null;
  sky: SkyTheme;
}

export default function MobileSevenDayList({
  dailyList,
  activeForecastDate,
  onSelectForecastDate,
  activeDayDetails,
  sky,
}: MobileSevenDayListProps) {
  return (
    <Box
      sx={{
        borderRadius: "10px",
        bgcolor: sky.dimGlass,
        border: `1px solid ${sky.neonPrimary}4d`,
        boxShadow: `0 0 24px ${sky.neonPrimary}14`,
        backdropFilter: "blur(20px)",
        p: "14px",
        flexShrink: 0,
      }}
    >
      {/* 7 日垂直清單 */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {dailyList.map((day) => {
          const isSelected = activeForecastDate === day.dateStr;
          return (
            <Box
              key={day.dateStr}
              onClick={() => onSelectForecastDate(day.dateStr)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: "15px",
                px: "10px",
                borderRadius: "8px",
                bgcolor: isSelected ? `${sky.neonPrimary}24` : "transparent",
                border: `1px solid ${
                  isSelected ? `${sky.neonPrimary}80` : `${sky.neonPrimary}14`
                }`,
                boxShadow: isSelected
                  ? `0 0 12px ${sky.neonPrimary}38`
                  : "none",
                cursor: "pointer",
                transition:
                  "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
                WebkitTapHighlightColor: "transparent",
                "&:active": { opacity: 0.75 },
              }}
            >
              {/* 日期與星期 */}
              <Box sx={{ minWidth: 72 }}>
                <Typography
                  sx={{
                    fontSize: 14.5,
                    fontWeight: 800,
                    color: isSelected ? sky.neonPrimary : sky.textPrimary,
                  }}
                >
                  {day.dayLabel}
                </Typography>
              </Box>

              {/* 天氣圖案與文字 */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flex: 1,
                  px: 1,
                }}
              >
                <WeatherIcon
                  weatherCode={day.weatherCode}
                  weather={day.weather}
                  size={28}
                />
                {/* 降雨機率 */}
                <Box sx={{ width: 54, textAlign: "right" }}>
                  {day.maxPop > 0 ? (
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        fontWeight: 800,
                        color: sky.neonPrimary,
                        fontFamily: "monospace, sans-serif",
                        textShadow: `0 0 8px ${sky.neonPrimary}99`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      💧{day.maxPop}%
                    </Typography>
                  ) : (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "rgba(255, 255, 255, 0.2)",
                        fontFamily: "monospace, sans-serif",
                      }}
                    >
                      -
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* 氣溫 */}
              <Typography
                sx={{
                  width: 82,
                  fontSize: 14.5,
                  fontWeight: 800,
                  color: sky.textPrimary,
                  textAlign: "right",
                  fontFamily: "monospace, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {day.maxTemp}° / {day.minTemp}°
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* 選中日期的預報詳情說明卡 */}
      {activeDayDetails?.description && (
        <Box
          sx={{
            mt: "10px",
            p: "10px 12px",
            borderRadius: "8px",
            bgcolor: "rgba(255, 255, 255, 0.08)",
            border: `1px solid ${sky.dimBorder}`,
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 700,
                color: sky.accentText,
                mb: "3px",
              }}
            >
              💡 {activeDayDetails.dayLabel} (
              {dayjs(activeDayDetails.dateStr).format("M/D")}) 預報詳情
            </Typography>
            <Typography
              sx={{
                fontSize: 12.5,
                color: sky.textPrimary,
                lineHeight: 1.5,
              }}
            >
              {activeDayDetails.description}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
