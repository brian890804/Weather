import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { WeatherPeriod } from '../../types/weather';
import { beaufortLabel, getWeatherIconUrl } from '../../utils/weatherUtils';
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

function WindCompass({ direction, size = 80 }: { direction: string; size?: number }) {
  const deg = windDegree(direction);
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid rgba(144,202,249,0.35)',
        position: 'relative',
        background: 'radial-gradient(circle, rgba(144,202,249,0.12) 0%, rgba(144,202,249,0.03) 75%)',
        flexShrink: 0,
        boxShadow: '0 0 16px rgba(144,202,249,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          top: 3,
          fontSize: 10,
          fontWeight: 800,
          color: '#EF5350',
          lineHeight: 1,
        }}
      >
        北
      </Typography>
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 3,
          fontSize: 10,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1,
        }}
      >
        南
      </Typography>
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          left: 4,
          fontSize: 10,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1,
        }}
      >
        西
      </Typography>
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          right: 4,
          fontSize: 10,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1,
        }}
      >
        東
      </Typography>

      {/* 羅盤指針 (帶滑順旋轉與微幅彈性動畫) */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 8,
          height: size * 0.64,
          marginTop: `-${(size * 0.64) / 2}px`,
          marginLeft: '-4px',
          transform: `rotate(${deg}deg)`,
          transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'none',
        }}
      >
        {/* 北針 (紅) */}
        <Box
          sx={{
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: `${size * 0.32}px solid #EF5350`,
            filter: 'drop-shadow(0 0 4px rgba(239,83,80,0.6))',
          }}
        />
        {/* 南針 (藍) */}
        <Box
          sx={{
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `${size * 0.32}px solid #90CAF9`,
            opacity: 0.85,
          }}
        />
      </Box>
      {/* 軸心 */}
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: '#FFF',
          boxShadow: '0 0 6px rgba(255,255,255,0.8)',
          zIndex: 2,
        }}
      />
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
              background: 'radial-gradient(circle, rgba(144,202,249,0.25) 0%, rgba(144,202,249,0) 70%)',
              animation: 'windIconFloat 3.5s ease-in-out infinite',
              '@keyframes windIconFloat': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-5px)' },
              },
            }}
          >
            <Box
              component="img"
              src={getWeatherIconUrl('wind-spinner')}
              alt="風速風向"
              sx={{
                width: { xs: 56, sm: 72 },
                height: { xs: 56, sm: 72 },
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(144,202,249,0.4))',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </Box>
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
