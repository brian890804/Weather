import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AirIcon from '@mui/icons-material/Air';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
import WeatherIcon from '../WeatherIcon/WeatherIcon';
import type { WeatherPeriod } from '../../types/weather';
import { tempColor, popColor, uvLevelColor, beaufortLabel } from '../../utils/weatherUtils';
import { R } from '../../App';

dayjs.locale('zh-tw');

interface PeriodCardProps {
  period: WeatherPeriod;
  isCurrent?: boolean;
  isSelected?: boolean;
  onSelect?: (startTime: string) => void;
}

export default function PeriodCard({ period, isCurrent, isSelected, onSelect }: PeriodCardProps) {
  const start = dayjs(period.startTime);
  const end = dayjs(period.endTime);
  const isNightPeriod = start.hour() >= 18 || start.hour() < 6;
  const dayLabel = start.format('M/D (dd)');
  const timeLabel = `${start.format('HH:mm')} – ${end.format('HH:mm')}`;

  const pop = period.probabilityOfPrecipitation;
  const uvIdx = period.uvIndex;

  const highlighted = isSelected || isCurrent;

  return (
    <Card
      elevation={highlighted ? 8 : 2}
      sx={{
        width: { xs: 180, sm: 210 },
        minWidth: { xs: 180, sm: 210 },
        borderRadius: `${R.md}px`,
        background: isSelected
          ? 'linear-gradient(135deg, rgba(129,199,132,0.22) 0%, rgba(99,179,237,0.14) 100%)'
          : isCurrent
          ? 'linear-gradient(135deg, rgba(99,179,237,0.18) 0%, rgba(66,153,225,0.12) 100%)'
          : 'rgba(255,255,255,0.04)',
        border: isSelected
          ? '1.5px solid rgba(129,199,132,0.7)'
          : isCurrent
          ? '1px solid rgba(99,179,237,0.5)'
          : '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        flex: '0 0 auto',
        transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        },
      }}
    >
      {/* CardActionArea 處理點擊，userSelect:none 防止文字被選取 */}
      <CardActionArea
        onClick={() => onSelect?.(period.startTime)}
        sx={{ userSelect: 'none', height: '100%' }}
        disableRipple={!onSelect}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
          {/* 日期 / 時間 */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {dayLabel}
            </Typography>
            {isSelected && !isCurrent && (
              <Chip label="選中" size="small" color="success" sx={{ height: 18, fontSize: 10 }} />
            )}
            {isCurrent && (
              <Chip label="現在" size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
            )}
            {isNightPeriod && !isCurrent && !isSelected && (
              <Chip label="夜間" size="small" sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(255,255,255,0.1)' }} />
            )}
          </Stack>
          <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mb: 1.5 }}>
            {timeLabel}
          </Typography>

          {/* 天氣圖示 + 天氣名稱 */}
          <Box display="flex" flexDirection="column" alignItems="center" mb={1.5}>
            <WeatherIcon
              weatherCode={period.weatherCode}
              weather={period.weather}
              startTime={period.startTime}
              size={56}
            />
            <Typography
              variant="caption"
              mt={0.75}
              textAlign="center"
              sx={{ fontWeight: 500, color: 'text.primary', fontSize: 12 }}
            >
              {period.weather}
            </Typography>
          </Box>

          <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.08)' }} />

          {/* 資料列 */}
          <Stack spacing={0.6}>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <ThermostatIcon sx={{ fontSize: 14, color: tempColor(period.temperature) }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 28 }}>均</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: tempColor(period.temperature) }}>
                {period.temperature}°C
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <ThermostatIcon sx={{ fontSize: 14, color: '#EF5350' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 28 }}>高</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#EF5350' }}>
                {period.maxTemperature}°
                <Typography component="span" sx={{ color: 'text.secondary', fontSize: 10, ml: 0.25 }}>
                  感{period.maxApparentTemperature}°
                </Typography>
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <ThermostatIcon sx={{ fontSize: 14, color: '#42A5F5' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 28 }}>低</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#42A5F5' }}>
                {period.minTemperature}°
                <Typography component="span" sx={{ color: 'text.secondary', fontSize: 10, ml: 0.25 }}>
                  感{period.minApparentTemperature}°
                </Typography>
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <WaterDropIcon sx={{ fontSize: 14, color: '#42A5F5' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 28 }}>濕</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {period.relativeHumidity}%
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <AirIcon sx={{ fontSize: 14, color: '#90CAF9' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 28 }}>風</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                {period.windDirection} {beaufortLabel(period.beaufortScale)}
              </Typography>
            </Stack>
            {pop !== '-' && (
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <WaterDropIcon sx={{ fontSize: 14, color: popColor(pop) }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 28 }}>雨</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: popColor(pop) }}>
                  {pop}%
                </Typography>
              </Stack>
            )}
            {uvIdx !== '-' && !isNightPeriod && (
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <WbSunnyIcon sx={{ fontSize: 14, color: uvLevelColor(period.uvExposureLevel) }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 28 }}>UV</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: uvLevelColor(period.uvExposureLevel) }}>
                  {uvIdx}
                </Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
