import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// Khelo Tech inspired theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#004AAD", // Khelo Tech Blue (example)
    },
    secondary: {
      main: "#FFD700", // Khelo Tech Gold (example)
    },
    background: {
      default: "#f0f2f5", // Light grey background
    },
  },
  typography: {
    fontFamily: "\"Helvetica Neue\", \"Arial\", sans-serif",
    h4: {
      fontWeight: 700,
      color: "#004AAD",
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
      color: "#FFFFFF", // For AppBar title
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
        },
        containedPrimary: {
          color: "#FFFFFF",
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: "#004AAD", // Khelo Tech Blue for AppBar
        }
      }
    }
  }
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Normalize CSS and apply background color */}
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
