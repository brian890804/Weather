import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import type { WeatherPeriod } from '../../types/weather';
import { popColor, getWeatherIconUrl } from '../../utils/weatherUtils';
import { R } from '../../App';
import PeriodCard from '../PeriodCard/PeriodCard';
import DragScrollBox from '../common/DragScrollBox';

function getRainIconName(popStr: string): string {
  const pop = parseInt(popStr, 10);
  if (!isNaN(pop) && pop >= 30) {
    return 'rain';
  }
  return 'umbrella';
}

interface RainPanelProps {
  periods: WeatherPeriod[];
  currentPeriod?: WeatherPeriod;
  selectedPeriodTime?: string;
  onSelectPeriod?: (startTime: string) => void;
  autoCurrentPeriodStartTime?: string;
}

export default function RainPanel({
  periods,
  currentPeriod,
  selectedPeriodTime,
  onSelectPeriod,
  autoCurrentPeriodStartTime,
}: RainPanelProps) {
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
              background: 'radial-gradient(circle, rgba(66,165,245,0.25) 0%, rgba(66,165,245,0) 70%)',
              animation: 'rainIconFloat 3.5s ease-in-out infinite',
              '@keyframes rainIconFloat': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-5px)' },
              },
            }}
          >
            <Box
              component="img"
              src={getWeatherIconUrl(getRainIconName(currentPeriod.probabilityOfPrecipitation))}
              alt="降雨機率"
              sx={{
                width: { xs: 56, sm: 72 },
                height: { xs: 56, sm: 72 },
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(66,165,245,0.4))',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </Box>
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 800, color: popColor(currentPeriod.probabilityOfPrecipitation), lineHeight: 1 }}>
              {currentPeriod.probabilityOfPrecipitation !== '-'
                ? `${currentPeriod.probabilityOfPrecipitation}%`
                : '- %'}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              降雨機率
            </Typography>
          </Box>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <WaterDropIcon sx={{ color: '#42A5F5', fontSize: 18 }} />
              <Typography>相對濕度 <strong>{currentPeriod.relativeHumidity}%</strong></Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <WaterDropIcon sx={{ color: '#80DEEA', fontSize: 18 }} />
              <Typography>露點溫度 <strong>{currentPeriod.dewPoint}°C</strong></Typography>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* 最高降雨機率指示條 */}
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
          未來預報最高降雨機率：<strong style={{ color: popColor(String(maxPop)) }}>{maxPop}%</strong>
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

      {/* 下半部：水平左右拖動時段卡片 */}
      <Typography variant="h6" sx={{ fontWeight: 800, mt: 3, mb: 1.5, color: '#E2E8F0', fontSize: { xs: 17, sm: 20 } }}>
        未來 3 天逐時降雨預報（逐 3 小時）
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
            category="rain"
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
