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

      {/* 2. 主色調天頂柔光斑 (清晰醒目，流暢漫遊 16s) */}
      <Box
        sx={{
          position: "absolute",
          top: "-10%",
          right: "-10%",
          width: { xs: 380, sm: 500 },
          height: { xs: 380, sm: 500 },
          borderRadius: "50%",
          background: `radial-gradient(circle, ${sky.neonPrimary}66 0%, ${sky.neonSecondary}33 45%, transparent 72%)`,
          filter: "blur(65px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform, opacity",
          pointerEvents: "none",
          zIndex: 0,
          animation: "ambientAurora1 16s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate",
          "@keyframes ambientAurora1": {
            "0%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: 0.85 },
            "33%": { transform: "translate3d(-45px, 35px, 0) scale(1.15)", opacity: 1 },
            "66%": { transform: "translate3d(25px, 50px, 0) scale(0.95)", opacity: 0.9 },
            "100%": { transform: "translate3d(-20px, 20px, 0) scale(1.08)", opacity: 0.95 },
          },
        }}
      />

      {/* 3. 次色調左下方逆向柔光斑 (深層流動 20s) */}
      <Box
        sx={{
          position: "absolute",
          bottom: "2%",
          left: "-15%",
          width: { xs: 360, sm: 480 },
          height: { xs: 360, sm: 480 },
          borderRadius: "50%",
          background: `radial-gradient(circle, ${sky.neonSecondary}59 0%, ${sky.neonPrimary}29 50%, transparent 70%)`,
          filter: "blur(70px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform, opacity",
          pointerEvents: "none",
          zIndex: 0,
          animation: "ambientAurora2 20s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate",
          "@keyframes ambientAurora2": {
            "0%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: 0.8 },
            "33%": { transform: "translate3d(40px, -35px, 0) scale(1.12)", opacity: 1 },
            "66%": { transform: "translate3d(-30px, -45px, 0) scale(0.94)", opacity: 0.75 },
            "100%": { transform: "translate3d(20px, -20px, 0) scale(1.06)", opacity: 0.9 },
          },
        }}
      />

      {/* 4. 中景核心微光擴散 (中央呼吸動態 22s) */}
      <Box
        sx={{
          position: "absolute",
          top: "34%",
          right: "-12%",
          width: { xs: 320, sm: 420 },
          height: { xs: 320, sm: 420 },
          borderRadius: "50%",
          background: `radial-gradient(circle, ${sky.neonPrimary}44 0%, transparent 68%)`,
          filter: "blur(75px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform, opacity",
          pointerEvents: "none",
          zIndex: 0,
          animation: "ambientAurora3 22s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate",
          "@keyframes ambientAurora3": {
            "0%": { transform: "translate3d(0, 0, 0) scale(0.95)", opacity: 0.65 },
            "50%": { transform: "translate3d(-40px, -30px, 0) scale(1.18)", opacity: 0.9 },
            "100%": { transform: "translate3d(25px, 25px, 0) scale(1.02)", opacity: 0.7 },
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
