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
  const activePageRef = useRef(0);
  const touchStartY = useRef<number | null>(null);
  const startScrollTop = useRef<number>(0);

  // 程式化平滑捲動至指定頁面（第 0 頁或第 1 頁）
  const scrollToPage = useCallback((idx: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const targetTop =
      idx === 0
        ? 0
        : page2Ref.current
        ? page2Ref.current.offsetTop
        : container.clientHeight;
    container.scrollTo({
      top: targetTop,
      behavior: "smooth",
    });
  }, []);

  // 輕觸磁吸：短距離偵測（只要滑動 40px 即輕鬆平滑切換，不需費力大動作）
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    const container = scrollContainerRef.current;
    startScrollTop.current = container ? container.scrollTop : 0;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const endY = e.changedTouches[0].clientY;
    const deltaY = touchStartY.current - endY; // 正值代表向上滑動 (去第 2 頁), 負值代表向下滑動 (去第 1 頁)
    const pageHeight = container.clientHeight;

    touchStartY.current = null;

    // 1. 若在第 1 頁頂部區間向上推動超過 40px -> 磁吸門檻大幅調短，輕撥即流暢進入第 2 頁
    if (startScrollTop.current < 60 && deltaY > 40) {
      scrollToPage(1);
      return;
    }

    // 2. 若在第 2 頁頂部區間向下拉動超過 40px -> 輕推即流暢返回第 1 頁
    if (
      startScrollTop.current >= pageHeight - 70 &&
      startScrollTop.current <= pageHeight + 70 &&
      deltaY < -40
    ) {
      scrollToPage(0);
      return;
    }
  }, [scrollToPage]);

  // 監聽外層滾動，更新目前 activePage 狀態（過半自動識別）
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const pageHeight = container.clientHeight;
    if (pageHeight <= 0) return;
    const currentIdx = container.scrollTop >= pageHeight * 0.5 ? 1 : 0;
    if (currentIdx !== activePageRef.current) {
      activePageRef.current = currentIdx;
      setActivePage(currentIdx);
    }
  }, []);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
      {/* ── 現代優雅天氣動態微流光背景 (依天氣主題色平滑漫射飄移，更清晰顯著) ── */}
      {/* ── 現代優雅天氣動態流光背景 (色彩鮮明清晰、深度流暢漫遊) ── */}
      {/* 1. 全域深層漸層背景光暈 */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: sky.glow,
          pointerEvents: "none",
          zIndex: 0,
          transition: "background 1s ease",
        }}
      />

      {/* 2. 主色調右上強光天頂柔斑 (鮮明生動 14s) */}
      <Box
        sx={{
          position: "absolute",
          top: "-8%",
          right: "-8%",
          width: { xs: 420, sm: 540 },
          height: { xs: 420, sm: 540 },
          borderRadius: "50%",
          background: `radial-gradient(circle, ${sky.neonPrimary}aa 0%, ${sky.neonSecondary}66 38%, transparent 70%)`,
          filter: "blur(48px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform, opacity",
          pointerEvents: "none",
          zIndex: 0,
          animation: "ambientAurora1 14s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate",
          "@keyframes ambientAurora1": {
            "0%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: 0.95 },
            "33%": { transform: "translate3d(-60px, 45px, 0) scale(1.22)", opacity: 1 },
            "66%": { transform: "translate3d(35px, 65px, 0) scale(0.92)", opacity: 0.88 },
            "100%": { transform: "translate3d(-30px, 30px, 0) scale(1.15)", opacity: 1 },
          },
        }}
      />

      {/* 3. 次色調左下方強光逆向柔斑 (鮮明深層流動 16s) */}
      <Box
        sx={{
          position: "absolute",
          bottom: "4%",
          left: "-12%",
          width: { xs: 390, sm: 500 },
          height: { xs: 390, sm: 500 },
          borderRadius: "50%",
          background: `radial-gradient(circle, ${sky.neonSecondary}99 0%, ${sky.neonPrimary}55 42%, transparent 70%)`,
          filter: "blur(50px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform, opacity",
          pointerEvents: "none",
          zIndex: 0,
          animation: "ambientAurora2 16s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate",
          "@keyframes ambientAurora2": {
            "0%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: 0.9 },
            "33%": { transform: "translate3d(55px, -45px, 0) scale(1.2)", opacity: 1 },
            "66%": { transform: "translate3d(-40px, -60px, 0) scale(0.9)", opacity: 0.82 },
            "100%": { transform: "translate3d(30px, -25px, 0) scale(1.12)", opacity: 0.96 },
          },
        }}
      />

      {/* 4. 中景核心動態微光環波 (中央呼吸波動 18s) */}
      <Box
        sx={{
          position: "absolute",
          top: "32%",
          right: "-10%",
          width: { xs: 360, sm: 460 },
          height: { xs: 360, sm: 460 },
          borderRadius: "50%",
          background: `radial-gradient(circle, ${sky.neonPrimary}77 0%, ${sky.neonSecondary}33 45%, transparent 68%)`,
          filter: "blur(55px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform, opacity",
          pointerEvents: "none",
          zIndex: 0,
          animation: "ambientAurora3 18s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate",
          "@keyframes ambientAurora3": {
            "0%": { transform: "translate3d(0, 0, 0) scale(0.92)", opacity: 0.8 },
            "50%": { transform: "translate3d(-55px, -40px, 0) scale(1.28)", opacity: 1 },
            "100%": { transform: "translate3d(35px, 35px, 0) scale(1.05)", opacity: 0.85 },
          },
        }}
      />

      {/* 5. 漸層波光微動光暈帶 (由左至右波狀流動 20s) */}
      <Box
        sx={{
          position: "absolute",
          top: "15%",
          left: "-20%",
          width: "140%",
          height: "40%",
          borderRadius: "50%",
          background: `radial-gradient(ellipse at 50% 50%, ${sky.neonPrimary}44 0%, transparent 65%)`,
          filter: "blur(60px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform, opacity",
          pointerEvents: "none",
          zIndex: 0,
          animation: "ambientWave 20s ease-in-out infinite alternate",
          "@keyframes ambientWave": {
            "0%": { transform: "translate3d(0, 0, 0) rotate(-6deg)", opacity: 0.7 },
            "50%": { transform: "translate3d(40px, 25px, 0) rotate(4deg)", opacity: 0.95 },
            "100%": { transform: "translate3d(-30px, 15px, 0) rotate(-3deg)", opacity: 0.75 },
          },
        }}
      />

      {/* 動態天氣環境光效 (雨天雨絲流動、大太陽斜向光束微光、雲霧流動) */}
      <WeatherAmbientEffects weatherType={sky.weatherType} />

      {/* ── APP 主內容區：原生垂直滾動容器 ── */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          scrollSnapType: "y proximity",
          scrollBehavior: "smooth",
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
