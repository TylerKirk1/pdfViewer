import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "solid";
};

export function Button({ variant = "ghost", className, ...props }: Props) {
  return <button {...props} className={`btn btn--${variant} ${className ?? ""}`} />;
}

