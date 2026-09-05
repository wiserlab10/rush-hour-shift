import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-amber-400 text-zinc-950 shadow-[0_0_24px_rgba(251,191,36,0.35)] hover:bg-amber-300",
        silver:
          "bg-slate-200 text-zinc-950 shadow-[0_0_24px_rgba(226,232,240,0.28)] hover:bg-white",
        outline:
          "border border-white/15 bg-white/5 text-white hover:bg-white/10",
        ghost: "text-white/80 hover:bg-white/10",
        danger: "bg-rose-500 text-white hover:bg-rose-400",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-10 px-3 text-xs",
        lg: "h-14 px-6 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
