import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import AirIcon from '@mui/icons-material/Air';
import dayjs from 'dayjs';
import type { WeatherPeriod } from '../../types/weather';
import { beaufortLabel } from '../../utils/weatherUtils';
import { R } from '../../App';

/** 風向轉羅盤角度 */
function windDegree(dir: string): number {
  const map: Record<string, number> = {
    '北風': 0, '偏北風': 0,
    '東北風': 45, '偏東北風': 45,
    '東風': 90, '偏東風': 90,
    '東南風': 135, '偏東南風': 135,
    '南風': 180, '偏南風': 180,
    '西南風': 225, '偏西南風': 225,
    '西風': 270, '偏西風': 270,
    '西北風': 315, '偏西北風': 315,
  };
  return map[dir] ?? 0;
}

/** 蒲福風力等級顏色 */
function bftColor(scale: string): string {
  const v = parseInt(scale);
  if (v <= 2) return '#81C784';
  if (v <= 4) return '#64B5F6';
  if (v <= 6) return '#FFA726';
  if (v <= 9) return '#EF5350';
  return '#AB47BC';
}

/** 風羅盤指針 */
function WindCompass({ direction, size = 56 }: { direction: string; size?: number }) {
  const deg = windDegree(direction);
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.15)',
        position: 'relative',
        background: 'rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${deg}deg)`,
          fontSize: 20,
          lineHeight: 1,
          color: '#90CAF9',
          userSelect: 'none',
        }}
      >
        ↑
      </Box>
    </Box>
  );
}

interface WindPanelProps {
  periods: WeatherPeriod[];
  currentPeriod?: WeatherPeriod;
}

export default function WindPanel({ periods, currentPeriod }: WindPanelProps) {
  return (
    <Box>
      {/* 目前風況 hero */}
      {currentPeriod && (
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: `${R.md}px`,
            mb: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, rgba(144,202,249,0.15), rgba(100,181,246,0.08))',
            border: '1px solid rgba(144,202,249,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 2, sm: 3 },
            flexWrap: 'wrap',
          }}
        >
          <AirIcon sx={{ fontSize: { xs: 44, sm: 56 }, color: '#90CAF9' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#90CAF9', lineHeight: 1 }}>
              {currentPeriod.windDirection}
            </Typography>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              {beaufortLabel(currentPeriod.beaufortScale)} (蒲福 {currentPeriod.beaufortScale} 級)
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              風速 {currentPeriod.windSpeed} m/s
            </Typography>
          </Box>
          <WindCompass direction={currentPeriod.windDirection} size={80} />
        </Box>
      )}

      {/* 逐期風況 */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
        逐 12 小時風況
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
          const start = dayjs(p.startTime);
          const color = bftColor(p.beaufortScale);
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
                  {/* 時間 */}
                  <Box sx={{ minWidth: 130 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {start.format('M/D (dd)')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {start.format('HH:mm')}–{dayjs(p.endTime).format('HH:mm')}
                    </Typography>
                  </Box>

                  {/* 羅盤 */}
                  <WindCompass direction={p.windDirection} size={44} />

                  {/* 數據 */}
                  <Stack direction="row" spacing={2} flex={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#90CAF9', minWidth: 60 }}>
                      {p.windDirection}
                    </Typography>
                    <Chip
                      label={`蒲福 ${p.beaufortScale} 級`}
                      size="small"
                      sx={{ bgcolor: `${color}22`, color, border: `1px solid ${color}55`, fontWeight: 700 }}
                    />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {beaufortLabel(p.beaufortScale)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {p.windSpeed} m/s
                    </Typography>
                  </Stack>
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
