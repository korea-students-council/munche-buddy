"use client";

import type { ButtonHTMLAttributes } from "react";

export function ConfirmButton({
  message,
  ...props
}: { message: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
        props.onClick?.(e);
      }}
    />
  );
}
