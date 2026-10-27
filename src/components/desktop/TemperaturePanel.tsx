import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { WeatherPeriod } from '../../types/weather';
import { tempColor, getWeatherIconUrl } from '../../utils/weatherUtils';
import { R } from '../../App';
import { useActiveStation } from '../../hooks/useActiveStation';
import { computeLiveConditions, isPeriodNow } from '../../utils/liveConditions';
import PeriodCard from '../PeriodCard/PeriodCard';
import DragScrollBox from '../common/DragScrollBox';

function getTemperatureIconName(temp: string): string {
  const t = parseInt(temp, 10);
  if (isNaN(t)) return 'thermometer-celsius';
  if (t >= 28) return 'thermometer-sun';
  if (t <= 16) return 'thermometer-colder';
  return 'thermometer-celsius';
}

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
  // 實測值只套用在涵蓋現在的時段，並與總覽共用同一個（可手動切換的）測站
  const { station, isCityFallback } = useActiveStation();
  const live = currentPeriod
    ? computeLiveConditions(currentPeriod, station, { isNow: isPeriodNow(currentPeriod), isCityFallback })
    : null;
  const displayTemp = live?.temperature;

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
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              width: { xs: 64, sm: 80 },
              height: { xs: 64, sm: 80 },
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(239,83,80,0.25) 0%, rgba(239,83,80,0) 70%)',
              animation: 'tempIconFloat 3.5s ease-in-out infinite',
              '@keyframes tempIconFloat': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-5px)' },
              },
            }}
          >
            <Box
              component="img"
              src={getWeatherIconUrl(getTemperatureIconName(displayTemp ?? ''))}
              alt="氣溫狀況"
              sx={{
                width: { xs: 56, sm: 72 },
                height: { xs: 56, sm: 72 },
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(239,83,80,0.4))',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </Box>
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 800, color: tempColor(displayTemp ?? ''), lineHeight: 1 }}>
              {displayTemp}°C
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {live?.temperatureObserved ? `即測站：${live.stationName}` : '時段起點預報氣溫'}
            </Typography>
          </Box>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <ArrowUpwardIcon sx={{ fontSize: 18, color: '#EF5350' }} />
              <Typography>時段預報最高 <strong>{currentPeriod.maxTemperature}°C</strong></Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                體感 {currentPeriod.maxApparentTemperature}°C
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <ArrowDownwardIcon sx={{ fontSize: 18, color: '#42A5F5' }} />
              <Typography>時段預報最低 <strong>{currentPeriod.minTemperature}°C</strong></Typography>
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
