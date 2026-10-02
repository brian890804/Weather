import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import WeatherPage from './pages/WeatherPage';

// ─── 共用 borderRadius Token ───────────────────────────────────────────────
export const R = {
  xs: 4,   // 小元素: Chip
  sm: 6,   // 輸入框、按鈕
  md: 8,   // 卡片、Tabs、Alert
  lg: 10,  // 主要區塊
} as const;

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#60A5FA',
    },
    secondary: {
      main: '#818CF8',
    },
    background: {
      default: '#0a0f1e',
      paper: '#111827',
    },
    text: {
      primary: '#F1F5F9',
      secondary: '#94A3B8',
    },
  },
  typography: {
    fontFamily: '"Google Sans", "Roboto", "Inter", "Noto Sans TC", system-ui, sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 800 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: {
    borderRadius: R.sm,  // MUI 預設基底
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: R.md,
          backgroundImage: 'none',
          userSelect: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: R.sm,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: R.xs,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: R.sm,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: R.sm,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderRadius: R.md,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: R.md },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WeatherPage />
    </ThemeProvider>
  );
}
