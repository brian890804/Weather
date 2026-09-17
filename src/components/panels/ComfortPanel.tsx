import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import type { WeatherPeriod } from '../../types/weather';
import { tempColor, comfortColor, getWeatherIconUrl } from '../../utils/weatherUtils';
import { R } from '../../App';
import PeriodCard from '../PeriodCard/PeriodCard';
import DragScrollBox from '../common/DragScrollBox';

function getComfortIconName(desc: string): string {
  if (desc.includes('炎熱') || desc.includes('悶熱')) return 'sun-hot';
  if (desc.includes('寒冷') || desc.includes('極冷') || desc.includes('寒')) return 'thermometer-colder';
  if (desc.includes('涼') || desc.includes('偏涼')) return 'partly-cloudy-day';
  if (desc.includes('舒適')) return 'clear-day';
  return 'clear-day';
}

interface ComfortPanelProps {
  periods: WeatherPeriod[];
  currentPeriod?: WeatherPeriod;
  selectedPeriodTime?: string;
  onSelectPeriod?: (startTime: string) => void;
  autoCurrentPeriodStartTime?: string;
}

export default function ComfortPanel({
  periods,
  currentPeriod,
  selectedPeriodTime,
  onSelectPeriod,
  autoCurrentPeriodStartTime,
}: ComfortPanelProps) {
  const heroColor = currentPeriod
    ? comfortColor(currentPeriod.maxComfortIndexDescription)
    : '#66BB6A';

  return (
    <Box>
      {/* 目前舒適度 hero */}
      {currentPeriod && (
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: `${R.md}px`,
            mb: { xs: 2, sm: 3 },
            background: `linear-gradient(135deg, ${heroColor}24, ${heroColor}0d)`,
            border: `1px solid ${heroColor}40`,
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
              background: `radial-gradient(circle, ${heroColor}35 0%, ${heroColor}00 70%)`,
              animation: 'comfortIconFloat 3.5s ease-in-out infinite',
              '@keyframes comfortIconFloat': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.06)' },
              },
            }}
          >
            <Box
              component="img"
              src={getWeatherIconUrl(getComfortIconName(currentPeriod.maxComfortIndexDescription))}
              alt={currentPeriod.maxComfortIndexDescription}
              sx={{
                width: { xs: 56, sm: 72 },
                height: { xs: 56, sm: 72 },
                objectFit: 'contain',
                filter: `drop-shadow(0 4px 12px ${heroColor}66)`,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: heroColor }}>
              {currentPeriod.maxComfortIndexDescription}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              舒適度指數 {currentPeriod.minComfortIndex} – {currentPeriod.maxComfortIndex}
            </Typography>
          </Box>
          <Stack spacing={0.5}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              體感溫度 <strong style={{ color: tempColor(currentPeriod.maxApparentTemperature) }}>{currentPeriod.maxApparentTemperature}°C</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              相對濕度 <strong>{currentPeriod.relativeHumidity}%</strong>
            </Typography>
          </Stack>
        </Box>
      )}

      {/* 下半部：水平左右拖動時段卡片 */}
      <Typography variant="h6" sx={{ fontWeight: 800, mt: 3, mb: 1.5, color: '#E2E8F0', fontSize: { xs: 17, sm: 20 } }}>
        未來 3 天逐時舒適度預報（逐 3 小時）
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
            category="comfort"
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
