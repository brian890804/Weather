import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { WeatherPeriod } from "../types/weather";
import WeatherIcon from "../components/WeatherIcon/WeatherIcon";
import MobileHudMetrics from "./MobileHudMetrics";
import MobileHourlyForecast from "./MobileHourlyForecast";
import type { HudMetricItem, SkyTheme } from "./types";
import LocationOnIcon from "@mui/icons-material/LocationOn";

interface MobilePage1Props {
  active: boolean;
  selectedCity: string;
  selectedTownship: string;
  onOpenLocation: () => void;
  onOpenApiKeyDialog: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  cooldown: number;
  period: WeatherPeriod | null;
  dayHighLow: { max: string; min: string };
  page1Metrics: HudMetricItem[];
  periods: WeatherPeriod[];
  autoCurrentPeriod: WeatherPeriod | null;
  selectedPeriodTime: string | null;
  onSelectPeriod: (startTime: string) => void;
  onGoToPage2: () => void;
  sky: SkyTheme;
}

export default function MobilePage1({
  active,
  selectedCity,
  selectedTownship,
  onOpenLocation,
  onOpenApiKeyDialog,
  onRefresh,
  refreshing,
  cooldown,
  period,
  dayHighLow,
  page1Metrics,
  periods,
  autoCurrentPeriod,
  selectedPeriodTime,
  onSelectPeriod,
  onGoToPage2,
  sky,
}: MobilePage1Props) {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        "@media (min-height: 900px)": {
          justifyContent: "space-between",
          pt: "max(20vh, env(safe-area-inset-top, 16px))",
        },
        boxSizing: "border-box",
        px: { xs: 2, sm: 2.5 },
        pt: "env(safe-area-inset-top, 16px)",
        pb: "max(8px, env(safe-area-inset-bottom, 8px))",
        overflow: "hidden",
        transform: active ? "translateY(0%)" : "translateY(-100%)",
        opacity: active ? 1 : 0,
        pointerEvents: active ? "auto" : "none",
        transition:
          "transform 0.38s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.28s ease",
        willChange: "transform, opacity",
      }}
    >
      {/* 核心天氣看板 (依用戶指定順序：圖示 -> 氣象 -> 溫度 -> 最高最低 -> 地點) */}
      {period && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            py: 0.1,
            flexShrink: 0,
          }}
        >
          {/* 1. 天氣圖示 */}
          <Box
            sx={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              my: 0.1,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                width: { xs: 96, sm: 110 },
                height: { xs: 96, sm: 110 },
                borderRadius: "50%",
                background: sky.neonAuraBg,
                filter: "blur(16px)",
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                position: "relative",
                filter: `drop-shadow(0 0 20px ${sky.neonPrimary}73) drop-shadow(0 8px 18px rgba(0,0,0,0.38))`,
                transition: "transform 0.3s ease",
                "&:active": { transform: "scale(1.05)" },
              }}
            >
              <WeatherIcon
                weatherCode={period.weatherCode}
                weather={period.weather}
                startTime={period.startTime}
                size={76}
              />
            </Box>
          </Box>

          {/* 2. 氣象資訊 (固定最小高度，切換時段文字長短不跳動) */}
          <Box
            sx={{
              minHeight: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 16.5, sm: 18 },
                fontWeight: 800,
                color: sky.textPrimary,
                letterSpacing: 1.2,
                textShadow: `0 0 12px ${sky.neonPrimary}4d`,
                lineHeight: 1.2,
              }}
            >
              {period.weather}
            </Typography>
          </Box>

          {/* 3. 溫度 (固定高度與行高，切換時段保持不動) */}
          <Box
            sx={{
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              my: 0.05,
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 56, sm: 64 },
                fontWeight: 300,
                color: sky.textPrimary,
                lineHeight: 1,
                letterSpacing: -1,
                textShadow: `0 0 24px ${sky.neonPrimary}47, 0 2px 10px rgba(0,0,0,0.22)`,
              }}
            >
              {period.temperature}°
            </Typography>
          </Box>

          {/* 4. 最高最低 (固定高度，切換時段保持不動) */}
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
                fontSize: 12.5,
                fontWeight: 600,
                color: sky.textSecondary,
                letterSpacing: 0.5,
              }}
            >
              最高 {dayHighLow.max}° · 最低 {dayHighLow.min}°
            </Typography>
          </Box>
          {/* 5. 地點與右側功能行為按鈕 (固定寬高位置，點擊保持不動) */}
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              my: 0.25,
              height: 36,
              flexShrink: 0,
            }}
          >
            {/* 地點選單（無 icon，風格與整體氣象排版統一，帶有科技感點選虛線） */}
            <Box
              onClick={onOpenLocation}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: "10px",
                py: "3px",
                cursor: "pointer",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
                transition: "all 0.2s ease",
                "&:active": {
                  opacity: 0.65,
                  bgcolor: `${sky.neonPrimary}25`,
                  transform: "scale(0.97)",
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: 14.5,
                  fontWeight: 800,
                  color: sky.textPrimary,
                  letterSpacing: 0.5,
                  textShadow: `0 0 10px ${sky.neonPrimary}50`,
                }}
              >
                {selectedCity} · {selectedTownship}
              </Typography>
              <LocationOnIcon sx={{ color: "#fff", fontSize: 22 }} />
            </Box>
          </Box>
        </Box>
      )}

      {/* Cyberpunk 圓形 HUD 氣象指標環 */}
      <MobileHudMetrics metrics={page1Metrics} sky={sky} />

      {/* 逐 3 小時預報 */}
      <MobileHourlyForecast
        periods={periods}
        autoCurrentPeriod={autoCurrentPeriod}
        selectedPeriodTime={selectedPeriodTime}
        onSelectPeriod={onSelectPeriod}
        sky={sky}
      />

      {/* 底部切換至第 2 頁按鈕 */}
      <Box
        onClick={onGoToPage2}
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: "8px",
          cursor: "pointer",
          flexShrink: 0,
          borderRadius: "8px",
          gap: "4px",
          color: sky.textSecondary,
          transition: "opacity 0.2s ease",
          "&:active": { opacity: 0.7 },
        }}
      >
        <Typography sx={{ fontSize: 13, color: "inherit", fontWeight: 700 }}>
          查看未來 7 天趨勢與生活指南 ↓
        </Typography>
        <ExpandMoreIcon sx={{ fontSize: 20, color: "inherit" }} />
      </Box>
    </Box>
  );
}
