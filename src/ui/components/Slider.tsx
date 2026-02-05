import React from "react";

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  "aria-label": string;
};

export function Slider(props: Props) {
  return (
    <input
      className="slider"
      type="range"
      value={props.value}
      min={props.min}
      max={props.max}
      step={props.step ?? 1}
      aria-label={props["aria-label"]}
      onChange={(e) => props.onChange(Number(e.target.value))}
    />
  );
}

