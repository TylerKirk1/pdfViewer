import React from "react";
import { Icon, type IconName } from "./Icon";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary";
};

export function Button({ variant = "default", className, type = "button", ...props }: ButtonProps) {
  return <button {...props} type={type} className={`btn btn--${variant} ${className ?? ""}`} />;
}

type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName;
  /** Accessible name; also shown as a tooltip unless `title` is given. */
  label: string;
  pressed?: boolean;
};

export function IconButton({ icon, label, pressed, className, title, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`iconBtn ${className ?? ""}`}
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
    >
      <Icon name={icon} />
    </button>
  );
}
