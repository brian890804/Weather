import React, { useState, useMemo, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AirIcon from '@mui/icons-material/Air';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import dayjs from 'dayjs';

import type { WeatherPeriod, ParsedCityData, ParsedTownshipData } from '../../types/weather';
import WeatherIcon from '../WeatherIcon/WeatherIcon';
import IOSLocationModal from './IOSLocationModal';
import IOSDetailModal, { type IOSMetricType } from './IOSDetailModal';
import {
  beaufortLabel,
  comfortColor,
  uvLevelColor,
  isCurrentNight,
} from '../../utils/weatherUtils';

interface IOSScrollSnapWeatherProps {
  cities: ParsedCityData[];
  selectedCity: string;
  selectedTownship: string;
  setSelectedCityAndTownship: (city: string, township: string) => void;
  townships: ParsedTownshipData[];
  periods: WeatherPeriod[];
  displayPeriod: WeatherPeriod | null;
  autoCurrentPeriod: WeatherPeriod | null;
  selectedPeriodTime: string | null;
  onSelectPeriod: (startTime: string) => void;
  lastFetchedAt: string | null;
  onRefresh: () => void;
  refreshing: boolean;
  cooldown: number;
  onOpenApiKeyDialog: () => void;
}

interface DayForecastSummary {
  dateStr: string;
  dayLabel: string;
  minTemp: number;
  maxTemp: number;
  weather: string;
  weatherCode: string;
  maxPop: number;
  startTime: string;
}

interface WeatherAtmosphere {
  canvasBg: string;
  ambientGlow: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  pillBg: string;
  pillBorder: string;
  accentColor: string;
}

/**
 * 依據當前天氣與時間動態計算大氣天空漸層與材質 Token
 */
function getWeatherAtmosphere(weather: string, isNight: boolean, pop: number): WeatherAtmosphere {
  if (isNight) {
    if (pop >= 50 || weather.includes('雨') || weather.includes('雷')) {
      return {
        canvasBg: 'linear-gradient(180deg, #090E17 0%, #0F1726 40%, #172338 75%, #20314C 100%)',
        ambientGlow: 'radial-gradient(circle at 50% 10%, rgba(56, 189, 248, 0.16) 0%, transparent 60%)',
        cardBg: 'rgba(255, 255, 255, 0.08)',
        cardBorder: '1px solid rgba(255, 255, 255, 0.14)',
        cardShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        pillBg: 'rgba(255, 255, 255, 0.10)',
        pillBorder: '1px solid rgba(255, 255, 255, 0.18)',
        accentColor: '#38BDF8',
      };
    }
    // 晴朗/星空夜間 (深邃午夜藍，非死黑)
    return {
      canvasBg: 'linear-gradient(180deg, #0A0F1E 0%, #101B37 35%, #182B55 70%, #223A70 100%)',
      ambientGlow: 'radial-gradient(circle at 80% 12%, rgba(199, 210, 254, 0.26) 0%, rgba(165, 180, 252, 0.12) 35%, transparent 60%)',
      cardBg: 'rgba(255, 255, 255, 0.10)',
      cardBorder: '1px solid rgba(255, 255, 255, 0.16)',
      cardShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
      pillBg: 'rgba(255, 255, 255, 0.14)',
      pillBorder: '1px solid rgba(255, 255, 255, 0.22)',
      accentColor: '#C7D2FE',
    };
  }

  // 日間：雷雨/強降雨
  if (weather.includes('雷') || pop >= 70) {
    return {
      canvasBg: 'linear-gradient(180deg, #162032 0%, #223249 40%, #2F4462 75%, #415A7E 100%)',
      ambientGlow: 'radial-gradient(circle at 50% 5%, rgba(56, 189, 248, 0.22) 0%, transparent 65%)',
      cardBg: 'rgba(255, 255, 255, 0.12)',
      cardBorder: '1px solid rgba(255, 255, 255, 0.18)',
      cardShadow: '0 8px 32px rgba(10, 15, 25, 0.3)',
      pillBg: 'rgba(255, 255, 255, 0.15)',
      pillBorder: '1px solid rgba(255, 255, 255, 0.22)',
      accentColor: '#38BDF8',
    };
  }

  // 日間：雨天
  if (weather.includes('雨') || pop >= 40) {
    return {
      canvasBg: 'linear-gradient(180deg, #1C2D44 0%, #283F5E 40%, #36537A 75%, #496E9E 100%)',
      ambientGlow: 'radial-gradient(circle at 50% 10%, rgba(96, 165, 250, 0.25) 0%, transparent 60%)',
      cardBg: 'rgba(255, 255, 255, 0.14)',
      cardBorder: '1px solid rgba(255, 255, 255, 0.20)',
      cardShadow: '0 8px 32px rgba(15, 25, 45, 0.25)',
      pillBg: 'rgba(255, 255, 255, 0.18)',
      pillBorder: '1px solid rgba(255, 255, 255, 0.26)',
      accentColor: '#60A5FA',
    };
  }

  // 日間：多雲/陰天 (大氣海藍薄霧)
  if (weather.includes('陰') || weather.includes('多雲')) {
    return {
      canvasBg: 'linear-gradient(180deg, #243B5A 0%, #315077 35%, #426795 70%, #5C83B4 100%)',
      ambientGlow: 'radial-gradient(ellipse at 50% 12%, rgba(255, 255, 255, 0.22) 0%, transparent 60%)',
      cardBg: 'rgba(255, 255, 255, 0.16)',
      cardBorder: '1px solid rgba(255, 255, 255, 0.25)',
      cardShadow: '0 8px 32px rgba(15, 25, 45, 0.2)',
      pillBg: 'rgba(255, 255, 255, 0.20)',
      pillBorder: '1px solid rgba(255, 255, 255, 0.32)',
      accentColor: '#93C5FD',
    };
  }

  // 日間：晴天/多雲時晴 (Google 經典晴空蔚藍)
  return {
    canvasBg: 'linear-gradient(180deg, #1B56D3 0%, #2A6EE8 30%, #3D84F5 65%, #6BA3F9 100%)',
    ambientGlow: 'radial-gradient(circle at 82% 12%, rgba(254, 240, 138, 0.42) 0%, rgba(253, 224, 71, 0.16) 35%, transparent 65%)',
    cardBg: 'rgba(255, 255, 255, 0.18)',
    cardBorder: '1px solid rgba(255, 255, 255, 0.30)',
    cardShadow: '0 8px 32px rgba(10, 45, 120, 0.18)',
    pillBg: 'rgba(255, 255, 255, 0.22)',
    pillBorder: '1px solid rgba(255, 255, 255, 0.35)',
    accentColor: '#FEF08A',
  };
}

export default function IOSScrollSnapWeather({
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
  refreshing,
  cooldown,
  onOpenApiKeyDialog,
}: IOSScrollSnapWeatherProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [detailModalType, setDetailModalType] = useState<IOSMetricType>(null);

  const period = displayPeriod || autoCurrentPeriod;

  // 氣溫數值與溫差計算
  const actualTemp = period ? parseInt(period.temperature) || 0 : 0;
  const apparentTemp = period ? parseInt(period.maxApparentTemperature) || actualTemp : actualTemp;
  const tempDiff = apparentTemp - actualTemp;
  const tempDiffText =
    tempDiff > 0
      ? `比實測高 ${tempDiff}°C`
      : tempDiff < 0
      ? `比實測低 ${Math.abs(tempDiff)}°C`
      : '體感與實測相符';

  const popStr = period?.probabilityOfPrecipitation ?? '-';
  const pop = parseInt(popStr) || 0;
  const isNight = period ? isCurrentNight(period.startTime) : false;

  // 計算動態天氣主題
  const theme = useMemo(() => {
    return getWeatherAtmosphere(period?.weather || '多雲', isNight, pop);
  }, [period?.weather, isNight, pop]);

  // 監聽滾動更新指示點（總共 3 頁：0, 1, 2）
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pageHeight = el.clientHeight || window.innerHeight;
    const pageIndex = Math.round(el.scrollTop / pageHeight);
    setActivePage(Math.min(2, Math.max(0, pageIndex)));
  }, []);

  const scrollToPage = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const pageHeight = el.clientHeight || window.innerHeight;
    el.scrollTo({
      top: index * pageHeight,
      behavior: 'smooth',
    });
  }, []);

  // 計算未來 3 天逐日預報走勢
  const { dailyList, overallMin, overallMax } = useMemo(() => {
    if (!periods || periods.length === 0) {
      return { dailyList: [], overallMin: 15, overallMax: 30 };
    }

    const groups: Record<string, WeatherPeriod[]> = {};
    periods.forEach((p) => {
      const d = dayjs(p.startTime).format('YYYY-MM-DD');
      if (!groups[d]) groups[d] = [];
      groups[d].push(p);
    });

    const dates = Object.keys(groups).sort();
    const todayStr = dayjs().format('YYYY-MM-DD');
    const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');

    let gMin = 99;
    let gMax = -99;

    const list: DayForecastSummary[] = dates.slice(0, 3).map((d) => {
      const items = groups[d];
      let min = 99;
      let max = -99;
      let maxPop = 0;

      items.forEach((item) => {
        const t = parseInt(item.temperature) || 0;
        const low = parseInt(item.minTemperature) || t;
        const high = parseInt(item.maxTemperature) || t;
        const pVal = parseInt(item.probabilityOfPrecipitation) || 0;
        if (low < min) min = low;
        if (high > max) max = high;
        if (pVal > maxPop) maxPop = pVal;
      });

      if (min < gMin) gMin = min;
      if (max > gMax) gMax = max;

      let dayLabel = dayjs(d).format('M/D (dd)');
      if (d === todayStr) dayLabel = '今天';
      else if (d === tomorrowStr) dayLabel = '明天';

      const repPeriod = items.find((p) => dayjs(p.startTime).hour() >= 11) || items[0];

      return {
        dateStr: d,
        dayLabel,
        minTemp: min === 99 ? 20 : min,
        maxTemp: max === -99 ? 28 : max,
        weather: repPeriod.weather,
        weatherCode: repPeriod.weatherCode,
        maxPop,
        startTime: repPeriod.startTime,
      };
    });

    return {
      dailyList: list,
      overallMin: gMin === 99 ? 18 : gMin,
      overallMax: gMax === -99 ? 30 : gMax,
    };
  }, [periods]);

  // Google Pixel Weather 2026: 智慧穿衣生活指南
  const clothingAdvice = useMemo(() => {
    if (apparentTemp >= 30) {
      return {
        title: '酷熱炎暑 · 清涼透氣',
        desc: '建議穿著純棉透氣短袖，戶外活動注意防曬遮陽與補充水分。',
        icon: '☀️',
      };
    }
    if (apparentTemp >= 25) {
      return {
        title: '溫暖舒適 · 短袖輕裝',
        desc: '氣候溫和宜人，適宜穿著短袖或休閒服飾，外出輕鬆自在。',
        icon: '👕',
      };
    }
    if (apparentTemp >= 20) {
      return {
        title: '微涼怡人 · 輕薄外套',
        desc: '早晚氣溫偏涼，建議穿著長袖上衣，出門可加件輕薄風衣或薄夾克。',
        icon: '🧥',
      };
    }
    if (apparentTemp >= 15) {
      return {
        title: '涼意顯著 · 保暖衣著',
        desc: '偏冷天氣，建議穿著保暖毛衣、防風外套，出門留意早晚溫差變化。',
        icon: '🧣',
      };
    }
    return {
      title: '低溫寒冷 · 防寒大衣',
      desc: '氣溫寒冷，請務必穿著羽絨外套或厚重防寒大衣，注意頭頸部保暖。',
      icon: '🧤',
    };
  }, [apparentTemp]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100dvh',
        background: theme.canvasBg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Google Sans", "Roboto", "Inter", "Noto Sans TC", system-ui, sans-serif',
        transition: 'background 0.8s ease',
      }}
    >
      {/* ── 背景層：Google Pixel Weather 大氣環境環境光 ── */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: theme.ambientGlow,
          transition: 'background 0.8s ease',
          zIndex: 0,
        }}
      />

      {/* ── 3 個分頁的滑動容器 (Scroll Snap Container) ── */}
      <Box
        ref={containerRef}
        onScroll={handleScroll}
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: { xs: '100%', sm: 440 },
          mx: 'auto',
          height: '100dvh',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {/* ══════════════════════════════════════════════════════════════════
            PAGE 1: 即時氣象與天氣簡報 (Hero Canvas)
            排版靠中，中下填滿
           ══════════════════════════════════════════════════════════════════ */}
        <Box
          sx={{
            height: '100dvh',
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: { xs: 2, sm: 2.5 },
            pt: 'max(14px, env(safe-area-inset-top))',
            pb: 'max(14px, env(safe-area-inset-bottom))',
            textAlign: 'center',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          {/* 1. 頂部：地點膠囊切換鈕 + 工具組 */}
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* 地點切換膠囊 */}
            <Box
              onClick={() => setLocationModalOpen(true)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.8,
                py: 0.7,
                borderRadius: '24px',
                bgcolor: theme.pillBg,
                backdropFilter: 'blur(24px) saturate(180%)',
                border: theme.pillBorder,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              <LocationOnIcon sx={{ fontSize: 18, color: '#FFFFFF', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
              <Typography
                sx={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  letterSpacing: -0.2,
                  textShadow: '0 1px 2px rgba(0,0,0,0.25)',
                }}
              >
                {selectedCity} · {selectedTownship}
              </Typography>
              <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.8)' }} />
            </Box>

            {/* 右側按鈕群 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={onOpenApiKeyDialog}
                size="small"
                title="設定個人氣象 API Key"
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  bgcolor: theme.pillBg,
                  backdropFilter: 'blur(20px)',
                  border: theme.pillBorder,
                  color: localStorage.getItem('cwa_api_key') ? '#FEF08A' : 'rgba(255, 255, 255, 0.85)',
                  '&:active': { transform: 'scale(0.92)' },
                }}
              >
                <VpnKeyIcon sx={{ fontSize: 17 }} />
              </IconButton>

              <IconButton
                onClick={onRefresh}
                disabled={refreshing || cooldown > 0}
                size="small"
                title={cooldown > 0 ? `冷卻中（剩餘 ${cooldown} 秒）` : '重新整理氣象資料'}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  bgcolor: theme.pillBg,
                  backdropFilter: 'blur(20px)',
                  border: theme.pillBorder,
                  color: cooldown > 0 ? 'rgba(255, 255, 255, 0.35)' : '#FFFFFF',
                  '&:active': { transform: 'scale(0.92)' },
                }}
              >
                {refreshing ? (
                  <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
                ) : (
                  <RefreshIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Box>
          </Box>

          {/* 2. 中間靠中：氣象圖示 + 氣溫 + 體感膠囊 */}
          {period && (
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                my: 0.5,
              }}
            >
              <Box
                sx={{
                  filter: 'drop-shadow(0 10px 24px rgba(0, 0, 0, 0.25))',
                  animation: 'floatIcon 4s ease-in-out infinite',
                  '@keyframes floatIcon': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                  },
                }}
              >
                <WeatherIcon
                  weatherCode={period.weatherCode}
                  weather={period.weather}
                  startTime={period.startTime}
                  size={64}
                />
              </Box>

              <Typography
                sx={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  letterSpacing: -0.3,
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                }}
              >
                {period.weather}
              </Typography>

              <Typography
                sx={{
                  fontSize: { xs: 64, sm: 72 },
                  fontWeight: 500,
                  color: '#FFFFFF',
                  lineHeight: 1,
                  letterSpacing: -1.5,
                  my: 0.25,
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                }}
              >
                {period.temperature}°
              </Typography>

              {/* 氣象概況膠囊 */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.8,
                  px: 2,
                  py: 0.65,
                  borderRadius: '20px',
                  bgcolor: theme.pillBg,
                  backdropFilter: 'blur(20px)',
                  border: theme.pillBorder,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    letterSpacing: 0.2,
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                >
                  體感 {period.maxApparentTemperature}° · 最高 {period.maxTemperature}° · 最低 {period.minTemperature}° · 降雨 {popStr !== '-' ? `${popStr}%` : '0%'}
                </Typography>
              </Box>
            </Box>
          )}

          {/* 3. 中下部填滿：Google Weather Brief + 逐時預報橫條 */}
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
            }}
          >
            {/* Weather Brief 天氣簡報卡片 */}
            <Box
              sx={{
                px: 2,
                py: 1.25,
                borderRadius: '22px',
                bgcolor: theme.cardBg,
                backdropFilter: 'blur(24px) saturate(180%)',
                border: theme.cardBorder,
                boxShadow: theme.cardShadow,
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                textAlign: 'left',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255, 255, 255, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 18, color: '#FEF08A' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#FEF08A', letterSpacing: 0.5, mb: 0.25, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                  ✨ 即時天氣簡報 · Weather Brief
                </Typography>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    lineHeight: 1.45,
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                >
                  {period?.weatherDescription || '今日天氣平穩，降雨機率低，適合各類日常活動與出行。'}
                </Typography>
              </Box>
            </Box>

            {/* 逐 3 小時天氣趨勢卡片 (滿版填滿中下) */}
            <Box
              sx={{
                width: '100%',
                borderRadius: '24px',
                bgcolor: theme.cardBg,
                backdropFilter: 'blur(24px) saturate(180%)',
                border: theme.cardBorder,
                boxShadow: theme.cardShadow,
                p: 1.5,
                boxSizing: 'border-box',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75, px: 0.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)', letterSpacing: 0.4 }}>
                  ⏱️ 逐時預報趨勢
                </Typography>
                {selectedPeriodTime && (
                  <Typography
                    onClick={() => onSelectPeriod(autoCurrentPeriod?.startTime || '')}
                    sx={{ fontSize: 12, fontWeight: 700, color: '#FEF08A', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    重置為現在
                  </Typography>
                )}
              </Box>

              {/* 橫向滑動時段 */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.85,
                  overflowX: 'auto',
                  py: 0.35,
                  px: 0.2,
                  WebkitOverflowScrolling: 'touch',
                  '&::-webkit-scrollbar': { display: 'none' },
                }}
              >
                {periods.map((p) => {
                  const isCurrent = p.startTime === autoCurrentPeriod?.startTime;
                  const isSelected = selectedPeriodTime ? p.startTime === selectedPeriodTime : isCurrent;
                  const startTime = dayjs(p.startTime);
                  const hourText = isCurrent ? '現在' : startTime.format('HH:mm');
                  const dayText = startTime.format('M/D');
                  const popVal = parseInt(p.probabilityOfPrecipitation) || 0;

                  return (
                    <Box
                      key={p.startTime}
                      onClick={() => onSelectPeriod(p.startTime)}
                      sx={{
                        flex: '0 0 auto',
                        width: 56,
                        py: 0.85,
                        px: 0.4,
                        borderRadius: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.35,
                        bgcolor: isSelected ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                        border: isSelected ? '1.5px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: isSelected ? '0 4px 14px rgba(0, 0, 0, 0.2)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        '&:active': { transform: 'scale(0.95)' },
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.85)' }}>
                        {hourText}
                      </Typography>
                      {!isCurrent && (
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>
                          {dayText}
                        </Typography>
                      )}
                      <WeatherIcon weatherCode={p.weatherCode} weather={p.weather} startTime={p.startTime} size={28} />
                      <Typography sx={{ fontSize: 11, fontWeight: 800, color: popVal > 0 ? '#38BDF8' : 'transparent', minHeight: 14, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                        {popVal > 0 ? `${popVal}%` : ''}
                      </Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                        {p.temperature}°
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* 4. 底部微提示 */}
          <Box
            onClick={() => scrollToPage(1)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              cursor: 'pointer',
              py: 0.35,
              animation: 'bounceArrow 2.2s infinite',
              '@keyframes bounceArrow': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-3px)' },
              },
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.75)',
                letterSpacing: 0.3,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              往下滑動查看 3 天趨勢與數據 ⌵
            </Typography>
          </Box>
        </Box>


        {/* ══════════════════════════════════════════════════════════════════
            PAGE 2: Bento Canvas - 3 天預報走勢與核心氣象指標
            全部滿版
           ══════════════════════════════════════════════════════════════════ */}
        <Box
          sx={{
            height: '100dvh',
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            px: { xs: 2, sm: 2.5 },
            pt: 'max(14px, env(safe-area-inset-top))',
            pb: 'max(14px, env(safe-area-inset-bottom))',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          {/* 頁面標題列 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.25 }}>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3, textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
                📅 未來預報與氣象數據
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                未來 3 天走勢與即時環境數據
              </Typography>
            </Box>
            <IconButton
              onClick={() => scrollToPage(0)}
              size="small"
              sx={{ color: '#FFFFFF', bgcolor: theme.pillBg, border: theme.pillBorder }}
            >
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* 滿版內容區塊：3 天走勢長條 + 2x2 Bento 氣象磁貼 */}
          <Box
            sx={{
              flex: 1,
              my: 1.25,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 1.25,
            }}
          >
            {/* 卡片 1: 3 天逐日預報走勢 (Material 3 Range Track) */}
            <Box
              sx={{
                borderRadius: '24px',
                bgcolor: theme.cardBg,
                backdropFilter: 'blur(24px) saturate(180%)',
                border: theme.cardBorder,
                boxShadow: theme.cardShadow,
                p: 1.75,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)', letterSpacing: 0.4, mb: 1 }}>
                3 天氣溫趨勢
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, my: 'auto' }}>
                {dailyList.map((day) => {
                  const range = Math.max(1, overallMax - overallMin);
                  const leftPercent = Math.max(0, ((day.minTemp - overallMin) / range) * 100);
                  const widthPercent = Math.max(14, ((day.maxTemp - day.minTemp) / range) * 100);

                  return (
                    <Box
                      key={day.dateStr}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.25,
                      }}
                    >
                      {/* 星期 / 日期 */}
                      <Typography sx={{ width: 48, fontSize: 14, fontWeight: 700, color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                        {day.dayLabel}
                      </Typography>

                      {/* 天氣圖示與降雨機率 */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: 56 }}>
                        <WeatherIcon weatherCode={day.weatherCode} weather={day.weather} size={24} />
                        {day.maxPop > 0 && (
                          <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#38BDF8', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                            {day.maxPop}%
                          </Typography>
                        )}
                      </Box>

                      {/* 最低溫 */}
                      <Typography sx={{ width: 28, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                        {day.minTemp}°
                      </Typography>

                      {/* Google M3 漸層長條 */}
                      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.15)', position: 'relative' }}>
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${leftPercent}%`,
                            width: `${Math.min(100 - leftPercent, widthPercent)}%`,
                            height: '100%',
                            borderRadius: 3,
                            background: 'linear-gradient(90deg, #60A5FA 0%, #F59E0B 70%, #EF4444 100%)',
                            boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)',
                          }}
                        />
                      </Box>

                      {/* 最高溫 */}
                      <Typography sx={{ width: 28, textAlign: 'left', fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                        {day.maxTemp}°
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* 卡片 2: 2x2 Bento 核心指標磁貼 (滿版撐滿剩餘空間) */}
            {period && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.25,
                  flex: 1,
                }}
              >
                {/* 磁貼 1: 體感溫度 */}
                <Box
                  onClick={() => setDetailModalType('feels_like')}
                  sx={{
                    p: 1.6,
                    borderRadius: '24px',
                    bgcolor: theme.cardBg,
                    backdropFilter: 'blur(24px) saturate(180%)',
                    border: theme.cardBorder,
                    boxShadow: theme.cardShadow,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'rgba(251, 146, 60, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ThermostatIcon sx={{ fontSize: 16, color: '#FB923C' }} />
                      </Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)' }}>
                        體感溫度
                      </Typography>
                    </Box>
                    <ChevronRightIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }} />
                  </Box>
                  <Typography sx={{ fontSize: 26, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1, my: 0.5, textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
                    {period.maxApparentTemperature}°C
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                    {tempDiffText}
                  </Typography>
                </Box>

                {/* 磁貼 2: 降雨機率 */}
                <Box
                  onClick={() => setDetailModalType('precipitation')}
                  sx={{
                    p: 1.6,
                    borderRadius: '24px',
                    bgcolor: theme.cardBg,
                    backdropFilter: 'blur(24px) saturate(180%)',
                    border: theme.cardBorder,
                    boxShadow: theme.cardShadow,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'rgba(56, 189, 248, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <BeachAccessIcon sx={{ fontSize: 16, color: '#38BDF8' }} />
                      </Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)' }}>
                        降雨機率
                      </Typography>
                    </Box>
                    <ChevronRightIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }} />
                  </Box>
                  <Typography sx={{ fontSize: 26, fontWeight: 700, color: '#38BDF8', lineHeight: 1.1, my: 0.5, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    {popStr !== '-' ? `${popStr}%` : '0%'}
                  </Typography>
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.max(0, pop))}
                      sx={{
                        height: 5,
                        borderRadius: 2.5,
                        bgcolor: 'rgba(255,255,255,0.15)',
                        '& .MuiLinearProgress-bar': { bgcolor: '#38BDF8', borderRadius: 2.5 },
                        mb: 0.35,
                      }}
                    />
                    <Typography noWrap sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                      {pop >= 50 ? '建議備妥雨具' : pop >= 20 ? '偶有零星降雨' : '降雨機率低'}
                    </Typography>
                  </Box>
                </Box>

                {/* 磁貼 3: 風向風速 */}
                <Box
                  onClick={() => setDetailModalType('wind')}
                  sx={{
                    p: 1.6,
                    borderRadius: '24px',
                    bgcolor: theme.cardBg,
                    backdropFilter: 'blur(24px) saturate(180%)',
                    border: theme.cardBorder,
                    boxShadow: theme.cardShadow,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'rgba(129, 140, 248, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AirIcon sx={{ fontSize: 16, color: '#A5B4FC' }} />
                      </Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)' }}>
                        風向與風速
                      </Typography>
                    </Box>
                    <ChevronRightIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }} />
                  </Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1, my: 0.5, textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
                    {period.windSpeed} <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>m/s</span>
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                    {period.windDirection} · {period.beaufortScale} 級 ({beaufortLabel(period.beaufortScale)})
                  </Typography>
                </Box>

                {/* 磁貼 4: 相對濕度 */}
                <Box
                  onClick={() => setDetailModalType('humidity')}
                  sx={{
                    p: 1.6,
                    borderRadius: '24px',
                    bgcolor: theme.cardBg,
                    backdropFilter: 'blur(24px) saturate(180%)',
                    border: theme.cardBorder,
                    boxShadow: theme.cardShadow,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'rgba(45, 212, 191, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <WaterDropIcon sx={{ fontSize: 16, color: '#2DD4BF' }} />
                      </Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)' }}>
                        相對濕度
                      </Typography>
                    </Box>
                    <ChevronRightIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }} />
                  </Box>
                  <Typography sx={{ fontSize: 26, fontWeight: 700, color: '#2DD4BF', lineHeight: 1.1, my: 0.5, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    {period.relativeHumidity}%
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                    露點 {period.dewPoint}°C · {parseInt(period.relativeHumidity) >= 80 ? '潮濕' : parseInt(period.relativeHumidity) >= 50 ? '舒適' : '偏乾'}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* 底部導引 */}
          <Box
            onClick={() => scrollToPage(2)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              cursor: 'pointer',
              py: 0.35,
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              往下滑動查看生活指南 ⌵
            </Typography>
          </Box>
        </Box>


        {/* ══════════════════════════════════════════════════════════════════
            PAGE 3: Google Insights & Controls - 紫外線/舒適度、生活指南、資料設定
            全部滿版
           ══════════════════════════════════════════════════════════════════ */}
        <Box
          sx={{
            height: '100dvh',
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            px: { xs: 2, sm: 2.5 },
            pt: 'max(14px, env(safe-area-inset-top))',
            pb: 'max(14px, env(safe-area-inset-bottom))',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          {/* 頁面標題 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.25 }}>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3, textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
                🧥 生活指南與環境指標
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                穿衣建議、紫外線防護與資料授權
              </Typography>
            </Box>
            <IconButton
              onClick={() => scrollToPage(1)}
              size="small"
              sx={{ color: '#FFFFFF', bgcolor: theme.pillBg, border: theme.pillBorder }}
            >
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* 滿版內容區塊 */}
          <Box
            sx={{
              flex: 1,
              my: 1.25,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 1.25,
            }}
          >
            {/* 區塊 1: 紫外線與舒適度 (2 欄橫列) */}
            {period && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25 }}>
                {/* 紫外線指數 */}
                <Box
                  onClick={() => setDetailModalType('uv')}
                  sx={{
                    p: 1.6,
                    borderRadius: '24px',
                    bgcolor: theme.cardBg,
                    backdropFilter: 'blur(24px) saturate(180%)',
                    border: theme.cardBorder,
                    boxShadow: theme.cardShadow,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: 'rgba(245, 158, 11, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <WbSunnyIcon sx={{ fontSize: 16, color: '#F59E0B' }} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)' }}>
                      紫外線指數
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 22, fontWeight: 700, color: uvLevelColor(period.uvExposureLevel), mb: 0.35, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    {isNight ? '夜間無' : period.uvIndex && period.uvIndex !== '-' ? `${period.uvIndex} 級` : '中量級'}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                    {isNight ? '夜間無需防曬' : period.uvExposureLevel ? `${period.uvExposureLevel}防護` : '請注意防曬'}
                  </Typography>
                </Box>

                {/* 舒適度指數 */}
                <Box
                  onClick={() => setDetailModalType('comfort')}
                  sx={{
                    p: 1.6,
                    borderRadius: '24px',
                    bgcolor: theme.cardBg,
                    backdropFilter: 'blur(24px) saturate(180%)',
                    border: theme.cardBorder,
                    boxShadow: theme.cardShadow,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: 'rgba(52, 211, 153, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SentimentSatisfiedAltIcon sx={{ fontSize: 16, color: '#34D399' }} />
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)' }}>
                      舒適度指數
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 22, fontWeight: 700, color: comfortColor(period.maxComfortIndexDescription), mb: 0.35, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    {period.maxComfortIndexDescription || '舒適'}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                    體感感受指標評估
                  </Typography>
                </Box>
              </Box>
            )}

            {/* 區塊 2: Google Insights 智慧生活穿衣指南 */}
            <Box
              sx={{
                borderRadius: '24px',
                bgcolor: theme.cardBg,
                backdropFilter: 'blur(24px) saturate(180%)',
                border: theme.cardBorder,
                boxShadow: theme.cardShadow,
                p: 1.75,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'rgba(251, 191, 36, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckroomIcon sx={{ color: '#FBBF24', fontSize: 16 }} />
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    穿衣建議：{clothingAdvice.title}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.5, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                  {clothingAdvice.desc}
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
                <Box sx={{ p: 1, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>雨具提醒</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: pop >= 30 ? '#60A5FA' : '#34D399', mt: 0.2 }}>
                    {pop >= 50 ? '🌧️ 務必攜帶雨具' : pop >= 30 ? '☂️ 建議備傘防雨' : '☀️ 無需攜帶雨具'}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>戶外活動</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', mt: 0.2 }}>
                    {pop < 30 ? '🏃 適合戶外運動' : '🏠 建議室內活動'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 區塊 3: 氣象資料來源與控制 */}
            <Box
              sx={{
                borderRadius: '24px',
                bgcolor: theme.cardBg,
                backdropFilter: 'blur(24px) saturate(180%)',
                border: theme.cardBorder,
                boxShadow: theme.cardShadow,
                p: 1.75,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.4 }}>
                  <InfoOutlinedIcon sx={{ color: '#FEF08A', fontSize: 17 }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    氣象資料來源
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.45 }}>
                  由交通部中央氣象署 (CWA) 開放資料平臺提供逐 3 小時預報。
                  {lastFetchedAt && ` 更新於 ${dayjs(lastFetchedAt).format('HH:mm')}。`}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={onOpenApiKeyDialog}
                  startIcon={<VpnKeyIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    borderRadius: '16px',
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 12,
                    py: 0.85,
                    backdropFilter: 'blur(16px)',
                    '&:hover': { borderColor: '#FFFFFF', bgcolor: 'rgba(255,255,255,0.2)' },
                  }}
                >
                  設定 API Key
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={onRefresh}
                  disabled={refreshing || cooldown > 0}
                  startIcon={refreshing ? <CircularProgress size={14} sx={{ color: '#FFF' }} /> : <RefreshIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    borderRadius: '16px',
                    bgcolor: '#2563EB',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 12,
                    py: 0.85,
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    '&:hover': { bgcolor: '#1D4ED8' },
                  }}
                >
                  {cooldown > 0 ? `冷卻 (${cooldown}s)` : '立即更新'}
                </Button>
              </Box>
            </Box>
          </Box>

          {/* 回到頂端首頁按鈕 */}
          <Box
            onClick={() => scrollToPage(0)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              cursor: 'pointer',
              py: 0.35,
            }}
          >
            <KeyboardArrowUpIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.75)' }} />
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              回到即時天氣首頁 ⌃
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── 5. 右側 Material 3 垂直分頁指示膠囊 (Page Indicator) ── */}
      <Box
        sx={{
          position: 'absolute',
          right: { xs: 8, sm: 16 },
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          p: 0.6,
          borderRadius: '16px',
          bgcolor: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {[0, 1, 2].map((idx) => {
          const isActive = activePage === idx;
          return (
            <Box
              key={idx}
              onClick={() => scrollToPage(idx)}
              sx={{
                width: 6,
                height: isActive ? 22 : 6,
                borderRadius: 3,
                bgcolor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                boxShadow: isActive ? '0 0 10px rgba(255, 255, 255, 0.8)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.2, 0, 0, 1)',
                '&:hover': {
                  bgcolor: '#FFFFFF',
                },
              }}
            />
          );
        })}
      </Box>

      {/* ── 6. 地點切換選單 (Modal) ── */}
      <IOSLocationModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        selectedCity={selectedCity}
        selectedTownship={selectedTownship}
        onSelectCityAndTownship={setSelectedCityAndTownship}
        citiesData={cities}
      />

      {/* ── 7. 氣象指標詳細彈窗 ── */}
      <IOSDetailModal
        type={detailModalType}
        onClose={() => setDetailModalType(null)}
        period={period}
      />
    </Box>
  );
}
