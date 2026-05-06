import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { Settings } from "../../../shared/types";
import { TUANTUAN_PENGUIN_ASSET_SLOTS } from "../../../shared/petAppearance";
import { formatTimer, formatTimestamp } from "../format";
import { useNow, useSnapshot } from "../hooks";

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (next: boolean) => void }): JSX.Element {
  return (
    <button className={`toggle${checked ? " is-on" : ""}`} role="switch" aria-checked={checked} type="button" onClick={() => onChange(!checked)}>
      <span />
      <strong>{label}</strong>
    </button>
  );
}

function NumberInput({ value, min, max, unit, onChange }: { value: number; min: number; max: number; unit: string; onChange: (next: number) => void }): JSX.Element {
  return (
    <label className="number-input">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
      />
      <span>{unit}</span>
    </label>
  );
}

function Chips({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }): JSX.Element {
  const [draft, setDraft] = useState("");

  function add(): void {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!value.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) onChange([...value, trimmed]);
    setDraft("");
  }

  return (
    <div className="chips">
      {value.map((entry) => (
        <span className="chip" key={entry}>
          {entry}
          <button type="button" onClick={() => onChange(value.filter((item) => item !== entry))}>x</button>
        </span>
      ))}
      <input
        value={draft}
        placeholder="添加..."
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: JSX.Element }): JSX.Element {
  return (
    <div className="settings-row">
      <div>
        <strong>{title}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
      {children}
    </div>
  );
}

export function SettingsView(): JSX.Element {
  const snapshot = useSnapshot();
  const now = useNow(1000);
  const [draft, setDraft] = useState(snapshot.settings);

  useEffect(() => setDraft(snapshot.settings), [snapshot.settings]);

  function update(partial: Partial<Settings>): void {
    const next = { ...draft, ...partial };
    setDraft(next);
    window.tuantuan.updateSettings(partial);
  }

  return (
    <main className="settings">
      <header className="settings-header">
        <div className="settings-avatar" aria-hidden="true">团</div>
        <div>
          <p>团团</p>
          <h1>工作陪伴设置</h1>
        </div>
      </header>

      <section className="stats-grid" aria-label="今日统计">
        <div><span>休息</span><strong>{snapshot.stats.breaksTaken}</strong></div>
        <div><span>喝水</span><strong>{snapshot.stats.watersLogged}</strong></div>
        <div><span>专注</span><strong>{snapshot.stats.focusMinutes}<small>分</small></strong></div>
        <div><span>提醒</span><strong>{snapshot.stats.focusWarnings}</strong></div>
      </section>

      <section className="settings-group">
        <h2>提醒</h2>
        <Row title="休息提醒" hint={`下次：${formatTimer(snapshot.timers.breakDueAt, now)}`}>
          <Toggle checked={draft.breakReminderEnabled} label="开启" onChange={(breakReminderEnabled) => update({ breakReminderEnabled })} />
        </Row>
        <Row title="休息间隔">
          <NumberInput value={draft.breakIntervalMinutes} min={1} max={180} unit="分钟" onChange={(breakIntervalMinutes) => update({ breakIntervalMinutes })} />
        </Row>
        <Row title="喝水提醒" hint={`下次：${formatTimer(snapshot.timers.hydrationDueAt, now)}`}>
          <Toggle checked={draft.hydrationReminderEnabled} label="开启" onChange={(hydrationReminderEnabled) => update({ hydrationReminderEnabled })} />
        </Row>
        <Row title="喝水间隔">
          <NumberInput value={draft.hydrationIntervalMinutes} min={1} max={240} unit="分钟" onChange={(hydrationIntervalMinutes) => update({ hydrationIntervalMinutes })} />
        </Row>
      </section>

      <section className="settings-group">
        <h2>专注</h2>
        <Row title="专注时长" hint={snapshot.focusActive ? `结束：${formatTimer(snapshot.timers.focusEndsAt, now)}` : undefined}>
          <NumberInput value={draft.focusDurationMinutes} min={1} max={120} unit="分钟" onChange={(focusDurationMinutes) => update({ focusDurationMinutes })} />
        </Row>
        <Row title="当前 App 检测" hint="macOS 需要辅助功能权限。开启后，专注模式会温和提醒分心应用。">
          <Toggle checked={draft.distractionDetectionEnabled} label="开启" onChange={(distractionDetectionEnabled) => update({ distractionDetectionEnabled })} />
        </Row>
        {draft.distractionDetectionEnabled ? (
          <>
            <Row title="检测宽限时间">
              <NumberInput value={draft.distractionGraceSeconds} min={0} max={180} unit="秒" onChange={(distractionGraceSeconds) => update({ distractionGraceSeconds })} />
            </Row>
            <Row title="分心 App">
              <Chips value={draft.distractionBlockedApps} onChange={(distractionBlockedApps) => update({ distractionBlockedApps })} />
            </Row>
            <Row title="分心关键词">
              <Chips value={draft.distractionBlockedKeywords} onChange={(distractionBlockedKeywords) => update({ distractionBlockedKeywords })} />
            </Row>
          </>
        ) : null}
        <div className="action-row">
          {snapshot.focusActive ? (
            <button type="button" onClick={window.tuantuan.stopFocus}>停止专注</button>
          ) : (
            <button type="button" className="primary" onClick={window.tuantuan.startFocus}>开始专注</button>
          )}
          <button type="button" onClick={window.tuantuan.resetToday}>重置今日</button>
        </div>
      </section>

      <section className="settings-group">
        <h2>系统</h2>
        <Row title="开机自启" hint="打包后的 macOS 应用会注册登录项。">
          <Toggle checked={draft.launchAtLoginEnabled} label="开启" onChange={(launchAtLoginEnabled) => update({ launchAtLoginEnabled })} />
        </Row>
        <Row title="静音模式" hint="静音后团团不主动弹出气泡。">
          <Toggle checked={draft.muted} label="开启" onChange={(muted) => update({ muted })} />
        </Row>
      </section>

      <section className="settings-group">
        <h2>素材入口</h2>
        <p className="muted-copy">第一版使用 CSS 小企鹅占位。之后把 GIF 或 PNG 放入这些路径，再替换桌宠渲染即可。</p>
        <ul className="asset-list">
          {TUANTUAN_PENGUIN_ASSET_SLOTS.map((slot) => <li key={slot.mode}>{slot.suggestedPath}</li>)}
        </ul>
      </section>

      <section className="settings-group">
        <h2>运行状态</h2>
        <div className="diagnostics">
          <span>状态：{snapshot.petMode}</span>
          <span>检测：{snapshot.distraction.state}</span>
          <span>当前 App：{snapshot.distraction.activeApp || "无"}</span>
          <span>检查时间：{formatTimestamp(snapshot.distraction.lastCheckedAt)}</span>
        </div>
        {snapshot.distraction.activeWindowTitle ? <p className="window-title">{snapshot.distraction.activeWindowTitle}</p> : null}
      </section>
    </main>
  );
}
