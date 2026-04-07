import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "@fontsource/geist-sans/800.css";
import "./index.css";

// One-time stale cache cleanup for PWA users stuck on old builds
const CACHE_VERSION = "v2-img-icons";
if (!localStorage.getItem(CACHE_VERSION)) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
  localStorage.setItem(CACHE_VERSION, "1");
  // Reload once so the fresh bundle (without stale SW) takes over
  window.location.reload();
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
