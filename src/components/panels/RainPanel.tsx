import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import UmbrellaIcon from '@mui/icons-material/BeachAccess';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import dayjs from 'dayjs';
import type { WeatherPeriod } from '../../types/weather';
import { popColor, uvLevelColor } from '../../utils/weatherUtils';
import { R } from '../../App';


interface RainPanelProps {
  periods: WeatherPeriod[];
  currentPeriod?: WeatherPeriod;
}

export default function RainPanel({ periods, currentPeriod }: RainPanelProps) {
  const popPeriods = periods.filter(
    (p) => p.probabilityOfPrecipitation !== '-'
  );
  const maxPop = popPeriods.reduce(
    (m, p) => Math.max(m, parseInt(p.probabilityOfPrecipitation) || 0),
    0
  );

  return (
    <Box>
      {/* 目前降雨 hero */}
      {currentPeriod && (
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: `${R.md}px`,
            mb: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, rgba(66,165,245,0.15), rgba(30,136,229,0.08))',
            border: '1px solid rgba(66,165,245,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 2, sm: 3 },
            flexWrap: 'wrap',
          }}
        >
          <UmbrellaIcon sx={{ fontSize: { xs: 44, sm: 56 }, color: popColor(currentPeriod.probabilityOfPrecipitation) }} />
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 800, color: popColor(currentPeriod.probabilityOfPrecipitation), lineHeight: 1 }}>
              {currentPeriod.probabilityOfPrecipitation !== '-'
                ? `${currentPeriod.probabilityOfPrecipitation}%`
                : '- %'}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              12 小時降雨機率
            </Typography>
          </Box>
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <WaterDropIcon sx={{ color: '#42A5F5', fontSize: 18 }} />
              <Typography>相對濕度 <strong>{currentPeriod.relativeHumidity}%</strong></Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <WaterDropIcon sx={{ color: '#80DEEA', fontSize: 18 }} />
              <Typography>露點溫度 <strong>{currentPeriod.dewPoint}°C</strong></Typography>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* 全週最高降雨機率 */}
      <Box
        sx={{
          p: 2,
          borderRadius: `${R.md}px`,
          mb: { xs: 2, sm: 3 },
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          未來最高降雨機率：<strong style={{ color: popColor(String(maxPop)) }}>{maxPop}%</strong>
        </Typography>
        <LinearProgress
          variant="determinate"
          value={maxPop}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.08)',
            '& .MuiLinearProgress-bar': { bgcolor: popColor(String(maxPop)), borderRadius: 4 },
          }}
        />
      </Box>

      {/* 逐期降雨 + 紫外線 */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
        逐 12 小時降雨機率 & 紫外線
      </Typography>
      <Box
        sx={{
          maxHeight: { xs: 400, sm: 520 },
          overflowY: 'auto',
          pr: 0.5,
          '&::-webkit-scrollbar': { width: 5 },
          '&::-webkit-scrollbar-track': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)' },
          '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.18)' },
        }}
      >
      <Stack spacing={1.5}>
        {periods.map((p) => {
          const pop = p.probabilityOfPrecipitation;
          const popVal = parseInt(pop) || 0;
          const uvVal = parseInt(p.uvIndex) || 0;
          const start = dayjs(p.startTime);
          const isNight = start.hour() >= 18 || start.hour() < 6;

          return (
            <Card
              key={p.startTime}
              elevation={0}
              sx={{
                borderRadius: `${R.md}px`,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                  <Box sx={{ minWidth: 130 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {start.format('M/D (dd)')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {start.format('HH:mm')}–{dayjs(p.endTime).format('HH:mm')}
                    </Typography>
                  </Box>

                  {/* 降雨機率條 */}
                  <Stack flex={1} spacing={0.5}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <WaterDropIcon sx={{ fontSize: 14, color: popColor(pop) }} />
                      <Typography variant="body2" sx={{ minWidth: 32, fontWeight: 700, color: popColor(pop) }}>
                        {pop !== '-' ? `${pop}%` : '-'}
                      </Typography>
                      <Box flex={1} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2, height: 6, overflow: 'hidden' }}>
                        {pop !== '-' && (
                          <Box sx={{ width: `${popVal}%`, height: '100%', bgcolor: popColor(pop), borderRadius: 2 }} />
                        )}
                      </Box>
                    </Stack>

                    {/* 紫外線 */}
                    {!isNight && p.uvIndex !== '-' && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <WbSunnyIcon sx={{ fontSize: 14, color: uvLevelColor(p.uvExposureLevel) }} />
                        <Typography variant="body2" sx={{ minWidth: 32, fontWeight: 700, color: uvLevelColor(p.uvExposureLevel) }}>
                          UV {p.uvIndex}
                        </Typography>
                        <Box flex={1} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2, height: 6, overflow: 'hidden' }}>
                          <Box sx={{ width: `${(uvVal / 11) * 100}%`, height: '100%', bgcolor: uvLevelColor(p.uvExposureLevel), borderRadius: 2 }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: uvLevelColor(p.uvExposureLevel), fontWeight: 600 }}>
                          {p.uvExposureLevel}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>

                  {/* 濕度 */}
                  <Typography variant="body2" sx={{ color: '#42A5F5', fontWeight: 600, minWidth: 48 }}>
                    {p.relativeHumidity}% 濕
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
      </Box>
    </Box>
  );
}
