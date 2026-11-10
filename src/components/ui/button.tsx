import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("button", {
  variants: { variant: { default: "primary", outline: "", ghost: "quiet" } },
  defaultVariants: { variant: "default" },
});

export function Button({ className, variant, type = "button", ...props }:
  ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}
