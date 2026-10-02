import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import type { WeatherPeriod } from '../../types/weather';
import {
  tempColor,
  popColor,
  beaufortLabel,
  bftColor,
  comfortColor,
  uvLevelColor,
} from '../../utils/weatherUtils';

export type IOSMetricType =
  | 'feels_like'
  | 'precipitation'
  | 'wind'
  | 'humidity'
  | 'comfort'
  | 'uv'
  | null;

interface IOSDetailModalProps {
  type: IOSMetricType;
  onClose: () => void;
  period: WeatherPeriod | null;
}

function windDegree(dir: string): number {
  const map: Record<string, number> = {
    北風: 0,
    偏北風: 0,
    東北風: 45,
    偏東北風: 45,
    東風: 90,
    偏東風: 90,
    東南風: 135,
    偏東南風: 135,
    南風: 180,
    偏南風: 180,
    西南風: 225,
    偏西南風: 225,
    西風: 270,
    偏西風: 270,
    西北風: 315,
    偏西北風: 315,
  };
  return map[dir] ?? 0;
}

function MiniWindCompass({ direction, size = 100 }: { direction: string; size?: number }) {
  const deg = windDegree(direction);
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid rgba(144,202,249,0.3)',
        position: 'relative',
        background: 'radial-gradient(circle, rgba(144,202,249,0.12) 0%, rgba(144,202,249,0.02) 80%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 20px rgba(144,202,249,0.15)',
        mx: 'auto',
        my: 1.5,
      }}
    >
      <Typography sx={{ position: 'absolute', top: 4, fontSize: 11, fontWeight: 900, color: '#EF5350' }}>
        N
      </Typography>
      <Typography sx={{ position: 'absolute', bottom: 4, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
        S
      </Typography>
      <Typography sx={{ position: 'absolute', left: 6, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
        W
      </Typography>
      <Typography sx={{ position: 'absolute', right: 6, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
        E
      </Typography>
      {/* 羅盤指針 */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 8,
          height: size * 0.65,
          marginTop: `-${(size * 0.65) / 2}px`,
          marginLeft: '-4px',
          transform: `rotate(${deg}deg)`,
          transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: `${size * 0.32}px solid #EF5350`,
          }}
        />
        <Box
          sx={{
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `${size * 0.32}px solid #90CAF9`,
            opacity: 0.8,
          }}
        />
      </Box>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: '#FFF',
          boxShadow: '0 0 6px #FFF',
          zIndex: 2,
        }}
      />
    </Box>
  );
}

export default function IOSDetailModal({ type, onClose, period }: IOSDetailModalProps) {
  if (!type || !period) return null;

  const actualTemp = parseInt(period.temperature) || 0;
  const apparentTemp = parseInt(period.maxApparentTemperature) || actualTemp;
  const tempDiff = apparentTemp - actualTemp;
  const pop = parseInt(period.probabilityOfPrecipitation) || 0;
  const popStr = period.probabilityOfPrecipitation;

  return (
    <Dialog
      open={Boolean(type)}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            m: { xs: 1.5, sm: 2 },
            borderRadius: '26px',
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(35px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
            color: '#F8FAFC',
            p: 1,
          },
        },
      }}
    >
      {/* 頂部拉桿 */}
      <Box sx={{ pt: 1, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: 36, height: 4.5, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
      </Box>

      {/* 標題欄 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 1, pb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.2 }}>
          {type === 'feels_like' && '🌡️ 氣溫與體感溫度'}
          {type === 'precipitation' && '🌧️ 降雨機率預報'}
          {type === 'wind' && '💨 風向與風力分析'}
          {type === 'humidity' && '💧 相對濕度與露點'}
          {type === 'comfort' && '😊 人體舒適度指標'}
          {type === 'uv' && '☀️ 紫外線指數'}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'rgba(255, 255, 255, 0.65)',
            bgcolor: 'rgba(255, 255, 255, 0.08)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#FFF' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 2 }}>
        {/* 1. 體感溫度詳細 */}
        {type === 'feels_like' && (
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                mb: 2,
              }}
            >
              <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                當前時段體感
              </Typography>
              <Typography
                sx={{
                  fontSize: 52,
                  fontWeight: 900,
                  color: tempColor(period.maxApparentTemperature),
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {period.maxApparentTemperature}°C
              </Typography>
              <Typography sx={{ fontSize: 14, color: '#E2E8F0', fontWeight: 600 }}>
                {tempDiff > 0
                  ? `濕度影響使得體感溫度比實際氣溫高 ${tempDiff}°C`
                  : tempDiff < 0
                  ? `風速使得體感溫度比實際氣溫低 ${Math.abs(tempDiff)}°C`
                  : '體感溫度與實際氣溫相符'}
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, textAlign: 'left' }}>
              <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>實測氣溫</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: tempColor(period.temperature), mt: 0.5 }}>
                  {period.temperature}°C
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>當前高 / 低溫</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#F1F5F9', mt: 0.5 }}>
                  {period.maxTemperature}° / {period.minTemperature}°
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* 2. 降雨機率詳細 */}
        {type === 'precipitation' && (
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                mb: 2,
              }}
            >
              <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                降雨機率 (POP)
              </Typography>
              <Typography
                sx={{
                  fontSize: 52,
                  fontWeight: 900,
                  color: popColor(popStr),
                  lineHeight: 1,
                  mb: 1.5,
                }}
              >
                {popStr !== '-' ? `${popStr}%` : '0%'}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, pop))}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: popColor(popStr),
                    borderRadius: 5,
                  },
                  mb: 1.5,
                }}
              />
              <Typography sx={{ fontSize: 14, color: '#E2E8F0', fontWeight: 600 }}>
                {pop >= 70
                  ? '⚠️ 高降雨機率，出門請務必攜帶雨具！'
                  : pop >= 30
                  ? '☂️ 局部有短暫降雨可能，建議備妥雨具'
                  : '☀️ 降雨機率低，天氣相對乾爽'}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5, textAlign: 'left', px: 1 }}>
              降雨機率代表在特定預報區域與時段內，任意地點發生 0.1 毫米以上降雨的機率統計值。
            </Typography>
          </Box>
        )}

        {/* 3. 風向與風速詳細 */}
        {type === 'wind' && (
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                p: 2,
                borderRadius: '20px',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                mb: 2,
              }}
            >
              <MiniWindCompass direction={period.windDirection} />
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#90CAF9', mt: 1 }}>
                {period.windDirection} · {period.windSpeed} m/s
              </Typography>
              <Chip
                label={`蒲福 ${period.beaufortScale} 級 (${beaufortLabel(period.beaufortScale)})`}
                size="small"
                sx={{
                  mt: 1,
                  fontWeight: 700,
                  bgcolor: `${bftColor(period.beaufortScale)}25`,
                  color: bftColor(period.beaufortScale),
                  border: `1px solid ${bftColor(period.beaufortScale)}50`,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5, textAlign: 'left', px: 1 }}>
              每秒公尺 (m/s) 為氣象標準單位。{parseInt(period.beaufortScale) <= 3 ? '當前風力平穩宜人。' : '當前風力偏強，戶外或沿海地區請注意強風。'}
            </Typography>
          </Box>
        )}

        {/* 4. 相對濕度與露點 */}
        {type === 'humidity' && (
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                mb: 2,
              }}
            >
              <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                相對濕度 (RH)
              </Typography>
              <Typography sx={{ fontSize: 52, fontWeight: 900, color: '#38BDF8', lineHeight: 1, mb: 1 }}>
                {period.relativeHumidity}%
              </Typography>
              <Typography sx={{ fontSize: 14, color: '#CBD5E1', fontWeight: 600 }}>
                露點溫度 {period.dewPoint}°C
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5, textAlign: 'left', px: 1 }}>
              相對濕度介於 50% ~ 65% 為人體最舒適區間；高於 75% 空氣潮濕易感悶熱，低於 40% 則偏乾。
            </Typography>
          </Box>
        )}

        {/* 5. 舒適度指標 */}
        {type === 'comfort' && (
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                mb: 2,
              }}
            >
              <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                人體舒適度評估
              </Typography>
              <Typography
                sx={{
                  fontSize: 38,
                  fontWeight: 900,
                  color: comfortColor(period.maxComfortIndexDescription),
                  lineHeight: 1.2,
                  mb: 1,
                }}
              >
                {period.maxComfortIndexDescription}
              </Typography>
              <Chip
                label={`舒適指數 ${period.minComfortIndex}`}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: '#F1F5F9',
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5, textAlign: 'left', px: 1 }}>
              中央氣象署依氣溫、濕度與風速綜合計算之生活舒適度指數，提供穿衣與戶外作息參考。
            </Typography>
          </Box>
        )}

        {/* 6. 紫外線指數 */}
        {type === 'uv' && (
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                mb: 2,
              }}
            >
              <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                紫外線指數 (UV Index)
              </Typography>
              <Typography
                sx={{
                  fontSize: 52,
                  fontWeight: 900,
                  color: period.uvIndex !== '-' ? uvLevelColor(period.uvExposureLevel) : '#94A3B8',
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {period.uvIndex !== '-' ? period.uvIndex : '無'}
              </Typography>
              <Chip
                label={period.uvExposureLevel || '夜間無紫外線'}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: `${uvLevelColor(period.uvExposureLevel)}25`,
                  color: uvLevelColor(period.uvExposureLevel),
                  border: `1px solid ${uvLevelColor(period.uvExposureLevel)}50`,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5, textAlign: 'left', px: 1 }}>
              {period.uvIndex !== '-' && parseInt(period.uvIndex) >= 6
                ? '高量級以上紫外線，外出請塗抹防曬乳、配戴太陽眼鏡與遮陽傘。'
                : '紫外線在安全溫和範圍，戶外活動舒適。'}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
