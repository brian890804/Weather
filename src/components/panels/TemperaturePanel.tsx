import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { WeatherPeriod } from '../../types/weather';
import { tempColor } from '../../utils/weatherUtils';
import { R } from '../../App';
import PeriodCard from '../PeriodCard/PeriodCard';
import DragScrollBox from '../common/DragScrollBox';

interface TemperaturePanelProps {
  periods: WeatherPeriod[];
  currentPeriod?: WeatherPeriod;
  selectedPeriodTime?: string;
  onSelectPeriod?: (startTime: string) => void;
  autoCurrentPeriodStartTime?: string;
}

export default function TemperaturePanel({
  periods,
  currentPeriod,
  selectedPeriodTime,
  onSelectPeriod,
  autoCurrentPeriodStartTime,
}: TemperaturePanelProps) {
  return (
    <Box>
      {/* 目前選中時段溫度 hero */}
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
            <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>氣溫狀況</Typography>
          </Box>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <ArrowUpwardIcon sx={{ fontSize: 18, color: '#EF5350' }} />
              <Typography>最高 <strong>{currentPeriod.maxTemperature}°C</strong></Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                體感 {currentPeriod.maxApparentTemperature}°C
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <ArrowDownwardIcon sx={{ fontSize: 18, color: '#42A5F5' }} />
              <Typography>最低 <strong>{currentPeriod.minTemperature}°C</strong></Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                體感 {currentPeriod.minApparentTemperature}°C
              </Typography>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* 下半部：水平左右拖動時段卡片 */}
      <Typography variant="h6" sx={{ fontWeight: 800, mt: 3, mb: 1.5, color: '#E2E8F0', fontSize: { xs: 17, sm: 20 } }}>
        未來 3 天逐時溫度預報（逐 3 小時）
        <Typography
          component="span"
          sx={{ ml: 1.5, color: 'text.secondary', fontWeight: 500, fontSize: { xs: 13, sm: 14.5 } }}
        >
          點擊卡片查看該時段詳情，可左右滑動/拖曳
        </Typography>
      </Typography>

      <DragScrollBox>
        {periods.map((p) => (
          <PeriodCard
            key={p.startTime}
            period={p}
            category="temperature"
            isCurrent={p.startTime === autoCurrentPeriodStartTime}
            isSelected={
              selectedPeriodTime
                ? p.startTime === selectedPeriodTime
                : p.startTime === autoCurrentPeriodStartTime
            }
            onSelect={onSelectPeriod}
          />
        ))}
      </DragScrollBox>
    </Box>
  );
}
