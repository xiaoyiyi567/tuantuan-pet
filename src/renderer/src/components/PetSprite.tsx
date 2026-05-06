import { useEffect, useState } from "react";
import type { CSSProperties, JSX } from "react";
import type { PetMode } from "../../../shared/types";

const spriteStyle: CSSProperties = {
  display: "block",
  width: "var(--pet-size)",
  height: "var(--pet-size)",
  objectFit: "contain",
  objectPosition: "center bottom",
  pointerEvents: "none",
  userSelect: "none"
};

function CssPenguin({ mode }: { mode: PetMode }): JSX.Element {
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

export function PetSprite({ mode }: { mode: PetMode }): JSX.Element {
  const [spriteSrc, setSpriteSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSpriteSrc(null);
    setFailedSrc(null);
    void window.tuantuan.getPetSpriteSrc(mode).then((src) => {
      if (!cancelled) setSpriteSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (spriteSrc && spriteSrc !== failedSrc) {
    return (
      <img
        className="pet-sprite"
        style={spriteStyle}
        src={spriteSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        onError={() => setFailedSrc(spriteSrc)}
      />
    );
  }

  return <CssPenguin mode={mode} />;
}
