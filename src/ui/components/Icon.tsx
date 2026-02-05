import React from "react";

type Props = {
  label: string;
  children: React.ReactNode;
};

export function Icon({ label, children }: Props) {
  return (
    <span aria-hidden="true" title={label} className="icon">
      {children}
    </span>
  );
}

