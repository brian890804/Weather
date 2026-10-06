import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { SkyTheme } from "./types";

interface BentoCardProps {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
  sky: SkyTheme;
}

export default function BentoCard({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  sub,
  onClick,
  sky,
}: BentoCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: "14px 12px",
        borderRadius: "10px",
        background: sky.cardItemGradient,
        border: `1px solid ${sky.dimBorder}`,
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        transition: "all 0.2s ease",
        WebkitTapHighlightColor: "transparent",
        boxShadow: "0 0 16px rgba(0, 240, 255, 0.05)",
        "&:active": onClick ? { transform: "scale(0.97)" } : {},
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: "8px", mt: "2px" }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "8px",
            bgcolor: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: `1px solid ${iconColor}44`,
            boxShadow: `0 0 8px ${iconColor}33`,
          }}
        >
          <Box
            sx={{
              fontSize: 18,
              color: iconColor,
              display: "flex",
              alignItems: "center",
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 700,
            color: "#FFF",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontSize: 22,
          fontWeight: 800,
          color: sky.textPrimary,
          lineHeight: 1.1,
          letterSpacing: -0.5,
          textShadow: `0 0 10px ${iconColor}44`,
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography
          noWrap
          sx={{
            fontSize: 14,
            color: sky.textSecondary,
            fontWeight: 500,
            letterSpacing: 0.2,
          }}
        >
          {sub}
        </Typography>
      )}
    </Box>
  );
}
