import React, { useState, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocationOnIcon from "@mui/icons-material/LocationOn";
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

  // ── 下拉更新 (Pull to Refresh) 狀態與阻尼計算 ──
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const isPulling = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!active || isRefreshing) return;
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || !active || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    // 只有向下拉動且超過 10px 時觸發下拉更新
    if (diff > 10) {
      isPulling.current = true;
      // 橡皮筋阻尼效果：最大拉動距離 85px
      const damping = Math.min(85, Math.pow(diff, 0.85) * 1.5);
      setPullDistance(damping);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!active) return;
    touchStartY.current = null;
    if (pullDistance >= 55 && !isRefreshing && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(50); // 定格在 50px 呈現旋轉載入
      try {
        await onRefresh();
      } catch (err) {
        console.warn("Pull refresh failed", err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
    isPulling.current = false;
  };

  return (
    <Box
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
        transition: isRefreshing
          ? "none"
          : "transform 0.38s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.28s ease",
        willChange: "transform, opacity",
      }}
    >
      {/* ── 下拉更新發光霓虹頂部提示區塊 ── */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${pullDistance}px`,
          zIndex: 99,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          overflow: "hidden",
          transition: isRefreshing ? "height 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)" : "none",
          background: `linear-gradient(180deg, ${sky.neonPrimary}26 0%, transparent 100%)`,
          borderBottom: pullDistance > 20 ? `1px solid ${sky.neonPrimary}44` : "none",
          boxShadow: pullDistance > 30 ? `0 4px 20px ${sky.neonPrimary}33` : "none",
          pointerEvents: "none",
        }}
      >
        {pullDistance > 15 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 0.5,
              borderRadius: "20px",
              bgcolor: "rgba(10, 20, 35, 0.75)",
              border: `1px solid ${sky.neonPrimary}66`,
              boxShadow: `0 0 15px ${sky.neonPrimary}4d`,
              transform: `scale(${Math.min(1, pullDistance / 50)})`,
              transition: "transform 0.2s ease",
            }}
          >
            {isRefreshing ? (
              <CircularProgress size={16} sx={{ color: sky.neonPrimary }} thickness={5} />
            ) : (
              <SyncIcon
                sx={{
                  color: sky.neonPrimary,
                  fontSize: 18,
                  transform: `rotate(${(pullDistance / 60) * 360}deg)`,
                  transition: "transform 0.1s linear",
                }}
              />
            )}
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 700,
                color: sky.textPrimary,
                letterSpacing: 0.5,
                textShadow: `0 0 8px ${sky.neonPrimary}80`,
              }}
            >
              {isRefreshing
                ? "正在更新全台預報與測站數據…"
                : pullDistance >= 55
                ? "放開以立即更新"
                : "下拉更新氣象數據"}
            </Typography>
          </Box>
        )}
      </Box>
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
                  fontSize: 18,
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

          {/* 方案 B：動態穿衣與生活指南提示膠囊列 (微光玻璃晶片) */}
          {livingTip && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.5,
                py: 0.5,
                mt: 0.25,
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                backdropFilter: "blur(12px)",
                boxShadow: `0 2px 10px rgba(0,0,0,0.2), inset 0 0 12px ${sky.neonPrimary}15`,
                animation: "fadeIn 0.4s ease",
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: 13, sm: 14 },
                  fontWeight: 700,
                  color: sky.textPrimary,
                  letterSpacing: 0.4,
                  textShadow: `0 0 8px ${sky.neonPrimary}33`,
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
