import React, { useState, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import NearMeIcon from "@mui/icons-material/NearMe";
import SyncIcon from "@mui/icons-material/Sync";
import dayjs from "dayjs";
import type { WeatherPeriod } from "../types/weather";
import WeatherIcon from "../components/WeatherIcon/WeatherIcon";
import MobileHudMetrics from "./MobileHudMetrics";
import MobileHourlyForecast from "./MobileHourlyForecast";
import type { HudMetricItem, SkyTheme } from "./types";
import { useWeatherStore } from "../store/weatherStore";

interface MobilePage1Props {
  active: boolean;
  selectedCity: string;
  selectedTownship: string;
  isAutoLocation?: boolean;
  onOpenLocation: () => void;
  period: WeatherPeriod | null;
  dayHighLow: { max: string; min: string };
  page1Metrics: HudMetricItem[];
  livingTip?: string;
  periods: WeatherPeriod[];
  autoCurrentPeriod: WeatherPeriod | null;
  selectedPeriodTime: string | null;
  onSelectPeriod: (startTime: string) => void;
  lastFetchedAt?: string | null;
  onGoToPage2: () => void;
  sky: SkyTheme;
  onRefresh?: () => Promise<void>;
}

export default function MobilePage1({
  active,
  selectedCity,
  selectedTownship,
  isAutoLocation,
  onOpenLocation,
  period,
  dayHighLow,
  page1Metrics,
  livingTip,
  periods,
  autoCurrentPeriod,
  selectedPeriodTime,
  onSelectPeriod,
  lastFetchedAt,
  onGoToPage2,
  sky,
  onRefresh,
}: MobilePage1Props) {
  const realtimeTemps = useWeatherStore((s) => s.realtimeTemps);
  const realtimeWinds = useWeatherStore((s) => s.realtimeWinds);
  const realtimeWeatherMap = useWeatherStore((s) => s.realtimeWeather);
  const townshipStations = useWeatherStore((s) => s.townshipStations);
  const userSelectedStations = useWeatherStore((s) => s.userSelectedStations);
  const setUserSelectedStation = useWeatherStore((s) => s.setUserSelectedStation);

  const isViewingCurrent =
    !selectedPeriodTime || selectedPeriodTime === autoCurrentPeriod?.startTime;
  const townshipKey = selectedTownship
    ? `${selectedCity}_${selectedTownship}`
    : null;

  // 取得候選測站列表
  const stationsList = townshipKey && townshipStations[townshipKey] ? townshipStations[townshipKey] : [];
  const manualStationName = townshipKey ? userSelectedStations[townshipKey] : null;
  const activeStation = stationsList.find((st) => st.stationName === manualStationName) || (townshipKey && realtimeWeatherMap[townshipKey] ? realtimeWeatherMap[townshipKey] : null);

  const realtimeTemp = activeStation?.temp || (townshipKey && realtimeTemps[townshipKey] ? realtimeTemps[townshipKey] : realtimeTemps[selectedCity]);
  const realtimeStationName = activeStation?.stationName || (townshipKey && realtimeWinds[townshipKey]?.stationName ? realtimeWinds[townshipKey].stationName : null);
  const realtimeWxText = activeStation?.weather;
  const realtimeRainNow = activeStation?.rainNow ?? 0;

  const displayHeroTemp =
    isViewingCurrent && realtimeTemp ? realtimeTemp : period?.temperature;
  // 若為當前實況且現場測站有回報天氣或降雨，優先使用測站現場實況（例如：陰有雨）
  const displayHeroWeather =
    isViewingCurrent && realtimeWxText
      ? realtimeWxText
      : (isViewingCurrent && realtimeRainNow > 0 && period?.weather && !period.weather.includes("雨"))
      ? `${period.weather}有雨`
      : period?.weather;

  // ── 下拉更新 (Pull to Refresh) 智慧阻尼與極簡浮動指示器 ──
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!active || isRefreshing) return;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || !active || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 8) {
      // 橡皮筋阻尼：下拉手感細緻緊湊
      const damping = Math.min(65, Math.pow(diff, 0.8) * 1.3);
      setPullDistance(damping);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!active) return;
    touchStartY.current = null;
    if (pullDistance >= 45 && !isRefreshing && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(42);
      try {
        await onRefresh();
      } catch (err) {
        console.warn("Pull refresh failed", err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 400);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <Box
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{
        width: "100%",
        height: "100%",
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
        position: "relative",
      }}
    >
      {/* ── 原生 iOS 靈動極簡浮動指示器 (無任何橫幅或色塊，純粹精緻浮動小圓環) ── */}
      {(pullDistance > 12 || isRefreshing) && (
        <Box
          sx={{
            position: "absolute",
            top: `calc(env(safe-area-inset-top, 16px) + ${pullDistance * 0.7}px)`,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99,
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: "rgba(15, 23, 42, 0.72)",
            border: `1px solid ${sky.neonPrimary}55`,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: `0 4px 16px rgba(0, 0, 0, 0.4), 0 0 12px ${sky.neonPrimary}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            transition: isRefreshing
              ? "all 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)"
              : "opacity 0.15s ease",
            opacity: isRefreshing ? 1 : Math.min(1, pullDistance / 40),
            scale: isRefreshing ? "1" : `${Math.min(1, 0.5 + pullDistance / 90)}`,
          }}
        >
          {isRefreshing ? (
            <CircularProgress
              size={18}
              thickness={4.5}
              sx={{ color: sky.neonPrimary }}
            />
          ) : (
            <SyncIcon
              sx={{
                color: sky.neonPrimary,
                fontSize: 20,
                transform: `rotate(${(pullDistance / 45) * 360}deg)`,
                transition: "transform 0.05s linear",
              }}
            />
          )}
        </Box>
      )}
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
            gap: 0.5,
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
                width: 150,
                height: 150,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                filter: `drop-shadow(0 0 20px ${sky.neonPrimary}73) drop-shadow(0 8px 18px rgba(0,0,0,0.38))`,
                transition: "transform 0.3s ease",
                "&:active": { transform: "scale(1.05)" },
              }}
            >
              <WeatherIcon
                weatherCode={displayHeroWeather?.includes("雨") ? "08" : period.weatherCode}
                weather={displayHeroWeather || period.weather}
                startTime={period.startTime}
                size={150}
                priority
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
                fontSize: { xs: 30, sm: 30 },
                fontWeight: 800,
                color: sky.textPrimary,
                letterSpacing: 1.2,
                textShadow: `0 0 12px ${sky.neonPrimary}4d`,
                lineHeight: 1.2,
              }}
            >
              {displayHeroWeather}
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
              {displayHeroTemp}°
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
                fontSize: 20,
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
            {/* 地點選單 */}
            <Box
              onClick={onOpenLocation}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: "10px",
                py: "3px",
                borderRadius: "8px",
                cursor: "pointer",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
                transition: "all 0.2s ease",
                bgcolor: isAutoLocation ? `${sky.neonPrimary}15` : "transparent",
                border: isAutoLocation ? `1px solid ${sky.neonPrimary}40` : "1px solid transparent",
                "&:active": {
                  opacity: 0.65,
                  bgcolor: `${sky.neonPrimary}25`,
                  transform: "scale(0.97)",
                },
              }}
            >
              {isAutoLocation ? (
                <NearMeIcon
                  sx={{
                    color: sky.neonPrimary,
                    fontSize: 18,
                    filter: `drop-shadow(0 0 6px ${sky.neonPrimary})`,
                  }}
                />
              ) : null}
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: sky.textPrimary,
                  letterSpacing: 0.5,
                  textShadow: `0 0 10px ${sky.neonPrimary}50`,
                }}
              >
                {selectedCity} · {selectedTownship}
              </Typography>
              {!isAutoLocation ? (
                <LocationOnIcon sx={{ color: "#fff", fontSize: 22 }} />
              ) : null}
            </Box>
          </Box>

          {/* 最後更新數據時間與即測代表站 (支援多測站點擊循環切換) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              height: 18,
              mb: 0.5,
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.45)",
                fontWeight: 500,
                letterSpacing: 0.3,
              }}
            >
              更新:{" "}
              {lastFetchedAt
                ? dayjs(lastFetchedAt).format("HH:mm")
                : dayjs().format("HH:mm")}
            </Typography>

            {/* 即測代表站標籤 (多站時點擊可切換) */}
            {isViewingCurrent && realtimeStationName && (
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  if (townshipKey && stationsList.length > 1) {
                    const currentIndex = stationsList.findIndex((st) => st.stationName === realtimeStationName);
                    const nextIndex = (currentIndex + 1) % stationsList.length;
                    setUserSelectedStation(townshipKey, stationsList[nextIndex].stationName);
                  }
                }}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  px: 0.8,
                  py: 0.1,
                  borderRadius: "10px",
                  bgcolor: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  cursor: stationsList.length > 1 ? "pointer" : "default",
                  "&:active": {
                    transform: stationsList.length > 1 ? "scale(0.95)" : "none",
                    bgcolor: "rgba(255, 255, 255, 0.18)",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: 11.5,
                    color: sky.textSecondary,
                    fontWeight: 600,
                  }}
                >
                  📡 {realtimeStationName}
                  {stationsList.length > 1 && ` ⇄`}
                </Typography>
              </Box>
            )}
          </Box>

          {/* 方案 B：動態穿衣與生活指南提示膠囊列 (微光毛玻璃晶片卡) */}
          {livingTip && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.8,
                py: 0.65,
                mt: 0.35,
                borderRadius: "20px",
                background: sky.cardItemGradient || "linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.05) 100%)",
                border: `1px solid ${sky.dimBorder || "rgba(255, 255, 255, 0.22)"}`,
                backdropFilter: "blur(16px) saturate(160%)",
                WebkitBackdropFilter: "blur(16px) saturate(160%)",
                boxShadow: `0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 0 12px ${sky.neonPrimary}15`,
                animation: "fadeIn 0.4s ease",
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: 13, sm: 13.5 },
                  fontWeight: 700,
                  color: sky.textPrimary,
                  letterSpacing: 0.4,
                  textShadow: `0 0 10px ${sky.neonPrimary}44`,
                  lineHeight: 1.3,
                }}
              >
                {livingTip}
              </Typography>
            </Box>
          )}
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
          查看未來 6 天趨勢與生活指南 ↓
        </Typography>
        <ExpandMoreIcon sx={{ fontSize: 20, color: "inherit" }} />
      </Box>
    </Box>
  );
}
