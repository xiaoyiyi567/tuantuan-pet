import { useEffect, useRef, useState } from "react";
import type { CSSProperties, JSX, PointerEvent } from "react";
import { PET_SIZE_PRESETS } from "../../../shared/constants";
import type { PetMode, SpeechBubble } from "../../../shared/types";
import { useSnapshot, useNow } from "../hooks";

type DragRef = {
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
};

const DRAG_START_DISTANCE_PX = 10;
const BASE_PENGUIN_WIDTH = 154;

type PetStyle = CSSProperties & Record<"--window-width" | "--window-height" | "--pet-size" | "--pet-scale", string>;

function formatFocusCountdown(endsAt: number | null, now: number): string {
  const remainingSeconds = Math.max(0, Math.ceil(((endsAt ?? now) - now) / 1000));
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function PenguinPet({ mode }: { mode: PetMode }): JSX.Element {
  return (
    <span className={`penguin penguin-${mode}`} aria-hidden="true">
      <span className="penguin__bow" />
      <span className="penguin__body">
        <span className="penguin__belly" />
        <span className="penguin__eye penguin__eye--left" />
        <span className="penguin__eye penguin__eye--right" />
        <span className="penguin__beak" />
        <span className="penguin__scarf" />
      </span>
      <span className="penguin__feet" />
      <span className="penguin__badge" />
    </span>
  );
}

export function PetView(): JSX.Element {
  const snapshot = useSnapshot();
  const now = useNow(1000);
  const [bubble, setBubble] = useState<SpeechBubble | null>(null);
  const dragRef = useRef<DragRef | null>(null);
  const size = snapshot.settings.petSize;
  const preset = PET_SIZE_PRESETS[size];
  const bubbleSide = typeof window !== "undefined" && window.screenY < 90;
  const style: PetStyle = {
    "--window-width": `${preset.windowWidth}px`,
    "--window-height": `${preset.windowHeight}px`,
    "--pet-size": `${preset.pet}px`,
    "--pet-scale": String(preset.pet / BASE_PENGUIN_WIDTH)
  };

  useEffect(() => {
    const offBubble = window.tuantuan.onShowBubble(setBubble);
    const offHide = window.tuantuan.onHideBubble(() => setBubble(null));
    return () => {
      offBubble();
      offHide();
    };
  }, []);

  function finishPointerDrag(clicked: boolean): void {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (drag.dragging) {
      window.tuantuan.petDragStop();
      return;
    }
    if (clicked) window.tuantuan.petClicked();
  }

  function startPointer(event: PointerEvent<HTMLButtonElement>): void {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false
    };
  }

  function movePointer(event: PointerEvent<HTMLButtonElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.dragging && distance > DRAG_START_DISTANCE_PX) {
      drag.dragging = true;
      window.tuantuan.petDragStart({ offsetX: drag.startX, offsetY: drag.startY });
    }
  }

  function stopPointer(event: PointerEvent<HTMLButtonElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const shouldReleaseCapture = event.currentTarget.hasPointerCapture(event.pointerId);
    finishPointerDrag(true);
    if (shouldReleaseCapture) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <main
      className={`pet-shell size-${size}`}
      style={style}
      aria-label="团团桌面工作宠物"
      onContextMenu={(event) => {
        event.preventDefault();
        window.tuantuan.petContextMenu();
      }}
    >
      {bubble ? (
        <section className={`speech-bubble${bubbleSide ? " bubble-side" : ""}`}>
          <p title={bubble.message}>{bubble.message}</p>
          {bubble.actions?.length ? (
            <div className="bubble-actions">
              {bubble.actions.map((action) => (
                <button
                  className={`bubble-button ${action.kind ?? "secondary"}`}
                  key={action.id}
                  onClick={() => window.tuantuan.bubbleAction(action.id)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {snapshot.focusActive ? (
        <div className="focus-badge">
          <span>专注</span>
          <strong>{formatFocusCountdown(snapshot.timers.focusEndsAt, now)}</strong>
        </div>
      ) : null}

      <button
        className={`pet-button state-${snapshot.petMode}`}
        onPointerCancel={() => finishPointerDrag(false)}
        onPointerDown={startPointer}
        onLostPointerCapture={() => finishPointerDrag(false)}
        onPointerMove={movePointer}
        onPointerUp={stopPointer}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          window.tuantuan.petContextMenu();
        }}
        type="button"
      >
        <PenguinPet mode={snapshot.petMode} />
      </button>
    </main>
  );
}
