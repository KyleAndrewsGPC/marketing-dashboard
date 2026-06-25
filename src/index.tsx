/* @refresh reload */
import { render } from "solid-js/web";
// Self-hosted Velos brand typeface (Poppins — a geometric stand-in for Nexa).
// Bundled + precached by the PWA so the kiosk renders on-brand fully offline.
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root not found");
}

render(() => <App />, root);
