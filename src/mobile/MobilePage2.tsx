import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import dayjs from "dayjs";
import BentoCard from "./BentoCard";
import MobileSevenDayList from "./MobileSevenDayList";
import MobileClothingGuide from "./MobileClothingGuide";
import type { DayForecast, ActiveDayDetails, SkyTheme } from "./types";

interface MobilePage2Props {
  active: boolean;
  pageRef: React.RefObject<HTMLDivElement | null>;
  dailyList: DayForecast[];
  activeForecastDate: string;
  onSelectForecastDate: (dateStr: string) => void;
  activeDayDetails: ActiveDayDetails | null;
  onGoToPage1: () => void;
  sky: SkyTheme;
}

export default function MobilePage2({
  active,
  pageRef,
  dailyList,
  activeForecastDate,
  onSelectForecastDate,
  activeDayDetails,
  onGoToPage1,
  sky,
}: MobilePage2Props) {
  const page2BentoCards = activeDayDetails?.bentoCards || [];

  return (
    <Box
      ref={pageRef}
      sx={{
        position: "absolute",
        inset: 0,
        overflowY: "auto",
        overscrollBehaviorY: "contain",
        WebkitOverflowScrolling: "touch",
        "&::-webkit-scrollbar": { display: "none" },
        transform: active ? "translateY(0%)" : "translateY(100%)",
        opacity: active ? 1 : 0,
        pointerEvents: active ? "auto" : "none",
        transition:
          "transform 0.38s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.28s ease",
        willChange: "transform, opacity",
      }}
    >
      {/* 內部彈性排版容器：徹底解決行動端 Flex 滾動高度截斷問題 */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          px: { xs: 2, sm: 2.5 },
          pt: "max(8px, env(safe-area-inset-top))",
          pb: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
          gap: "12px",
          width: "100%",
          minHeight: "100%",
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
            ⚡ 未來 7 天氣象趨勢
          </Typography>
        </Box>

        {/* 1. 未來 7 天天氣預報 (7 日氣象清單) */}
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
