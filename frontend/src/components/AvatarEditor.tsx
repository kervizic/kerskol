import { useState } from "react";
import { Shuffle, Ban, ChevronDown, ChevronRight } from "lucide-react";
import { AvatarView } from "../domain/avatars";
import {
  DICEBEAR_STYLES,
  controlsForStyle,
  previewOptions,
  randomOptions,
  selectedColor,
  selectedVariant,
  setColor,
  setVariant,
  type AvatarOptions,
  type Control,
  type StyleKey,
} from "../domain/avatarConfig";

// Editeur d'avatar pour enfants : gros boutons, vignettes cliquables, apercu en
// direct. Gere le STYLE et les OPTIONS DiceBear. La couleur d'accent de l'enfant
// (les 8 couleurs) reste geree par l'ecran parent (a cote de cet editeur).
export function AvatarEditor({
  style,
  options,
  onChange,
}: {
  style: StyleKey;
  options: AvatarOptions;
  onChange: (style: StyleKey, options: AvatarOptions) => void;
}) {
  const controls = controlsForStyle(style);
  const [open, setOpen] = useState<string>(controls[0]?.key ?? "");

  function changeStyle(next: StyleKey) {
    if (next === style) return;
    onChange(next, randomOptions(next));
    const first = controlsForStyle(next)[0]?.key ?? "";
    setOpen(first);
  }

  return (
    <div className="kk-stack" style={{ gap: 16 }}>
      {/* Apercu + au hasard */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span className="kk-tile__avatar" style={{ display: "inline-flex", borderColor: "var(--kk-accent)" }}>
          <AvatarView avatar={{ style, options, couleur: "" }} size={112} />
        </span>
        <button
          type="button"
          className="kk-btn kk-btn--accent kk-btn--big"
          onClick={() => onChange(style, randomOptions(style))}
        >
          <Shuffle size={20} aria-hidden="true" /> Au hasard
        </button>
      </div>

      {/* Choix du style */}
      <div className="kk-field">
        <span>Le style</span>
        <div className="kk-chips" role="group" aria-label="Style d'avatar">
          {DICEBEAR_STYLES.map((s) => (
            <button
              key={s.key}
              type="button"
              className="kk-tile"
              aria-pressed={style === s.key}
              style={{ padding: 8, borderColor: style === s.key ? "var(--kk-accent)" : "transparent" }}
              onClick={() => changeStyle(s.key)}
            >
              <AvatarView avatar={{ style: s.key, options: {}, couleur: "" }} size={64} />
              <span className="kk-tile__name" style={{ fontSize: "0.85rem" }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Options du style, en accordeon (une section ouverte a la fois) */}
      <div className="kk-stack" style={{ gap: 8 }}>
        {controls.map((c) => (
          <ControlSection
            key={c.key}
            styleKey={style}
            control={c}
            options={options}
            expanded={open === c.key}
            onToggle={() => setOpen((o) => (o === c.key ? "" : c.key))}
            onPick={(value) =>
              onChange(
                style,
                c.kind === "color"
                  ? setColor(options, c.key, value as string)
                  : setVariant(options, c.key, value, c.optional)
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function ControlSection({
  styleKey,
  control,
  options,
  expanded,
  onToggle,
  onPick,
}: {
  styleKey: StyleKey;
  control: Control;
  options: AvatarOptions;
  expanded: boolean;
  onToggle: () => void;
  onPick: (value: string | null) => void;
}) {
  const current =
    control.kind === "color"
      ? selectedColor(options, control.key)
      : selectedVariant(options, control.key);

  return (
    <div className="kk-card" style={{ padding: 12 }}>
      <button
        type="button"
        className="kk-row"
        aria-expanded={expanded}
        onClick={onToggle}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", justifyContent: "space-between", padding: 0 }}
      >
        <span style={{ fontWeight: 700 }}>{control.label}</span>
        {expanded ? <ChevronDown size={20} aria-hidden="true" /> : <ChevronRight size={20} aria-hidden="true" />}
      </button>

      {expanded && control.kind === "color" && (
        <div className="kk-chips" role="group" aria-label={control.label} style={{ marginTop: 10 }}>
          {control.values.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={control.label}
              aria-pressed={current === hex}
              onClick={() => onPick(hex)}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: `#${hex}`,
                border: current === hex ? "3px solid var(--kk-text)" : "3px solid transparent",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}

      {expanded && control.kind === "variant" && (
        <div className="kk-chips" role="group" aria-label={control.label} style={{ marginTop: 10 }}>
          {control.optional && (
            <button
              type="button"
              className="kk-tile"
              aria-label="Aucun"
              aria-pressed={current === null}
              style={{ padding: 6, borderColor: current === null ? "var(--kk-accent)" : "transparent" }}
              onClick={() => onPick(null)}
            >
              <span style={{ width: 56, height: 56, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Ban size={30} aria-hidden="true" />
              </span>
              <span className="kk-tile__name" style={{ fontSize: "0.75rem" }}>Aucun</span>
            </button>
          )}
          {control.values.map((value, i) => (
            <button
              key={value}
              type="button"
              className="kk-tile"
              aria-label={`${control.label} ${i + 1}`}
              aria-pressed={current === value}
              style={{ padding: 6, borderColor: current === value ? "var(--kk-accent)" : "transparent" }}
              onClick={() => onPick(value)}
            >
              <AvatarView avatar={{ style: styleKey, options: previewOptions(options, control, value), couleur: "" }} size={56} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
