import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AirIcon from '@mui/icons-material/Air';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import UmbrellaIcon from '@mui/icons-material/BeachAccess';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import ExploreIcon from '@mui/icons-material/Explore';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import SpeedIcon from '@mui/icons-material/Speed';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import dayjs from 'dayjs';
import WeatherIcon from '../WeatherIcon/WeatherIcon';
import type { WeatherPeriod } from '../../types/weather';
import { tempColor, popColor, beaufortLabel } from '../../utils/weatherUtils';
import { R } from '../../App';

interface CircleStatProps {
  value: string;
  unit?: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  subtext?: string;
  size?: number;
}

/** 圓形圖形化指標元件（大尺寸、大字、大 Icon，開闊微光效果） */
function CircleStat({
  value,
  unit,
  label,
  icon,
  color,
  subtext,
  size = 180,
}: CircleStatProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.25s ease',
        '&:hover': {
          '& .circle-body': {
            borderColor: color,
            boxShadow: `0 16px 40px -6px ${color}55, inset 0 0 24px ${color}22`,
          },
        },
      }}
    >
      <Box
        className="circle-body"
        sx={{
          width: { xs: 145, sm: 165, md: size },
          height: { xs: 145, sm: 165, md: size },
          borderRadius: '50%',
          background: 'radial-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(16px)',
          border: `2px solid ${color}55`,
          boxShadow: `0 10px 30px -4px ${color}25, inset 0 0 20px ${color}15`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 1.5, sm: 2 },
          position: 'relative',
          transition: 'all 0.25s ease',
        }}
      >
        {/* 上方：大字數據 */}
        <Stack
          direction="row"
          sx={{
            alignItems: 'baseline',
            justifyContent: 'center',
            lineHeight: 1,
            mb: 0.75,
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: 30, sm: 38, md: 42 },
              fontWeight: 900,
              color: color,
              letterSpacing: -0.5,
              lineHeight: 1,
            }}
          >
            {value}
          </Typography>
          {unit && (
            <Typography
              component="span"
              sx={{
                fontSize: { xs: 14, sm: 17, md: 19 },
                fontWeight: 700,
                color: color,
                ml: 0.5,
              }}
            >
              {unit}
            </Typography>
          )}
        </Stack>

        {/* 下方：icon + 中文（字體與圖示加大） */}
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', color: color, fontSize: { xs: 20, sm: 24 } }}>
            {icon}
          </Box>
          <Typography
            sx={{
              fontSize: { xs: 14, sm: 16.5, md: 17.5 },
              fontWeight: 800,
              color: '#F1F5F9',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Typography>
        </Stack>

        {/* 底部次要描述 */}
        {subtext && (
          <Typography
            sx={{
              fontSize: { xs: 12.5, sm: 14 },
              color: 'text.secondary',
              mt: 0.5,
              textAlign: 'center',
              lineHeight: 1.2,
              fontWeight: 600,
            }}
          >
            {subtext}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

import React from 'react';

interface OverviewPanelProps {
  period: WeatherPeriod;
}

function OverviewPanelBase({ period }: OverviewPanelProps) {
  const start = dayjs(period.startTime);
  const pop = period.probabilityOfPrecipitation;

  return (
    <Box
      key={period.startTime}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '400px 1fr' },
        gap: { xs: 3, sm: 4, md: 5 },
        animation: 'fadeInStat 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        '@keyframes fadeInStat': {
          '0%': { opacity: 0.7, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >

      {/* 左側：大卡片主要天氣狀況 */}
      <Box
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: `${R.md}px`,
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          userSelect: 'none',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        }}
      >
        {/* 選中時段標籤 */}
        <Typography
          sx={{
            color: '#60A5FA',
            fontWeight: 800,
            fontSize: { xs: 14, sm: 16 },
            letterSpacing: 0.5,
            bgcolor: 'rgba(96,165,250,0.14)',
            px: 2,
            py: 0.75,
            borderRadius: `${R.sm}px`,
          }}
        >
          {start.format('M/D (dd) HH:mm')} – {dayjs(period.endTime).format('HH:mm')}
        </Typography>

        <WeatherIcon
          weatherCode={period.weatherCode}
          weather={period.weather}
          startTime={period.startTime}
          size={130}
        />

        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, fontSize: { xs: 26, sm: 32 } }}>
          {period.weather}
        </Typography>

        <Typography
          variant="h1"
          sx={{
            fontWeight: 900,
            color: tempColor(period.temperature),
            fontSize: { xs: 56, sm: 72 },
            lineHeight: 1,
            my: 0.5,
          }}
        >
          {period.temperature}°C
        </Typography>

        <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: { xs: 17, sm: 19 } }}>
          體感溫度 {period.maxApparentTemperature}°C
        </Typography>

        <Typography
          sx={{
            color: 'text.secondary',
            mt: 1,
            textAlign: 'center',
            lineHeight: 1.7,
            fontSize: { xs: 14, sm: 16 },
            maxWidth: 340,
            fontWeight: 500,
          }}
        >
          {period.weatherDescription}
        </Typography>
      </Box>

      {/* 右側：圖形化圓形指標大展示區（8大指標、超大圓圈、充裕間距） */}
      <Box
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: `${R.md}px`,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            mb: { xs: 3, sm: 4 },
            color: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            fontSize: { xs: 18, sm: 22 },
          }}
        >
          <WbSunnyIcon sx={{ fontSize: 26, color: '#F59E0B' }} />
          氣象圖形化數據
        </Typography>

        {/* 圓形數據網格：2欄 (手機) / 4欄 (電腦)，大間距 gap: { xs: 3, sm: 4, md: 4.5 } */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: { xs: 3, sm: 3.5, md: 4.5 },
            justifyItems: 'center',
            alignItems: 'center',
          }}
        >
          {/* 1. 氣溫 */}
          <CircleStat
            value={period.temperature}
            unit="°C"
            label="實測氣溫"
            icon={<ThermostatIcon fontSize="inherit" />}
            color={tempColor(period.temperature)}
            subtext="現場溫度"
          />

          {/* 2. 體感溫度 */}
          <CircleStat
            value={period.maxApparentTemperature}
            unit="°C"
            label="體感溫度"
            icon={<DeviceThermostatIcon fontSize="inherit" />}
            color="#FB923C"
            subtext="人體感受"
          />

          {/* 3. 降雨機率 */}
          <CircleStat
            value={pop !== '-' ? pop : '0'}
            unit="%"
            label="降雨機率"
            icon={<UmbrellaIcon fontSize="inherit" />}
            color={popColor(pop)}
            subtext={parseInt(pop) >= 30 ? '出門建議帶傘' : '降雨機率低'}
          />

          {/* 4. 相對濕度 */}
          <CircleStat
            value={period.relativeHumidity}
            unit="%"
            label="相對濕度"
            icon={<WaterDropIcon fontSize="inherit" />}
            color="#38BDF8"
            subtext="空氣含水量"
          />

          {/* 5. 風速 */}
          <CircleStat
            value={period.windSpeed}
            unit="m/s"
            label="平均風速"
            icon={<SpeedIcon fontSize="inherit" />}
            color="#818CF8"
            subtext="每秒公尺"
          />

          {/* 6. 風向與風級 */}
          <CircleStat
            value={period.beaufortScale}
            unit="級"
            label={period.windDirection}
            icon={<AirIcon fontSize="inherit" />}
            color="#A78BFA"
            subtext={beaufortLabel(period.beaufortScale)}
          />

          {/* 7. 露點溫度 */}
          <CircleStat
            value={period.dewPoint}
            unit="°C"
            label="露點溫度"
            icon={<ExploreIcon fontSize="inherit" />}
            color="#2DD4BF"
            subtext="凝結指標"
          />

          {/* 8. 舒適度 */}
          <CircleStat
            value={period.maxComfortIndexDescription}
            label="舒適程度"
            icon={<SentimentSatisfiedAltIcon fontSize="inherit" />}
            color={period.maxComfortIndexDescription.includes('舒適') ? '#34D399' : '#F87171'}
            subtext={`指數 ${period.minComfortIndex}`}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(OverviewPanelBase);

