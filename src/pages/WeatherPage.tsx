import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';

import { useWeatherStore, type TabCategory } from '../store/weatherStore';
import { useWeatherData } from '../hooks/useWeatherData';
import PeriodCard from '../components/PeriodCard/PeriodCard';
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
  const { isLoading, error } = useWeatherData();
  const {
    locations,
    selectedLocation,
    setSelectedLocation,
    activeTab,
    setActiveTab,
    lastFetchedAt,
    selectedPeriodTime,
    setSelectedPeriodTime,
  } = useWeatherStore();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_refreshKey, setRefreshKey] = useState(0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const locationData = locations.find((l) => l.locationName === selectedLocation);
  const periods = locationData?.periods ?? [];

  // 目前所在的時段（以當前時間判斷）
  const now = dayjs();
  const autoCurrentPeriod = periods.find(
    (p) => now.isAfter(dayjs(p.startTime)) && now.isBefore(dayjs(p.endTime))
  ) ?? periods[0];

  // 使用者選中的時段（點卡片），或自動時段
  const displayPeriod = selectedPeriodTime
    ? (periods.find((p) => p.startTime === selectedPeriodTime) ?? autoCurrentPeriod)
    : autoCurrentPeriod;

  function handleSelectPeriod(startTime: string) {
    // 再點一次已選中的 → 取消選取（回到自動）
    if (selectedPeriodTime === startTime) {
      setSelectedPeriodTime(null);
    } else {
      setSelectedPeriodTime(startTime);
    }
  }

  function handleRefresh() {
    clearCache();
    setRefreshKey((k) => k + 1);
    window.location.reload();
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at 20% 20%, rgba(30,60,114,0.8) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(42,82,152,0.5) 0%, transparent 60%), #0a0f1e',
      }}
    >
      {/* ── AppBar ── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(10, 15, 30, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Toolbar
          sx={{
            gap: { xs: 1, sm: 2 },
            flexWrap: 'nowrap',
            minHeight: { xs: 52, sm: 64 },
            px: { xs: 1.5, sm: 3 },
          }}
        >
          <WbSunnyIcon sx={{ color: '#FFD740', fontSize: { xs: 22, sm: 28 }, flexShrink: 0 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: 0.5,
              flexGrow: 1,
              fontSize: { xs: 15, sm: 18 },
              whiteSpace: 'nowrap',
            }}
          >
            台灣天氣預報
          </Typography>

          {/* 縣市選擇 */}
          {locations.length > 0 && (
            <FormControl size="small" sx={{ minWidth: { xs: 110, sm: 140 } }}>
              <InputLabel sx={{ fontSize: { xs: 13, sm: 14 } }}>縣市</InputLabel>
              <Select
                value={selectedLocation}
                label="縣市"
                onChange={(e) => setSelectedLocation(e.target.value)}
                sx={{ borderRadius: `${R.sm}px`, fontSize: { xs: 13, sm: 14 } }}
              >
                {locations.map((l) => (
                  <MenuItem key={l.locationName} value={l.locationName}>
                    {l.locationName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* 更新時間 – 手機隱藏 */}
          {lastFetchedAt && !isMobile && (
            <Chip
              label={`更新 ${dayjs(lastFetchedAt).format('HH:mm')}`}
              size="small"
              variant="outlined"
              sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary', fontSize: 11 }}
            />
          )}

          <IconButton onClick={handleRefresh} size="small" sx={{ color: 'text.secondary', flexShrink: 0 }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* ── 主內容 ── */}
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
        {/* 載入中 */}
        {isLoading && (
          <Box display="flex" justifyContent="center" py={8}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={48} />
              <Typography color="text.secondary">正在載入天氣資料…</Typography>
            </Stack>
          </Box>
        )}

        {/* 錯誤 */}
        {error && !isLoading && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: `${R.md}px` }}>
            無法取得天氣資料：{error}
          </Alert>
        )}

        {/* 骨架 */}
        {!isLoading && !error && locations.length === 0 && (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={160} sx={{ borderRadius: `${R.md}px` }} />
            <Skeleton variant="rounded" height={100} sx={{ borderRadius: `${R.md}px` }} />
          </Stack>
        )}

        {/* 主要內容 */}
        {locationData && (
          <>
            {/* 標題 */}
            {displayPeriod && (
              <Box mb={2}>
                <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 800, mb: 0.25 }}>
                  {selectedLocation}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {dayjs(displayPeriod.startTime).format('YYYY年M月D日 HH:mm')} –{' '}
                  {dayjs(displayPeriod.endTime).format('HH:mm')} 預報
                </Typography>
              </Box>
            )}

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v as TabCategory)}
              sx={{
                mb: { xs: 2, sm: 3 },
                '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
                '& .MuiTab-root': {
                  borderRadius: `${R.sm}px`,
                  fontWeight: 600,
                  fontSize: { xs: 12, sm: 14 },
                  minWidth: { xs: 'auto', sm: 90 },
                  px: { xs: 1.5, sm: 2 },
                },
              }}
              variant="scrollable"
              scrollButtons="auto"
            >
              {TAB_CONFIG.map((t) => (
                <Tab key={t.value} value={t.value} label={t.label} />
              ))}
            </Tabs>

            {/* ── Overview ── */}
            {activeTab === 'overview' && (
              <>
                {/* 上半：選中/當前時段 overview */}
                {displayPeriod && <OverviewPanel period={displayPeriod} />}

                <Typography variant="h6" sx={{ fontWeight: 700, mt: 4, mb: 1.5, color: 'text.secondary' }}>
                  未來 7 天（逐 12 小時）
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ ml: 1.5, color: 'text.secondary', fontWeight: 400 }}
                  >
                    點卡片查看詳情
                  </Typography>
                </Typography>

                {/* 水平捲動 cards */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: { xs: 1.5, sm: 2 },
                    overflowX: 'auto',
                    overflowY: 'visible',
                    py: 1,
                    mx: -0.5,
                    px: 0.5,
                    '&::-webkit-scrollbar': { height: 5 },
                    '&::-webkit-scrollbar-track': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)' },
                    '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.18)' },
                  }}
                >
                  {periods.map((p) => (
                    <PeriodCard
                      key={p.startTime}
                      period={p}
                      isCurrent={p.startTime === autoCurrentPeriod?.startTime}
                      isSelected={
                        selectedPeriodTime
                          ? p.startTime === selectedPeriodTime
                          : p.startTime === autoCurrentPeriod?.startTime
                      }
                      onSelect={handleSelectPeriod}
                    />
                  ))}
                </Box>
              </>
            )}

            {activeTab === 'temperature' && (
              <TemperaturePanel periods={periods} currentPeriod={displayPeriod} />
            )}
            {activeTab === 'wind' && (
              <WindPanel periods={periods} currentPeriod={displayPeriod} />
            )}
            {activeTab === 'rain' && (
              <RainPanel periods={periods} currentPeriod={displayPeriod} />
            )}
            {activeTab === 'comfort' && (
              <ComfortPanel periods={periods} currentPeriod={displayPeriod} />
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
