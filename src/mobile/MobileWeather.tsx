import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import Box from "@mui/material/Box";
import dayjs from "dayjs";

import type { MobileWeatherProps } from "./types";
import { getSkyTheme } from "./theme";
import { useMobileWeatherData } from "./useMobileWeatherData";
import MobileLocationModal from "./MobileLocationModal";
import MobilePage1 from "./MobilePage1";
import MobilePage2 from "./MobilePage2";
import WeatherAmbientEffects from "./WeatherAmbientEffects";
import { isCurrentNight } from "../utils/weatherUtils";

export default function MobileWeather({
  cities,
  selectedCity,
  selectedTownship,
  setSelectedCityAndTownship,
  periods,
  displayPeriod,
  autoCurrentPeriod,
  selectedPeriodTime,
  onSelectPeriod,
  lastFetchedAt,
  onRefresh,
  isAutoLocation,
  onLocateCurrentPosition,
  onShowMessage,
}: MobileWeatherProps) {
  const [activePage, setActivePage] = useState(0);
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedForecastDate, setSelectedForecastDate] = useState<string>(() =>
    dayjs().format("YYYY-MM-DD"),
  );

  const period = displayPeriod || autoCurrentPeriod;
  const pop = parseInt(period?.probabilityOfPrecipitation ?? "0") || 0;
  const popStr = period?.probabilityOfPrecipitation ?? "0";
  const isNight = isCurrentNight(period?.startTime);

  const sky = useMemo(
    () => getSkyTheme(period?.weather || "晴", isNight, pop),
    [period?.weather, isNight, pop],
  );

  const {
    dailyList,
    dayHighLow,
    page1Metrics,
    livingTip,
    activeForecastDate,
    activeDayDetails,
  } = useMobileWeatherData({
    selectedCity,
    periods,
    period,
    selectedForecastDate,
    popStr,
    skyTextPrimary: sky.textPrimary,
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // ── 手機全屏 APP 模式：掛載時鎖定外層 body 捲動，卸載時立即還原給電腦版 ──
  useEffect(() => {
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
    };
  }, []);

  const page2Ref = useRef<HTMLDivElement | null>(null);

  // 程式化捲動至指定頁面（第 0 頁或第 1 頁）
  const scrollToPage = useCallback((idx: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const pageHeight = container.clientHeight;
    container.scrollTo({
      top: idx * pageHeight,
      behavior: "smooth",
    });
  }, []);

  // 監聽外層滾動，更新目前 activePage 狀態（超過 40% 高度即識別為進入 Page 2）
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const pageHeight = container.clientHeight;
    if (pageHeight <= 0) return;
    const currentIdx = container.scrollTop >= pageHeight * 0.4 ? 1 : 0;
    if (currentIdx !== activePage) {
      setActivePage(currentIdx);
    }
  }, [activePage]);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        minHeight: "-webkit-fill-available",
        background: sky.bg,
        overflow: "hidden",
        fontFamily: '"Google Sans", "Noto Sans TC", system-ui, sans-serif',
        transition: "background 0.7s ease",
        zIndex: 10,
      }}
    >
      {/* ── Cyberpunk 動態天氣背景光暈與環境光斑層 ── */}
      {/* 1. 全域深層漸層背景光暈 */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: sky.glow,
          pointerEvents: "none",
          zIndex: 0,
          transition: "background 0.8s ease",
        }}
      />

      {/* 2. 動態 Cyberpunk 呼吸光斑 (右上角主霓虹光斑) */}
      <Box
        sx={{
          position: "absolute",
          top: "-10%",
          right: "-15%",
          width: { xs: 340, sm: 420 },
          height: { xs: 340, sm: 420 },
          borderRadius: "50%",
          background: `radial-gradient(circle, ${sky.neonPrimary}59 0%, ${sky.neonSecondary}26 50%, transparent 70%)`,
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 0,
          animation: "auroraPulseTop 8s ease-in-out infinite alternate",
          "@keyframes auroraPulseTop": {
            "0%": { transform: "translate(0, 0) scale(1)", opacity: 0.85 },
            "50%": { transform: "translate(-20px, 25px) scale(1.15)", opacity: 1 },
            "100%": { transform: "translate(15px, -15px) scale(0.95)", opacity: 0.75 },
          },
        }}
      />

      {/* 3. 動態 Cyberpunk 呼吸光斑 (左下角次霓虹光斑) */}
      <Box
        sx={{
          position: "absolute",
          bottom: "5%",
          left: "-20%",
          width: { xs: 320, sm: 400 },
          height: { xs: 320, sm: 400 },
          borderRadius: "50%",
          background: `radial-gradient(circle, ${sky.neonSecondary}4d 0%, ${sky.neonPrimary}20 50%, transparent 70%)`,
          filter: "blur(70px)",
          pointerEvents: "none",
          zIndex: 0,
          animation: "auroraPulseBottom 10s ease-in-out infinite alternate",
          "@keyframes auroraPulseBottom": {
            "0%": { transform: "translate(0, 0) scale(1)", opacity: 0.7 },
            "50%": { transform: "translate(25px, -20px) scale(1.12)", opacity: 0.95 },
            "100%": { transform: "translate(-15px, 15px) scale(0.9)", opacity: 0.65 },
          },
        }}
      />

      {/* 動態天氣環境光效 (雨天雨絲流動、大太陽斜向光束微光、雲霧流動) */}
      <WeatherAmbientEffects weatherType={sky.weatherType} />

      {/* ── APP 主內容區：原生垂直滾動容器 ── */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          scrollSnapType: activePage === 0 ? "y mandatory" : "none",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {/* PAGE 1：即時氣象核心看板 (Scroll Snap 項目 1) */}
        <Box
          sx={{
            width: "100%",
            height: "100%",
            minHeight: "100%",
            scrollSnapAlign: "start",
            scrollSnapStop: "normal",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <MobilePage1
            active={activePage === 0}
            selectedCity={selectedCity}
            selectedTownship={selectedTownship}
            isAutoLocation={isAutoLocation}
            onOpenLocation={() => setLocationOpen(true)}
            period={period}
            dayHighLow={dayHighLow}
            page1Metrics={page1Metrics}
            livingTip={livingTip}
            periods={periods}
            autoCurrentPeriod={autoCurrentPeriod}
            selectedPeriodTime={selectedPeriodTime}
            onSelectPeriod={onSelectPeriod}
            lastFetchedAt={lastFetchedAt}
            onGoToPage2={() => scrollToPage(1)}
            sky={sky}
            onRefresh={onRefresh}
          />
        </Box>

        {/* PAGE 2：全方位氣象趨勢與生活指南 (Scroll Snap 項目 2) */}
        <Box
          ref={page2Ref}
          sx={{
            width: "100%",
            minHeight: "100dvh",
            height: "auto",
            scrollSnapAlign: "start",
            scrollSnapStop: "normal",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <MobilePage2
            pageRef={page2Ref}
            active={activePage === 1}
            dailyList={dailyList}
            activeForecastDate={activeForecastDate}
            onSelectForecastDate={(dateStr) => setSelectedForecastDate(dateStr)}
            activeDayDetails={activeDayDetails}
            onGoToPage1={() => scrollToPage(0)}
            sky={sky}
            cityName={selectedCity}
            townshipName={selectedTownship}
            currentPeriod={period}
            onShowMessage={onShowMessage}
          />
        </Box>
      </Box>

      {/* 地點選單 */}
      <MobileLocationModal
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        selectedCity={selectedCity}
        selectedTownship={selectedTownship}
        onSelectCityAndTownship={setSelectedCityAndTownship}
        citiesData={cities}
        neonColor={sky.neonPrimary}
        isAutoLocation={isAutoLocation}
        onLocateCurrentPosition={onLocateCurrentPosition}
      />
    </Box>
  );
}
