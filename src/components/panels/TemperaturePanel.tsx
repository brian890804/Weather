import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import dayjs from 'dayjs';
import type { WeatherPeriod } from '../../types/weather';
import { tempColor } from '../../utils/weatherUtils';
import { R } from '../../App';


interface TemperaturePanelProps {
  periods: WeatherPeriod[];
  currentPeriod?: WeatherPeriod;
}

export default function TemperaturePanel({ periods, currentPeriod }: TemperaturePanelProps) {
  return (
    <Box>
      {/* 目前溫度 hero */}
      {currentPeriod && (
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: `${R.md}px`,
            mb: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, rgba(239,83,80,0.15), rgba(255,167,38,0.10))',
            border: '1px solid rgba(239,83,80,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 2, sm: 3 },
            flexWrap: 'wrap',
          }}
        >
          <ThermostatIcon sx={{ fontSize: { xs: 44, sm: 56 }, color: tempColor(currentPeriod.temperature) }} />
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 800, color: tempColor(currentPeriod.temperature), lineHeight: 1 }}>
              {currentPeriod.temperature}°C
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>平均溫度</Typography>
          </Box>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ArrowUpwardIcon sx={{ fontSize: 18, color: '#EF5350' }} />
              <Typography>最高 <strong>{currentPeriod.maxTemperature}°C</strong></Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                體感 {currentPeriod.maxApparentTemperature}°C
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ArrowDownwardIcon sx={{ fontSize: 18, color: '#42A5F5' }} />
              <Typography>最低 <strong>{currentPeriod.minTemperature}°C</strong></Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                體感 {currentPeriod.minApparentTemperature}°C
              </Typography>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* 7天溫度列表 */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
        逐 12 小時溫度
      </Typography>
      {/* 內部捲動容器 */}
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
          const max = parseInt(p.maxTemperature) || 0;
          const min = parseInt(p.minTemperature) || 0;
          const avg = parseInt(p.temperature) || 0;
          const maxAll = 42;

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

                  {/* 視覺化溫度條 */}
                  <Box flex={1} sx={{ minWidth: 160 }}>
                    <Box sx={{ position: 'relative', height: 10, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          position: 'absolute',
                          left: `${(min / maxAll) * 100}%`,
                          width: `${((max - min) / maxAll) * 100}%`,
                          height: '100%',
                          borderRadius: 5,
                          background: `linear-gradient(to right, ${tempColor(String(min))}, ${tempColor(String(max))})`,
                        }}
                      />
                    </Box>
                  </Box>

                  {/* 溫度數字 */}
                  <Stack direction="row" spacing={2} sx={{ minWidth: 200 }}>
                    <Stack alignItems="center">
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>均</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: tempColor(String(avg)) }}>
                        {avg}°
                      </Typography>
                    </Stack>
                    <Stack alignItems="center">
                      <Typography variant="caption" sx={{ color: '#EF5350' }}>最高</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#EF5350' }}>
                        {p.maxTemperature}°
                      </Typography>
                    </Stack>
                    <Stack alignItems="center">
                      <Typography variant="caption" sx={{ color: '#42A5F5' }}>最低</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#42A5F5' }}>
                        {p.minTemperature}°
                      </Typography>
                    </Stack>
                    <Stack alignItems="center">
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>感高</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: tempColor(p.maxApparentTemperature) }}>
                        {p.maxApparentTemperature}°
                      </Typography>
                    </Stack>
                    <Stack alignItems="center">
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>感低</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: tempColor(p.minApparentTemperature) }}>
                        {p.minApparentTemperature}°
                      </Typography>
                    </Stack>
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
