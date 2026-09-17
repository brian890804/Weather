import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AirIcon from '@mui/icons-material/Air';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import dayjs from 'dayjs';
import WeatherIcon from '../WeatherIcon/WeatherIcon';
import type { WeatherPeriod } from '../../types/weather';
import { tempColor, popColor, uvLevelColor, beaufortLabel } from '../../utils/weatherUtils';
import { R } from '../../App';

/** 共用 Row 元件 */
function StatRow({
  icon,
  label,
  value,
  color,
  bar,
  barMax = 100,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
  bar?: number;
  barMax?: number;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
      <Box sx={{ color: color ?? 'text.secondary', display: 'flex', alignItems: 'center' }}>
        {icon}
      </Box>
      <Typography variant="body1" sx={{ color: 'text.secondary', minWidth: 80 }}>
        {label}
      </Typography>
      <Stack flex={1} spacing={0.5}>
        <Typography variant="body1" sx={{ fontWeight: 700, color: color ?? 'text.primary' }}>
          {value}
        </Typography>
        {bar !== undefined && (
          <LinearProgress
            variant="determinate"
            value={Math.min((bar / barMax) * 100, 100)}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 },
            }}
          />
        )}
      </Stack>
    </Stack>
  );
}

interface OverviewPanelProps {
  period: WeatherPeriod;
}

export default function OverviewPanel({ period }: OverviewPanelProps) {
  const start = dayjs(period.startTime);
  const isNight = start.hour() >= 18 || start.hour() < 6;
  const pop = period.probabilityOfPrecipitation;
  const uvIdx = period.uvIndex;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: { xs: 2, sm: 3 },
      }}
    >
      {/* 左：天氣概覽 */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: `${R.md}px`,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          userSelect: 'none',
        }}
      >
        {/* 選中時段標籤 */}
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: 0.5 }}>
          {start.format('M/D (dd) HH:mm')} – {dayjs(period.endTime).format('HH:mm')}
        </Typography>
        <WeatherIcon
          weatherCode={period.weatherCode}
          weather={period.weather}
          startTime={period.startTime}
          size={100}
        />
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
          {period.weather}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, color: tempColor(period.temperature) }}>
          {period.temperature}°C
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          最高 {period.maxTemperature}° / 最低 {period.minTemperature}°
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, textAlign: 'center', lineHeight: 1.6 }}>
          {period.weatherDescription}
        </Typography>
      </Box>


      {/* 右：詳細數據 */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: `${R.md}px`,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          userSelect: 'none',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
          詳細資訊
        </Typography>

        {/* 溫度區 */}
        <StatRow
          icon={<ThermostatIcon />}
          label="均溫"
          value={`${period.temperature}°C`}
          color={tempColor(period.temperature)}
          bar={parseInt(period.temperature)}
          barMax={40}
        />
        <StatRow
          icon={<ThermostatIcon />}
          label="最高體感"
          value={`${period.maxApparentTemperature}°C`}
          color={tempColor(period.maxApparentTemperature)}
        />
        <StatRow
          icon={<ThermostatIcon />}
          label="最低體感"
          value={`${period.minApparentTemperature}°C`}
          color={tempColor(period.minApparentTemperature)}
        />

        {/* 濕度 */}
        <StatRow
          icon={<WaterDropIcon />}
          label="相對濕度"
          value={`${period.relativeHumidity}%`}
          color="#42A5F5"
          bar={parseInt(period.relativeHumidity)}
          barMax={100}
        />

        {/* 風 */}
        <StatRow
          icon={<AirIcon />}
          label="風向風速"
          value={`${period.windDirection} ${beaufortLabel(period.beaufortScale)} (${period.windSpeed}m/s)`}
          color="#90CAF9"
        />

        {/* 降雨機率 */}
        {pop !== '-' && (
          <StatRow
            icon={<WaterDropIcon />}
            label="降雨機率"
            value={`${pop}%`}
            color={popColor(pop)}
            bar={parseInt(pop)}
            barMax={100}
          />
        )}

        {/* 紫外線 */}
        {uvIdx !== '-' && !isNight && (
          <StatRow
            icon={<WbSunnyIcon />}
            label="紫外線"
            value={`${uvIdx} (${period.uvExposureLevel})`}
            color={uvLevelColor(period.uvExposureLevel)}
            bar={parseInt(uvIdx)}
            barMax={11}
          />
        )}

        {/* 舒適度 */}
        <StatRow
          icon={<SentimentSatisfiedAltIcon />}
          label="舒適度"
          value={period.maxComfortIndexDescription}
          color="#81C784"
        />
      </Box>
    </Box>
  );
}

