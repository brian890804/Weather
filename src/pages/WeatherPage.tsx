import { useState, useCallback, useMemo, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';

import { useWeatherStore, type TabCategory } from '../store/weatherStore';
import { useWeatherData } from '../hooks/useWeatherData';
import { CITIES } from '../utils/cities';
import PeriodCard from '../components/desktop/PeriodCard';
import DragScrollBox from '../components/common/DragScrollBox';
import OverviewPanel from '../components/desktop/OverviewPanel';
import TemperaturePanel from '../components/desktop/TemperaturePanel';
import WindPanel from '../components/desktop/WindPanel';
import RainPanel from '../components/desktop/RainPanel';
import ComfortPanel from '../components/desktop/ComfortPanel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import { R } from '../App';
import MobileWeather from '../mobile/MobileWeather';
import IOSLocationModal from '../components/ios/IOSLocationModal';
import {
  readCache,
  isRateLimited,
  getMinutesSinceFetched,
  MANUAL_REFRESH_MIN_INTERVAL_MINUTES,
} from '../utils/cache';

dayjs.locale('zh-tw');

const TAB_CONFIG: { value: TabCategory; label: string }[] = [
  { value: 'overview', label: '📊 總覽' },
  { value: 'temperature', label: '🌡️ 溫度' },
  { value: 'wind', label: '💨 風' },
  { value: 'rain', label: '🌧️ 降雨' },
  { value: 'comfort', label: '😊 舒適度' },
];

export default function WeatherPage() {
  const { isLoading, error, refetch, refetchRealtime } = useWeatherData();
  const {
    cities,
    selectedCity,
    setSelectedCity,
    selectedTownship,
    setSelectedTownship,
    setSelectedCityAndTownship,
    activeTab,
    setActiveTab,
    lastFetchedAt,
    selectedPeriodTime,
    setSelectedPeriodTime,
  } = useWeatherStore();

  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [desktopLocationModalOpen, setDesktopLocationModalOpen] = useState(false);
  const [viewModeOverride, setViewModeOverride] = useState<'auto' | 'ios' | 'desktop'>('auto');
  const [inputKey, setInputKey] = useState(() => {
    try {
      return localStorage.getItem('cwa_api_key') || '';
    } catch {
      return '';
    }
  });
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  // 倒數計時冷卻保護
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const theme = useTheme();
  // 手機與平板直立模式 (< 900px) 自動啟用全新 iOS 4 頁滑動體驗
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isIOSView = viewModeOverride === 'ios' ? true : viewModeOverride === 'desktop' ? false : isMobile;

  // 1. 取得當前選取縣市的資料（useMemo 快取）
  const currentCityData = useMemo(
    () => cities.find((c) => c.cityName === selectedCity),
    [cities, selectedCity]
  );
  const townships = useMemo(
    () => currentCityData?.townships ?? [],
    [currentCityData]
  );

  // 2. 取得當前選取鄉鎮的資料（useMemo 快取）
  const currentTownshipData = useMemo(
    () => townships.find((t) => t.townshipName === selectedTownship) ?? townships[0],
    [townships, selectedTownship]
  );
  const periods = useMemo(
    () => currentTownshipData?.periods ?? [],
    [currentTownshipData]
  );

  // 當前系統時間狀態（每 30 秒自動偵測一次，確保時間跨過 3hr 區間時能及時觸發切換）
  const [currentTime, setCurrentTime] = useState(() => dayjs());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // 3. 判斷自動預設當前時段（以現在時間為基準；若找不到涵蓋當前的時段，找最接近現在的未過期時段）
  const autoCurrentPeriod = useMemo(() => {
    if (!periods.length) return null;
    const match = periods.find((p) => {
      const st = dayjs(p.startTime);
      const et = dayjs(p.endTime);
      return !currentTime.isBefore(st) && currentTime.isBefore(et);
    });
    if (match) return match;
    // 若當前時間跨度找不到（例如剛好在交界），找離現在最近的未來時段
    const upcoming = periods.find((p) => dayjs(p.endTime).isAfter(currentTime));
    return upcoming ?? periods[0];
  }, [periods, currentTime]);

  // 4. 使用者點擊時段卡片選中的時段
  // 注意：若 selectedPeriodTime 為 null 或剛好等於 autoCurrentPeriod 的 startTime，視為「自動模式」
  const displayPeriod = useMemo(() => {
    if (!selectedPeriodTime) return autoCurrentPeriod;
    const target = periods.find((p) => p.startTime === selectedPeriodTime);
    return target ?? autoCurrentPeriod;
  }, [selectedPeriodTime, periods, autoCurrentPeriod]);

  // 使用者手動切換時段：若點擊了「當前時段 (現)」，重置為 null 恢復自動模式；若點擊其他時段，鎖定使用者選擇
  const handleSelectPeriod = useCallback((startTime: string) => {
    if (autoCurrentPeriod && startTime === autoCurrentPeriod.startTime) {
      // 點回現在時間 -> 重新啟動「自動依時間切換」機制
      setSelectedPeriodTime(null);
    } else {
      setSelectedPeriodTime(startTime);
    }
  }, [autoCurrentPeriod, setSelectedPeriodTime]);

  // 智慧時段巡檢：
  // 1. 若使用者選了「過去時段」（endTime <= currentTime），停留超過 45 秒後自動幫他校正切回「現在時間」
  // 2. 若使用者選的是「未來時段」（startTime > currentTime），永久鎖定保留使用者的選擇，絕不自動關閉
  useEffect(() => {
    if (!selectedPeriodTime) return;

    // 檢查選中的時段是否為「過去時段」
    const selected = periods.find((p) => p.startTime === selectedPeriodTime);
    if (!selected) return;

    const isPast = dayjs(selected.endTime).isBefore(currentTime) || dayjs(selected.endTime).isSame(currentTime);

    if (isPast) {
      // 45 秒後自動歸位回現在時間，避免使用者忘記切換而看著歷史舊資訊
      const timer = setTimeout(() => {
        setSelectedPeriodTime(null);
      }, 45000);
      return () => clearTimeout(timer);
    }
    // 未來時段：不設定超時，永久維持選取
  }, [selectedPeriodTime, periods, currentTime, setSelectedPeriodTime]);

  const handleRefresh = useCallback(async () => {
    if (refreshing || cooldown > 0) return;

    // 2. 若處於 429 限流冷卻保護中，提示使用者
    if (isRateLimited()) {
      setSnackbarMsg('氣象署 API 目前處於 429 限流冷卻保護中，已為您保留快取資料。請稍候再試或設定個人 API Key');
      setCooldown(10);
      return;
    }

    setRefreshing(true);
    try {
      // 下拉重整時強制同時更新逐 3hr 預報與即測實測數據，穿透快取
      await refetch(true);
      setSnackbarMsg('預報與即測氣溫資料已成功更新為最新數據！');
      setCooldown(15);
    } catch (err: any) {
      console.warn('Refresh error:', err);
      if (err?.response?.status === 429 || String(err).includes('429')) {
        setSnackbarMsg('氣象署 API 請求頻率受限 (429)，已啟動冷卻保護並保留現有快取資料');
      } else {
        setSnackbarMsg('連線異常，已保留現有天氣快取資料');
      }
      setCooldown(15); // 15秒冷卻防刷
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchRealtime, refreshing, cooldown]);

  const handleSaveApiKey = useCallback(() => {
    try {
      if (inputKey.trim()) {
        localStorage.setItem('cwa_api_key', inputKey.trim());
      } else {
        localStorage.removeItem('cwa_api_key');
      }
      setApiKeyDialogOpen(false);
      setSnackbarMsg('API Key 已儲存，正在以新 Key 重新抓取…');
      refetch();
    } catch {
      setApiKeyDialogOpen(false);
    }
  }, [inputKey, refetch]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at 20% 10%, rgba(30,60,114,0.7) 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(42,82,152,0.4) 0%, transparent 60%), #0a0f1e',
      }}
    >
      {/* ── 手機與 iOS 模式：全屏 3 頁上下滑動貼合 (Scroll Snap) 現代化氣象體驗 ── */}
      {isIOSView ? (
        cities.length > 0 ? (
          <MobileWeather
            cities={cities}
            selectedCity={selectedCity}
            selectedTownship={selectedTownship || currentTownshipData?.townshipName || townships[0]?.townshipName || '全區'}
            setSelectedCityAndTownship={setSelectedCityAndTownship}
            townships={townships}
            periods={periods}
            displayPeriod={displayPeriod}
            autoCurrentPeriod={autoCurrentPeriod}
            selectedPeriodTime={selectedPeriodTime}
            onSelectPeriod={handleSelectPeriod}
            lastFetchedAt={lastFetchedAt}
            onRefresh={handleRefresh}
          />
        ) : error ? (
          <Box
            sx={{
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              px: 3,
              textAlign: 'center',
            }}
          >
            <Alert
              severity="warning"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setApiKeyDialogOpen(true)}
                  sx={{ fontWeight: 700 }}
                >
                  設定 API Key
                </Button>
              }
              sx={{ maxWidth: 450, borderRadius: `${R.md}px`, textAlign: 'left' }}
            >
              {String(error).includes('429')
                ? '中央氣象署 API 存取頻率受限 (429 Too Many Requests)。公共金鑰已被限流，請點擊按鈕填寫個人免費 API Key！'
                : `無法取得氣象資料：${error}`}
            </Alert>
          </Box>
        ) : (
          <Box
            sx={{
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              px: 3,
              textAlign: 'center',
              userSelect: 'none',
            }}
          >
            <CircularProgress size={48} sx={{ color: '#60A5FA' }} />
            <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: 18, letterSpacing: -0.2 }}>
              正在載入全台氣象資料…
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500 }}>
              中央氣象署 3 天逐 3 小時精準預報
            </Typography>
          </Box>
        )
      ) : (
        <>
          {/* ── Top AppBar (桌面模式) ── */}
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              background: 'rgba(10, 15, 30, 0.88)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              zIndex: 1100,
            }}
          >
            <Toolbar
              sx={{
                gap: { xs: 1, sm: 2 },
                flexWrap: 'nowrap',
                minHeight: { xs: 56, sm: 64 },
                px: { xs: 1.5, sm: 3 },
              }}
            >
              <WbSunnyIcon sx={{ color: '#FFD740', fontSize: { xs: 24, sm: 28 }, flexShrink: 0 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    fontSize: { xs: 16, sm: 20 },
                    lineHeight: 1.2,
                  }}
                >
                  台灣各縣市即時天氣
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' }, fontSize: 13, fontWeight: 500 }}
                >
                  中央氣象署各縣市鄉鎮 3 天逐 3 小時精準天氣預報
                </Typography>
              </Box>

              {/* 切換地區按鈕 (iOS 彈窗) */}
              {cities.length > 0 && (
                <Button
                  onClick={() => setDesktopLocationModalOpen(true)}
                  size="small"
                  startIcon={<EditLocationAltIcon />}
                  sx={{
                    color: '#93C5FD',
                    bgcolor: 'rgba(96,165,250,0.12)',
                    border: '1px solid rgba(96,165,250,0.25)',
                    fontSize: 13,
                    fontWeight: 700,
                    px: 1.5,
                    display: { xs: 'none', sm: 'inline-flex' },
                    '&:hover': { bgcolor: 'rgba(96,165,250,0.2)' },
                  }}
                >
                  切換地區
                </Button>
              )}

              {/* iOS 模式切換按鈕 */}
              {cities.length > 0 && (
                <Button
                  onClick={() => setViewModeOverride('ios')}
                  size="small"
                  startIcon={<PhoneIphoneIcon />}
                  sx={{
                    color: '#CBD5E1',
                    bgcolor: 'rgba(255,255,255,0.06)',
                    fontSize: 12,
                    fontWeight: 700,
                    px: 1.25,
                    display: { xs: 'none', sm: 'inline-flex' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                  }}
                >
                  iPhone 視圖
                </Button>
              )}

              {/* 更新時間 Chip */}
              {lastFetchedAt && !isMobile && (
                <Chip
                  label={`資料時間 ${dayjs(lastFetchedAt).format('HH:mm')}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(255,255,255,0.25)',
                    color: '#CBD5E1',
                    fontSize: 13,
                    fontWeight: 600,
                    height: 28,
                    px: 0.5,
                  }}
                />
              )}

              {/* API Key 設定按鈕 */}
              <IconButton
                onClick={() => setApiKeyDialogOpen(true)}
                size="small"
                title="設定氣象署個人 API Key (避免 429 限流)"
                sx={{
                  color: localStorage.getItem('cwa_api_key') ? '#60A5FA' : 'text.secondary',
                  flexShrink: 0,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <VpnKeyIcon fontSize="small" />
              </IconButton>

              {/* 重新整理按鈕 */}
              <IconButton
                onClick={handleRefresh}
                disabled={refreshing || cooldown > 0}
                size="small"
                title={cooldown > 0 ? `防刷冷卻中（剩餘 ${cooldown} 秒）` : '更新所有縣市資料'}
                sx={{
                  color: cooldown > 0 ? 'text.disabled' : 'text.secondary',
                  flexShrink: 0,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                {refreshing ? (
                  <CircularProgress size={16} sx={{ color: '#60A5FA' }} />
                ) : (
                  <RefreshIcon fontSize="small" />
                )}
              </IconButton>
            </Toolbar>
          </AppBar>

      {/* ── 主容器：加入初次進入頁面優雅 FadeIn 特效 ── */}
      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 2, sm: 3 },
          px: { xs: 1.5, sm: 3 },
          animation: 'pageFadeIn 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
          '@keyframes pageFadeIn': {
            '0%': { opacity: 0, transform: 'translateY(16px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >

        {/* 載入中狀態 */}
        {isLoading && cities.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <Stack spacing={2} sx={{ alignItems: 'center' }}>
              <CircularProgress size={52} thickness={4} />
              <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>
                正在透過 Promise.all 併發載入全台 22 縣市天氣資料…
              </Typography>
            </Stack>
          </Box>
        )}

        {/* 錯誤提示 */}
        {error && !isLoading && cities.length === 0 && (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setApiKeyDialogOpen(true)}
                sx={{ fontWeight: 700 }}
              >
                設定個人 API Key
              </Button>
            }
            sx={{ mb: 3, borderRadius: `${R.md}px` }}
          >
            {String(error).includes('429')
              ? '氣象署 API 存取頻率受限 (429 Too Many Requests)。公共金鑰已被限流，請點擊按鈕填寫個人免費金鑰！'
              : `取得天氣資料失敗：${error}`}
          </Alert>
        )}

        {/* 骨架屏 */}
        {!isLoading && !error && cities.length === 0 && (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={60} sx={{ borderRadius: `${R.md}px` }} />
            <Skeleton variant="rounded" height={48} sx={{ borderRadius: `${R.md}px` }} />
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: `${R.md}px` }} />
          </Stack>
        )}

        {/* ── 已取得縣市資料 ── */}
        {cities.length > 0 && (
          <>
            {/* 1. 大 Tab：22 縣市標籤（加大清晰） */}
            <Box
              sx={{
                mb: 2,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: `${R.md}px`,
                p: 0.75,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Tabs
                value={selectedCity}
                onChange={(_, val) => setSelectedCity(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 52,
                  '& .MuiTabs-indicator': {
                    height: 4,
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, #60A5FA, #818CF8)',
                  },
                  '& .MuiTab-root': {
                    minHeight: 50,
                    py: 1,
                    px: { xs: 2.2, sm: 3 },
                    borderRadius: `${R.sm}px`,
                    fontWeight: 800,
                    fontSize: { xs: 15, sm: 17 },
                    color: 'text.secondary',
                    '&.Mui-selected': {
                      color: '#93C5FD',
                      background: 'rgba(96,165,250,0.16)',
                    },
                  },
                }}
              >
                {CITIES.map((c) => (
                  <Tab key={c.name} value={c.name} label={c.name} />
                ))}
              </Tabs>
            </Box>

            {/* 2. 小 Tab：鄉鎮市區標籤（加大膠囊） */}
            {townships.length > 0 && (
              <Box
                sx={{
                  mb: 3,
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: `${R.md}px`,
                  p: 1,
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <Tabs
                  value={currentTownshipData?.townshipName || townships[0]?.townshipName}
                  onChange={(_, val) => setSelectedTownship(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    minHeight: 44,
                    '& .MuiTabs-indicator': { display: 'none' },
                    '& .MuiTab-root': {
                      minHeight: 42,
                      py: 0.75,
                      px: { xs: 1.8, sm: 2.5 },
                      mx: 0.4,
                      borderRadius: `${R.sm}px`,
                      fontWeight: 700,
                      fontSize: { xs: 14, sm: 15.5 },
                      color: 'text.secondary',
                      border: '1px solid transparent',
                      transition: 'all 0.15s ease',
                      '&.Mui-selected': {
                        color: '#FFFFFF',
                        background: 'rgba(99,102,241,0.32)',
                        borderColor: 'rgba(129,140,248,0.7)',
                        boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                      },
                      '&:hover': {
                        background: 'rgba(255,255,255,0.07)',
                      },
                    },
                  }}
                >
                  {townships.map((t) => (
                    <Tab key={t.townshipName} value={t.townshipName} label={t.townshipName} />
                  ))}
                </Tabs>
              </Box>
            )}

            {/* 3. 目前位置與時段標題（放大） */}
            {currentTownshipData && displayPeriod && (
              <Box sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                  <LocationOnIcon sx={{ color: '#60A5FA', fontSize: { xs: 28, sm: 34 } }} />
                  <Typography
                    variant={isMobile ? 'h5' : 'h4'}
                    sx={{ fontWeight: 900, color: '#F1F5F9', letterSpacing: 0.5, fontSize: { xs: 22, sm: 30 } }}
                  >
                    {selectedCity} {currentTownshipData.townshipName}
                  </Typography>
                </Stack>
                <Typography
                  variant="body1"
                  sx={{ color: 'text.secondary', mt: 0.5, ml: { sm: 5.5, xs: 5 }, fontSize: { xs: 14, sm: 16 }, fontWeight: 500 }}
                >
                  {dayjs(displayPeriod.startTime).format('YYYY年M月D日 HH:mm')} –{' '}
                  {dayjs(displayPeriod.endTime).format('HH:mm')} 預報（逐 3 小時）
                </Typography>
              </Box>
            )}

            {/* 4. 天氣維度 Tabs（加大） */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v as TabCategory)}
              sx={{
                mb: { xs: 2.5, sm: 3.5 },
                minHeight: 50,
                '& .MuiTabs-indicator': { height: 4, borderRadius: 2 },
                '& .MuiTab-root': {
                  borderRadius: `${R.sm}px`,
                  fontWeight: 800,
                  fontSize: { xs: 14.5, sm: 16.5 },
                  minWidth: { xs: 'auto', sm: 110 },
                  px: { xs: 2.2, sm: 3 },
                  minHeight: 50,
                },
              }}
              variant="scrollable"
              scrollButtons="auto"
            >
              {TAB_CONFIG.map((t) => (
                <Tab key={t.value} value={t.value} label={t.label} />
              ))}
            </Tabs>


            {/* 5. 分頁內容展示 */}
            {activeTab === 'overview' && (
              <>
                {displayPeriod && <OverviewPanel period={displayPeriod} />}

                {/* 水平滑動時段卡片清單 */}
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 4, mb: 1.5, color: '#E2E8F0', fontSize: { xs: 17, sm: 20 } }}>
                  未來 3 天逐時預報（逐 3 小時）
                </Typography>

                <DragScrollBox>
                  {periods.map((p) => (
                    <PeriodCard
                      key={p.startTime}
                      period={p}
                      category="overview"
                      isCurrent={p.startTime === autoCurrentPeriod?.startTime}
                      isSelected={
                        selectedPeriodTime
                          ? p.startTime === selectedPeriodTime
                          : p.startTime === autoCurrentPeriod?.startTime
                      }
                      onSelect={handleSelectPeriod}
                    />
                  ))}
                </DragScrollBox>
              </>
            )}

            {activeTab === 'temperature' && (
              <TemperaturePanel
                periods={periods}
                currentPeriod={displayPeriod}
                selectedPeriodTime={selectedPeriodTime || autoCurrentPeriod?.startTime}
                onSelectPeriod={handleSelectPeriod}
                autoCurrentPeriodStartTime={autoCurrentPeriod?.startTime}
              />
            )}
            {activeTab === 'wind' && (
              <WindPanel
                periods={periods}
                currentPeriod={displayPeriod}
                selectedPeriodTime={selectedPeriodTime || autoCurrentPeriod?.startTime}
                onSelectPeriod={handleSelectPeriod}
                autoCurrentPeriodStartTime={autoCurrentPeriod?.startTime}
              />
            )}
            {activeTab === 'rain' && (
              <RainPanel
                periods={periods}
                currentPeriod={displayPeriod}
                selectedPeriodTime={selectedPeriodTime || autoCurrentPeriod?.startTime}
                onSelectPeriod={handleSelectPeriod}
                autoCurrentPeriodStartTime={autoCurrentPeriod?.startTime}
              />
            )}
            {activeTab === 'comfort' && (
              <ComfortPanel
                periods={periods}
                currentPeriod={displayPeriod}
                selectedPeriodTime={selectedPeriodTime || autoCurrentPeriod?.startTime}
                onSelectPeriod={handleSelectPeriod}
                autoCurrentPeriodStartTime={autoCurrentPeriod?.startTime}
              />
            )}
          </>
        )}
      </Container>
    </>
  )}

  {/* ── 桌面版使用的地區切換彈窗 ── */}
  <IOSLocationModal
    open={desktopLocationModalOpen}
    onClose={() => setDesktopLocationModalOpen(false)}
    selectedCity={selectedCity}
    selectedTownship={selectedTownship}
    onSelectCityAndTownship={setSelectedCityAndTownship}
    citiesData={cities}
  />

      {/* ── API Key 設定彈跳視窗 ── */}
      <Dialog
        open={apiKeyDialogOpen}
        onClose={() => setApiKeyDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#1E293B',
              color: '#F1F5F9',
              borderRadius: `${R.md}px`,
              border: '1px solid rgba(255,255,255,0.1)',
              minWidth: { xs: 300, sm: 460 },
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 18 }}>
          🔑 設定中央氣象署 API 授權碼（API Key）
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
            氣象署開放平台免費提供每位會員每日 <b>300,000 次</b> 呼叫額度。
            使用個人金鑰可徹底解決「429 Too Many Requests」公共金鑰頻繁撞車限流的問題。
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Authorization Key"
            placeholder="例如: CWA-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            helperText="若留空將使用預設公共測試金鑰"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#F8FAFC',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: '#60A5FA' },
              },
              '& .MuiInputLabel-root': { color: 'text.secondary' },
              '& .MuiFormHelperText-root': { color: 'text.secondary' },
            }}
          />
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#94A3B8' }}>
            尚未取得金鑰？可至{' '}
            <a
              href="https://opendata.cwa.gov.tw/userLogin"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#60A5FA', textDecoration: 'underline' }}
            >
              氣象資料開放平臺
            </a>{' '}
            免費註冊會員並取得授權碼。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setApiKeyDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveApiKey}
            sx={{ bgcolor: '#3B82F6', '&:hover': { bgcolor: '#2563EB' }, fontWeight: 700 }}
          >
            儲存並套用
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 狀態通知 Toast ── */}
      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg(null)}
        message={snackbarMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          content: {
            sx: {
              bgcolor: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: `${R.sm}px`,
              color: '#F1F5F9',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            },
          },
        }}
      />
    </Box>
  );
}
