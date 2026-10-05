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

  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const page2Ref = useRef<HTMLDivElement | null>(null);

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

  // ── 兩頁完全切割切換 (0: 天氣焦點首頁, 1: 完整趨勢與生活指南) ──
  const goTo = useCallback((idx: number) => {
    const target = Math.min(1, Math.max(0, idx));
    if (target === 1 && page2Ref.current) {
      page2Ref.current.scrollTop = 0;
    }
    setActivePage(target);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    touchStartY.current = null;
    touchStartX.current = null;

    // 垂直滑動優先判斷 (避免逐 3 小時橫向滑動誤觸)
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 40) {
      if (diffY > 0 && activePage === 0) {
        goTo(1);
      } else if (diffY < 0 && activePage === 1) {
        if (!page2Ref.current || page2Ref.current.scrollTop <= 8) {
          goTo(0);
        }
      }
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100dvh",
        background: sky.bg,
        position: "relative",
        overflow: "hidden",
        fontFamily: '"Google Sans", "Noto Sans TC", system-ui, sans-serif',
        transition: "background 0.7s ease",
      }}
    >
      {/* 大氣背景光暈 */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: sky.glow,
          pointerEvents: "none",
          zIndex: 0,
          transition: "background 0.7s ease",
        }}
      />

      {/* 動態天氣環境光效 (雨天雨絲流動、大太陽斜向光束微光、雲霧流動) */}
      <WeatherAmbientEffects weatherType={sky.weatherType} />

      {/* ── APP 主內容區 (底部導航已移除，貼底延展無黑邊/留白) ── */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        {/* PAGE 1：即時氣象核心看板 */}
        <MobilePage1
          active={activePage === 0}
          selectedCity={selectedCity}
          selectedTownship={selectedTownship}
          onOpenLocation={() => setLocationOpen(true)}
          period={period}
          dayHighLow={dayHighLow}
          page1Metrics={page1Metrics}
          periods={periods}
          autoCurrentPeriod={autoCurrentPeriod}
          selectedPeriodTime={selectedPeriodTime}
          onSelectPeriod={onSelectPeriod}
          lastFetchedAt={lastFetchedAt}
          onGoToPage2={() => goTo(1)}
          sky={sky}
        />

        {/* PAGE 2：全方位氣象趨勢與生活指南 */}
        <MobilePage2
          active={activePage === 1}
          pageRef={page2Ref}
          dailyList={dailyList}
          activeForecastDate={activeForecastDate}
          onSelectForecastDate={(dateStr) => setSelectedForecastDate(dateStr)}
          activeDayDetails={activeDayDetails}
          onGoToPage1={() => goTo(0)}
          sky={sky}
        />
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
      />
    </Box>
  );
}
