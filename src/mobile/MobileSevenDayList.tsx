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
        borderRadius: "12px",
        background: sky.cardGradient,
        border: `1px solid ${sky.neonPrimary}4d`,
        boxShadow: `0 0 24px ${sky.neonPrimary}14`,
        backdropFilter: "blur(20px)",
        p: { xs: "12px 10px", sm: "16px 14px" },
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
                display: "grid",
                gridTemplateColumns: "1.15fr 0.85fr 1fr 1fr",
                alignItems: "center",
                py: "14px",
                px: { xs: "8px", sm: "12px" },
                borderRadius: "8px",
                background: isSelected
                  ? `linear-gradient(135deg, ${sky.neonPrimary}33 0%, ${sky.neonSecondary}1a 100%)`
                  : sky.cardItemGradient,
                border: `1px solid ${
                  isSelected ? `${sky.neonPrimary}99` : `${sky.neonPrimary}18`
                }`,
                boxShadow: isSelected
                  ? `0 0 14px ${sky.neonPrimary}3d`
                  : "0 2px 6px rgba(0,0,0,0.15)",
                cursor: "pointer",
                transition:
                  "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
                WebkitTapHighlightColor: "transparent",
                "&:active": { opacity: 0.75, transform: "scale(0.98)" },
              }}
            >
              {/* 1. 日期與星期 (左側自然對齊，不擁擠不碰圖示) */}
              <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, pr: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: { xs: 13.5, sm: 14.5 },
                    fontWeight: 800,
                    color: isSelected ? sky.neonPrimary : sky.textPrimary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {day.dayLabel}
                </Typography>
              </Box>

              {/* 2. 天氣圖示 (居中均分) */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <WeatherIcon
                  weatherCode={day.weatherCode}
                  weather={day.weather}
                  size={28}
                />
              </Box>

              {/* 3. 降雨 / 濕度機率 (居中均分) */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {day.maxPop > 0 ? (
                  <Typography
                    sx={{
                      fontSize: { xs: 12.5, sm: 13 },
                      fontWeight: 800,
                      color: sky.neonPrimary,
                      fontFamily: "monospace, sans-serif",
                      textShadow: `0 0 8px ${sky.neonPrimary}99`,
                      whiteSpace: "nowrap",
                      textAlign: "center",
                    }}
                  >
                    💧{day.maxPop}%
                  </Typography>
                ) : (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "rgba(255, 255, 255, 0.25)",
                      fontFamily: "monospace, sans-serif",
                      textAlign: "center",
                    }}
                  >
                    -
                  </Typography>
                )}
              </Box>

              {/* 4. 最高最低氣溫 (右側嚴格對齊) */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: 13.5, sm: 14.5 },
                    fontWeight: 800,
                    color: sky.textPrimary,
                    fontFamily: "monospace, sans-serif",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}
                >
                  {day.maxTemp}° / {day.minTemp}°
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* 選中日期的預報詳情說明卡 */}
      {activeDayDetails?.description && (
          <Box
            sx={{
              mt: "12px",
              p: "12px 14px",
              borderRadius: "8px",
              background: sky.cardItemGradient,
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
