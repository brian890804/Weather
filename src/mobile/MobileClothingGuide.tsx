import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import type { ActiveDayDetails, SkyTheme } from "./types";

interface MobileClothingGuideProps {
  activeDayDetails: ActiveDayDetails;
  sky: SkyTheme;
}

export default function MobileClothingGuide({
  activeDayDetails,
  sky,
}: MobileClothingGuideProps) {
  const clothing = activeDayDetails.cloth;
  const clothingTips = activeDayDetails.tips;

  return (
    <Box
      sx={{
        borderRadius: "12px",
        background: sky.cardGradient,
        border: `1px solid ${sky.neonPrimary}4d`,
        boxShadow: `0 0 24px ${sky.neonPrimary}14`,
        backdropFilter: "blur(20px)",
        p: { xs: "12px 10px", sm: "16px 14px" },
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          mb: "6px",
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "8px",
            bgcolor: "rgba(255, 122, 0, 0.22)",
            border: "1px solid rgba(255, 122, 0, 0.45)",
            boxShadow: "0 0 8px rgba(255, 122, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CheckroomIcon sx={{ fontSize: 17, color: "#FF7A00" }} />
        </Box>
        <Typography
          sx={{
            fontSize: 14.5,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: 0.3,
            textShadow: "0 0 10px rgba(255, 122, 0, 0.35)",
          }}
        >
          {clothing.emoji} 生活穿衣指南 · {activeDayDetails.dayLabel} ·{" "}
          {clothing.title}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontSize: 13,
          color: sky.textSecondary,
          lineHeight: 1.5,
          ml: "38px",
        }}
      >
        {clothing.detail}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          mt: "12px",
        }}
      >
        {clothingTips.map((tip) => (
          <Box
            key={tip.key}
            sx={{
              p: "10px 12px",
              borderRadius: "8px",
              background: sky.cardItemGradient,
              border: `1px solid ${sky.dimBorder}`,
              boxShadow: `0 0 10px ${sky.neonPrimary}0f`,
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                color: "#FFF",
                fontWeight: 600,
                mb: "3px",
                letterSpacing: 0.4,
              }}
            >
              {tip.label}
            </Typography>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 800,
                color: tip.color,
              }}
            >
              {tip.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
