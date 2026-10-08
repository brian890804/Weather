import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SendIcon from '@mui/icons-material/Send';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  isNotificationSupported,
  isNotificationSubscribed,
  setNotificationSubscribed,
  requestNotificationPermission,
  sendSilentNotification,
  buildMorningNotificationContent,
  getNotificationTime,
  setNotificationTime,
  DEFAULT_NOTIFICATION_TIME,
} from '../../utils/notificationService';
import type { WeatherPeriod } from '../../types/weather';

interface NotificationSettingCardProps {
  cityName: string;
  townshipName: string;
  currentPeriod: WeatherPeriod | null;
  realtimeTemp?: string;
  realtimeHumidity?: string;
  realtimeWindSpeed?: string;
  realtimeRainNow?: number;
  onShowMessage?: (msg: string) => void;
  isCyberpunkMobile?: boolean;
}

export default function NotificationSettingCard({
  cityName,
  townshipName,
  currentPeriod,
  realtimeTemp,
  realtimeHumidity,
  realtimeWindSpeed,
  realtimeRainNow,
  onShowMessage,
  isCyberpunkMobile = false,
}: NotificationSettingCardProps) {
  const [supported] = useState(() => isNotificationSupported());
  const [subscribed, setSubscribed] = useState(() => {
    if (!isNotificationSupported()) return false;
    return isNotificationSubscribed() && Notification.permission === 'granted';
  });
  const [scheduledTime, setScheduledTime] = useState(() => getNotificationTime());
  const [testing, setTesting] = useState(false);

  const handleTimeChange = (newTime: string) => {
    if (!newTime) return;
    setScheduledTime(newTime);
    setNotificationTime(newTime);
    onShowMessage?.(`每日推播時間已設定為 ${newTime}`);
  };

  const handleToggle = async (checked: boolean) => {
    if (!supported) {
      onShowMessage?.('目前瀏覽器環境不支援 Web Push/Notification API');
      return;
    }

    if (checked) {
      let currentPerm = Notification.permission;
      if (currentPerm !== 'granted') {
        currentPerm = await requestNotificationPermission();
      }

      if (currentPerm === 'granted') {
        setNotificationSubscribed(true);
        setSubscribed(true);
        onShowMessage?.(`已開啟每日 ${scheduledTime} 晨間天氣靜音推播！`);
      } else {
        setNotificationSubscribed(false);
        setSubscribed(false);
        onShowMessage?.('未授予通知權限，無法開啟晨間推播');
      }
    } else {
      setNotificationSubscribed(false);
      setSubscribed(false);
      onShowMessage?.('已關閉每日定時晨間天氣推播');
    }
  };

  const handleTestNotification = async () => {
    if (!supported) {
      onShowMessage?.('目前瀏覽器環境不支援 Web Push/Notification API');
      return;
    }

    let currentPerm = Notification.permission;
    if (currentPerm !== 'granted') {
      currentPerm = await requestNotificationPermission();
    }

    if (currentPerm !== 'granted') {
      onShowMessage?.('請先允許通知權限以測試推播');
      return;
    }

    setTesting(true);
    try {
      const content = buildMorningNotificationContent(
        cityName,
        townshipName,
        currentPeriod,
        realtimeTemp,
        realtimeHumidity,
        realtimeWindSpeed,
        realtimeRainNow
      );

      const ok = await sendSilentNotification({
        title: content.title,
        body: content.body,
        tag: `test-silent-${Date.now()}`,
      });

      if (ok) {
        onShowMessage?.('已發送靜音測試推播！請查看系統通知欄（無鈴聲、無震動）');
      } else {
        onShowMessage?.('發送失敗，請確認 Service Worker 是否已啟用');
      }
    } catch (err) {
      console.warn('Test notification error:', err);
      onShowMessage?.('測試推播觸發異常');
    } finally {
      setTesting(false);
    }
  };

  const containerSx = isCyberpunkMobile
    ? {
        p: { xs: '12px 14px', sm: '16px' },
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.72) 0%, rgba(12, 18, 30, 0.88) 100%)',
        border: '1px solid rgba(0, 240, 255, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
      }
    : {
        p: { xs: 2, sm: 2.5 },
        borderRadius: '16px',
        bgcolor: 'rgba(255, 255, 255, 0.035)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      };

  return (
    <Box sx={containerSx}>
      {/* 標題與開關 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsActiveIcon sx={{ color: '#00F0FF', fontSize: 22 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 15.5, color: '#FFF' }}>
            每日晨間天氣推播
          </Typography>
        </Box>
        <Switch
          checked={subscribed}
          onChange={(e) => handleToggle(e.target.checked)}
          color="primary"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: '#00F0FF',
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: '#00F0FF',
            },
          }}
        />
      </Box>

      {/* 推播時間自訂設定區 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          px: 1.5,
          py: 1,
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTimeIcon sx={{ color: '#00F0FF', fontSize: 19 }} />
          <Typography sx={{ fontSize: 13.5, color: '#F1F5F9', fontWeight: 700 }}>
            推播時間設定
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              color: '#00F0FF',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          {scheduledTime !== DEFAULT_NOTIFICATION_TIME && (
            <Button
              size="small"
              onClick={() => handleTimeChange(DEFAULT_NOTIFICATION_TIME)}
              sx={{
                fontSize: 11.5,
                color: '#94A3B8',
                py: 0.2,
                px: 0.8,
                minWidth: 'auto',
                '&:hover': { color: '#00F0FF' },
              }}
            >
              預設(06:30)
            </Button>
          )}
        </Box>
      </Box>

      {/* 靜音重點提示 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          bgcolor: 'rgba(0, 240, 255, 0.08)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '8px',
          px: 1.25,
          py: 0.75,
          mb: 1.5,
        }}
      >
        <VolumeOffIcon sx={{ color: '#00F0FF', fontSize: 18, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 600 }}>
          嚴格靜音設定：推播完全不發出音效與震動，清晨不打擾作息
        </Typography>
      </Box>

      {/* 推播內容說明 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5, pl: 0.5 }}>
        <Typography sx={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.65)', display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <InfoOutlinedIcon sx={{ fontSize: 15, color: '#94A3B8' }} /> 涵蓋資訊：今日氣溫、室內/室外體感溫度、降雨機率、穿衣指南與帶傘建議
        </Typography>
      </Box>

      {/* 測試按鈕 */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={testing ? <CircularProgress size={14} color="inherit" /> : <SendIcon sx={{ fontSize: 15 }} />}
          onClick={handleTestNotification}
          disabled={testing}
          sx={{
            borderColor: 'rgba(0, 240, 255, 0.4)',
            color: '#00F0FF',
            fontSize: 12.5,
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: '8px',
            '&:hover': {
              borderColor: '#00F0FF',
              bgcolor: 'rgba(0, 240, 255, 0.1)',
            },
          }}
        >
          立即測試推播 (靜音預覽)
        </Button>
      </Box>
    </Box>
  );
}
