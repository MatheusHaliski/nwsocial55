import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]",
    {
        variants: {
            variant: {
                default:
                    "bg-gradient-to-r from-[#2563eb] via-[#22c55e] to-[#38bdf8] text-white shadow-lg shadow-cyan-500/20 hover:brightness-110",
                outline:
                    "border border-white/10 text-white/80 hover:text-white hover:bg-white/10",
                ghost: "text-white/70 hover:text-white hover:bg-white/10",
            },
            size: {
                default: "h-12 px-6 text-base",
                sm: "h-9 px-3 text-sm",
                lg: "h-12 px-8 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => (
        <button
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
        />
    )
);
Button.displayName = "Button";

export { Button, buttonVariants };