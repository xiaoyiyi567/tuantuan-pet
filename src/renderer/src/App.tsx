import type { JSX } from "react";
import { PetView } from "./components/PetView";
import { SettingsView } from "./components/SettingsView";
import { tuantuanApi } from "./tuantuanApi";

function PreloadUnavailable(): JSX.Element {
  return (
    <main className="settings-shell">
      <p className="eyebrow">团团</p>
      <h1>Preload 不可用</h1>
      <p className="diagnostic-copy">Electron preload 没有注入，桌宠控制接口暂时不可用。请重启开发服务。</p>
    </main>
  );
}

export default function App(): JSX.Element {
  if (!tuantuanApi()) return <PreloadUnavailable />;
  const route = window.location.hash.replace("#", "");
  if (route === "settings") return <SettingsView />;
  return <PetView />;
}
