import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AirIcon from '@mui/icons-material/Air';
import type { WeatherPeriod } from '../../types/weather';
import { beaufortLabel } from '../../utils/weatherUtils';
import { R } from '../../App';
import PeriodCard from '../PeriodCard/PeriodCard';
import DragScrollBox from '../common/DragScrollBox';

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
  selectedPeriodTime?: string;
  onSelectPeriod?: (startTime: string) => void;
  autoCurrentPeriodStartTime?: string;
}

export default function WindPanel({
  periods,
  currentPeriod,
  selectedPeriodTime,
  onSelectPeriod,
  autoCurrentPeriodStartTime,
}: WindPanelProps) {
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
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#90CAF9', lineHeight: 1 }}>
              {currentPeriod.windDirection}
            </Typography>
            <Typography variant="h6" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {beaufortLabel(currentPeriod.beaufortScale)} (蒲福 {currentPeriod.beaufortScale} 級)
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              風速 {currentPeriod.windSpeed} m/s
            </Typography>
          </Box>
          <WindCompass direction={currentPeriod.windDirection} size={80} />
        </Box>
      )}

      {/* 下半部：水平左右拖動時段卡片 */}
      <Typography variant="h6" sx={{ fontWeight: 800, mt: 3, mb: 1.5, color: '#E2E8F0', fontSize: { xs: 17, sm: 20 } }}>
        未來 3 天逐時風況預報（逐 3 小時）
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
            category="wind"
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
