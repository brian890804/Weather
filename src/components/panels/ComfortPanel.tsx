import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import type { WeatherPeriod } from '../../types/weather';
import { tempColor, comfortColor } from '../../utils/weatherUtils';
import { R } from '../../App';
import PeriodCard from '../PeriodCard/PeriodCard';
import DragScrollBox from '../common/DragScrollBox';

function comfortIcon(desc: string) {
  if (desc.includes('舒適')) return <SentimentSatisfiedAltIcon sx={{ color: '#66BB6A', fontSize: 64 }} />;
  if (desc.includes('悶熱') || desc.includes('炎熱')) return <SentimentVeryDissatisfiedIcon sx={{ color: '#EF5350', fontSize: 64 }} />;
  return <SentimentNeutralIcon sx={{ color: '#FFA726', fontSize: 64 }} />;
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
  return (
    <Box>
      {/* 目前舒適度 hero */}
      {currentPeriod && (
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: `${R.md}px`,
            mb: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, rgba(102,187,106,0.15), rgba(129,199,132,0.08))',
            border: '1px solid rgba(102,187,106,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 2, sm: 3 },
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ fontSize: 64, lineHeight: 1 }}>
            {comfortIcon(currentPeriod.maxComfortIndexDescription)}
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: comfortColor(currentPeriod.maxComfortIndexDescription) }}>
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
