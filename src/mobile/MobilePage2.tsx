import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import BentoCard from "./BentoCard";
import MobileSevenDayList from "./MobileSevenDayList";
import MobileClothingGuide from "./MobileClothingGuide";
import NotificationSettingCard from "../components/common/NotificationSettingCard";
import type { WeatherPeriod } from "../types/weather";
import type { DayForecast, ActiveDayDetails, SkyTheme } from "./types";

interface MobilePage2Props {
  active?: boolean;
  pageRef?: React.RefObject<HTMLDivElement | null>;
  dailyList: DayForecast[];
  activeForecastDate: string;
  onSelectForecastDate: (dateStr: string) => void;
  activeDayDetails: ActiveDayDetails | null;
  onGoToPage1: () => void;
  sky: SkyTheme;
  cityName: string;
  townshipName: string;
  currentPeriod: WeatherPeriod | null;
  onShowMessage?: (msg: string) => void;
}

export default function MobilePage2({
  pageRef,
  dailyList,
  activeForecastDate,
  onSelectForecastDate,
  activeDayDetails,
  onGoToPage1,
  sky,
  cityName,
  townshipName,
  currentPeriod,
  onShowMessage,
}: MobilePage2Props) {
  const page2BentoCards = activeDayDetails?.bentoCards || [];

  return (
    <Box
      ref={pageRef}
      sx={{
        width: "100%",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* 內部排版容器：無嵌套捲動，完美配合 Safari 滿版順暢滾動 */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          px: { xs: 2, sm: 2.5 },
          pt: "max(12px, env(safe-area-inset-top, 12px))",
          pb: "calc(env(safe-area-inset-bottom, 24px) + 72px)",
          gap: "12px",
          width: "100%",
        }}
      >
        {/* 頂部標題列 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            pt: 0.5,
          }}
        >
          <Typography
            sx={{
              fontSize: 17,
              fontWeight: 800,
              color: "#FFF",
              letterSpacing: 0.6,
              textShadow: `0 0 12px ${sky.neonPrimary}66`,
            }}
          >
            ⚡ 未來 6 天氣象趨勢
          </Typography>

          {/* 頂部快速返回第 1 頁膠囊按鈕 */}
          <Box
            onClick={onGoToPage1}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              px: "10px",
              py: "3px",
              borderRadius: "16px",
              background: sky.cardItemGradient,
              border: `1px solid ${sky.dimBorder}`,
              backdropFilter: "blur(12px)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              WebkitTapHighlightColor: "transparent",
              "&:active": { transform: "scale(0.95)" },
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: sky.textPrimary,
                lineHeight: 1.2,
              }}
            >
              ↑ 回到今日
            </Typography>
          </Box>
        </Box>

        {/* 1. 未來 6 天天氣預報 (6 日氣象清單) */}
        <MobileSevenDayList
          dailyList={dailyList}
          activeForecastDate={activeForecastDate}
          onSelectForecastDate={onSelectForecastDate}
          activeDayDetails={activeDayDetails}
          sky={sky}
        />

        {/* 2. 6 大核心氣象指標 Bento Grid */}
        {activeDayDetails && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              flexShrink: 0,
              mt: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: "2px",
              }}
            >
              <Typography
                sx={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#FFF",
                  letterSpacing: 0.6,
                  textShadow: `0 0 12px ${sky.neonPrimary}66`,
                }}
              >
                📊 {activeDayDetails.dayLabel} 氣象指標
              </Typography>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {page2BentoCards.map((card) => (
                <BentoCard
                  key={card.key}
                  icon={card.icon}
                  iconColor={card.iconColor}
                  iconBg={card.iconBg}
                  label={card.label}
                  value={card.value}
                  sub={card.sub}
                  sky={sky}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* 3. 智慧生活穿衣指南 (生活防護指令) */}
        {activeDayDetails && (
          <MobileClothingGuide activeDayDetails={activeDayDetails} sky={sky} />
        )}

        {/* 4. 每日 06:30 晨間天氣靜音推播卡片 */}
        <NotificationSettingCard
          cityName={cityName}
          townshipName={townshipName}
          currentPeriod={currentPeriod}
          onShowMessage={onShowMessage}
          isCyberpunkMobile={true}
        />

        {/* 底部回頂端按鈕 */}
        <Box
          onClick={onGoToPage1}
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            py: "4px",
            flexShrink: 0,
            color: sky.neonPrimary,
            transition: "all 0.2s ease",
            WebkitTapHighlightColor: "transparent",
            "&:active": { transform: "scale(0.88)", opacity: 0.75 },
          }}
        >
          <KeyboardArrowUpIcon
            sx={{
              fontSize: 32,
              filter: `drop-shadow(0 0 8px ${sky.neonPrimary})`,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
