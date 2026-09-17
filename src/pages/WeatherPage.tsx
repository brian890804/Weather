import { useState, useCallback, useMemo } from 'react';
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
import PeriodCard from '../components/PeriodCard/PeriodCard';
import DragScrollBox from '../components/common/DragScrollBox';
import OverviewPanel from '../components/panels/OverviewPanel';
import TemperaturePanel from '../components/panels/TemperaturePanel';
import WindPanel from '../components/panels/WindPanel';
import RainPanel from '../components/panels/RainPanel';
import ComfortPanel from '../components/panels/ComfortPanel';
import { clearCache } from '../utils/cache';
import { R } from '../App';

dayjs.locale('zh-tw');

const TAB_CONFIG: { value: TabCategory; label: string }[] = [
  { value: 'overview', label: '📊 總覽' },
  { value: 'temperature', label: '🌡️ 溫度' },
  { value: 'wind', label: '💨 風' },
  { value: 'rain', label: '🌧️ 降雨' },
  { value: 'comfort', label: '😊 舒適度' },
];

export default function WeatherPage() {
  const { isLoading, error, refetch } = useWeatherData();
  const {
    cities,
    selectedCity,
    setSelectedCity,
    selectedTownship,
    setSelectedTownship,
    activeTab,
    setActiveTab,
    lastFetchedAt,
    selectedPeriodTime,
    setSelectedPeriodTime,
  } = useWeatherStore();

  const [_refreshing, setRefreshing] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  // 3. 判斷自動預設當前時段（以現在時間為基準）
  const autoCurrentPeriod = useMemo(() => {
    const now = dayjs();
    return (
      periods.find(
        (p) => now.isAfter(dayjs(p.startTime)) && now.isBefore(dayjs(p.endTime))
      ) ?? periods[0]
    );
  }, [periods]);

  // 4. 使用者點擊時段卡片選中的時段（瞬間秒開）
  const displayPeriod = useMemo(() => {
    return selectedPeriodTime
      ? periods.find((p) => p.startTime === selectedPeriodTime) ?? autoCurrentPeriod
      : autoCurrentPeriod;
  }, [selectedPeriodTime, periods, autoCurrentPeriod]);

  const handleSelectPeriod = useCallback((startTime: string) => {
    setSelectedPeriodTime(startTime);
  }, [setSelectedPeriodTime]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at 20% 10%, rgba(30,60,114,0.7) 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(42,82,152,0.4) 0%, transparent 60%), #0a0f1e',
      }}
    >
      {/* ── Top AppBar ── */}
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

          {/* 重新整理按鈕 */}
          <IconButton
            onClick={handleRefresh}
            size="small"
            title="更新所有縣市資料"
            sx={{
              color: 'text.secondary',
              flexShrink: 0,
              bgcolor: 'rgba(255,255,255,0.05)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <RefreshIcon fontSize="small" />
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
          <Alert severity="error" sx={{ mb: 3, borderRadius: `${R.md}px` }}>
            取得天氣資料失敗：{error}
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
    </Box>
  );
}
