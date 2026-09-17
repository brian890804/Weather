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
import ExploreIcon from '@mui/icons-material/Explore';
import SpeedIcon from '@mui/icons-material/Speed';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
import WeatherIcon from '../WeatherIcon/WeatherIcon';
import type { WeatherPeriod } from '../../types/weather';
import {
  tempColor,
  popColor,
  uvLevelColor,
  beaufortLabel,
  bftColor,
  comfortColor,
} from '../../utils/weatherUtils';
import { R } from '../../App';
import React from 'react';

dayjs.locale('zh-tw');

export type PeriodCardCategory = 'overview' | 'temperature' | 'wind' | 'rain' | 'comfort';

interface PeriodCardProps {
  period: WeatherPeriod;
  isCurrent?: boolean;
  isSelected?: boolean;
  onSelect?: (startTime: string) => void;
  category?: PeriodCardCategory;
}

function getComfortIcon(desc: string) {
  if (desc.includes('舒適')) return <SentimentSatisfiedAltIcon sx={{ fontSize: 18, color: '#66BB6A' }} />;
  if (desc.includes('悶熱') || desc.includes('炎熱')) return <SentimentVeryDissatisfiedIcon sx={{ fontSize: 18, color: '#EF5350' }} />;
  return <SentimentNeutralIcon sx={{ fontSize: 18, color: '#FFA726' }} />;
}

function PeriodCardBase({
  period,
  isCurrent,
  isSelected,
  onSelect,
  category = 'overview',
}: PeriodCardProps) {
  const start = dayjs(period.startTime);
  const end = dayjs(period.endTime);
  const isNightPeriod = start.hour() >= 18 || start.hour() < 6;
  const dayLabel = start.format('M/D (dd)');
  const timeLabel = `${start.format('HH:mm')} – ${end.format('HH:mm')}`;

  const pop = period.probabilityOfPrecipitation;
  const uvIdx = period.uvIndex;
  const comfortDesc = period.maxComfortIndexDescription || '舒適';
  const cColor = comfortColor(comfortDesc);
  const bColor = bftColor(period.beaufortScale);

  return (
    <Card
      elevation={isSelected ? 10 : 2}
      sx={{
        width: { xs: 200, sm: 240 },
        minWidth: { xs: 200, sm: 240 },
        borderRadius: `${R.md}px`,
        // 只有被選中的卡片才高亮發光，非選中的卡片不發光
        background: isSelected
          ? 'linear-gradient(135deg, rgba(96,165,250,0.25) 0%, rgba(129,140,248,0.18) 100%)'
          : 'rgba(255,255,255,0.04)',
        border: isSelected
          ? '2px solid #60A5FA'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isSelected
          ? '0 8px 30px rgba(96,165,250,0.35)'
          : 'none',
        backdropFilter: 'blur(12px)',
        flex: '0 0 auto',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: isSelected
            ? '0 14px 36px rgba(96,165,250,0.45)'
            : '0 12px 32px rgba(0,0,0,0.45)',
          borderColor: isSelected ? '#93C5FD' : 'rgba(255,255,255,0.2)',
        },
      }}
    >
      <CardActionArea
        onClick={() => onSelect?.(period.startTime)}
        sx={{ userSelect: 'none', height: '100%' }}
        disableRipple={!onSelect}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.25 }, '&:last-child': { pb: { xs: 2, sm: 2.25 } } }}>
          {/* 日期 / 時間 */}
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography sx={{ color: isSelected ? '#93C5FD' : '#E2E8F0', fontWeight: 800, fontSize: { xs: 15, sm: 16.5 } }}>
              {dayLabel}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {isCurrent && (
                <Chip
                  label="現在"
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: 12.5,
                    fontWeight: 800,
                    bgcolor: 'rgba(59,130,246,0.25)',
                    color: '#60A5FA',
                    border: '1.5px solid rgba(59,130,246,0.5)',
                  }}
                />
              )}
              {isNightPeriod && (
                <Chip
                  label="夜間"
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: 12.5,
                    fontWeight: 700,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: '#CBD5E1',
                  }}
                />
              )}
            </Stack>
          </Stack>

          <Typography sx={{ display: 'block', color: 'text.secondary', mb: 1.5, fontSize: { xs: 13.5, sm: 14.5 }, fontWeight: 500 }}>
            {timeLabel}
          </Typography>

          {/* 天氣圖示 + 天氣名稱（加大） */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 1.5 }}>
            <WeatherIcon
              weatherCode={period.weatherCode}
              weather={period.weather}
              startTime={period.startTime}
              size={68}
            />
            <Typography
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                fontSize: { xs: 16, sm: 18 },
                mt: 1,
                textAlign: 'center',
              }}
            >
              {period.weather}
            </Typography>
          </Box>

          <Divider sx={{ mb: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />

          {/* ── 依維度顯示專屬重點指標數據列 ── */}

          {/* 1. 溫度專屬卡片內容 */}
          {category === 'temperature' && (
            <Stack spacing={1.2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <ThermostatIcon sx={{ fontSize: 20, color: tempColor(period.temperature) }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>氣溫</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 900, color: tempColor(period.temperature), fontSize: { xs: 17, sm: 19 } }}>
                  {period.temperature}°C
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <ThermostatIcon sx={{ fontSize: 20, color: '#F97316' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>體感</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 800, color: '#F97316', fontSize: { xs: 16, sm: 17.5 } }}>
                  {period.maxApparentTemperature}°C
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <ExploreIcon sx={{ fontSize: 20, color: '#2DD4BF' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>露點</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 700, color: '#2DD4BF', fontSize: { xs: 15, sm: 16.5 } }}>
                  {period.dewPoint}°C
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <WaterDropIcon sx={{ fontSize: 20, color: '#38BDF8' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>濕度</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 700, color: '#E2E8F0', fontSize: { xs: 14.5, sm: 16 } }}>
                  {period.relativeHumidity}%
                </Typography>
              </Stack>
            </Stack>
          )}

          {/* 2. 風況專屬卡片內容 */}
          {category === 'wind' && (
            <Stack spacing={1.2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <AirIcon sx={{ fontSize: 20, color: '#90CAF9' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>風向</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 800, color: '#90CAF9', fontSize: { xs: 15.5, sm: 17 } }}>
                  {period.windDirection}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <SpeedIcon sx={{ fontSize: 20, color: '#818CF8' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>風速</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 900, color: '#818CF8', fontSize: { xs: 16.5, sm: 18 } }}>
                  {period.windSpeed} m/s
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>風級</Typography>
                <Chip
                  label={`蒲福 ${period.beaufortScale} 級`}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: 12.5,
                    fontWeight: 700,
                    bgcolor: `${bColor}25`,
                    color: bColor,
                    border: `1px solid ${bColor}55`,
                  }}
                />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>等級</Typography>
                <Typography sx={{ fontWeight: 700, color: '#E2E8F0', fontSize: { xs: 14.5, sm: 16 } }}>
                  {beaufortLabel(period.beaufortScale)}
                </Typography>
              </Stack>
            </Stack>
          )}

          {/* 3. 降雨專屬卡片內容 */}
          {category === 'rain' && (
            <Stack spacing={1.2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <WaterDropIcon sx={{ fontSize: 20, color: popColor(pop) }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>降雨率</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 900, color: popColor(pop), fontSize: { xs: 17, sm: 19 } }}>
                  {pop !== '-' ? `${pop}%` : '-'}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <WaterDropIcon sx={{ fontSize: 20, color: '#38BDF8' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>濕度</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 700, color: '#E2E8F0', fontSize: { xs: 15, sm: 16.5 } }}>
                  {period.relativeHumidity}%
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <ExploreIcon sx={{ fontSize: 20, color: '#2DD4BF' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>露點</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 700, color: '#2DD4BF', fontSize: { xs: 14.5, sm: 16 } }}>
                  {period.dewPoint}°C
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <WbSunnyIcon sx={{ fontSize: 20, color: isNightPeriod ? 'text.secondary' : uvLevelColor(period.uvExposureLevel) }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>紫外線</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 700, color: isNightPeriod ? 'text.secondary' : uvLevelColor(period.uvExposureLevel), fontSize: { xs: 14, sm: 15.5 } }}>
                  {isNightPeriod ? '夜間無' : (uvIdx !== '-' ? `UV ${uvIdx}` : '-')}
                </Typography>
              </Stack>
            </Stack>
          )}

          {/* 4. 舒適度專屬卡片內容 */}
          {category === 'comfort' && (
            <Stack spacing={1.2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  {getComfortIcon(comfortDesc)}
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>感受</Typography>
                </Stack>
                <Chip
                  label={comfortDesc}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: 12.5,
                    fontWeight: 800,
                    bgcolor: `${cColor}25`,
                    color: cColor,
                    border: `1px solid ${cColor}55`,
                  }}
                />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>指數</Typography>
                <Typography sx={{ fontWeight: 800, color: '#F1F5F9', fontSize: { xs: 15.5, sm: 17 } }}>
                  {period.minComfortIndex}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <ThermostatIcon sx={{ fontSize: 20, color: tempColor(period.maxApparentTemperature) }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>體感</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 800, color: tempColor(period.maxApparentTemperature), fontSize: { xs: 15.5, sm: 17 } }}>
                  {period.maxApparentTemperature}°C
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <WaterDropIcon sx={{ fontSize: 20, color: '#38BDF8' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>濕度</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 700, color: '#E2E8F0', fontSize: { xs: 14.5, sm: 16 } }}>
                  {period.relativeHumidity}%
                </Typography>
              </Stack>
            </Stack>
          )}

          {/* 5. 總覽預設卡片內容 (category === 'overview') */}
          {category === 'overview' && (
            <Stack spacing={1.2}>
              {/* 溫度 */}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <ThermostatIcon sx={{ fontSize: 20, color: tempColor(period.temperature) }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>氣溫</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 900, color: tempColor(period.temperature), fontSize: { xs: 16.5, sm: 18 } }}>
                  {period.temperature}°C
                </Typography>
              </Stack>

              {/* 體感 */}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <ThermostatIcon sx={{ fontSize: 20, color: '#F97316' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>體感</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 800, color: '#F97316', fontSize: { xs: 15.5, sm: 17 } }}>
                  {period.maxApparentTemperature}°C
                </Typography>
              </Stack>

              {/* 降雨機率 */}
              {pop !== '-' && (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <WaterDropIcon sx={{ fontSize: 20, color: popColor(pop) }} />
                    <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>降雨</Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 800, color: popColor(pop), fontSize: { xs: 15.5, sm: 17 } }}>
                    {pop}%
                  </Typography>
                </Stack>
              )}

              {/* 濕度 */}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <WaterDropIcon sx={{ fontSize: 20, color: '#38BDF8' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>濕度</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 700, color: '#E2E8F0', fontSize: { xs: 14.5, sm: 16 } }}>
                  {period.relativeHumidity}%
                </Typography>
              </Stack>

              {/* 風向風速 */}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <AirIcon sx={{ fontSize: 20, color: '#818CF8' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>風速</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 700, color: '#E2E8F0', fontSize: { xs: 13.5, sm: 14.5 }, textAlign: 'right' }}>
                  {period.windDirection} {period.windSpeed}m/s
                </Typography>
              </Stack>

              {/* 紫外線（若有） */}
              {uvIdx !== '-' && !isNightPeriod && (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <WbSunnyIcon sx={{ fontSize: 20, color: uvLevelColor(period.uvExposureLevel) }} />
                    <Typography sx={{ color: 'text.secondary', fontSize: { xs: 14, sm: 15 }, fontWeight: 600 }}>紫外線</Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 800, color: uvLevelColor(period.uvExposureLevel), fontSize: { xs: 14.5, sm: 16 } }}>
                    {uvIdx}
                  </Typography>
                </Stack>
              )}
            </Stack>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default React.memo(PeriodCardBase);
