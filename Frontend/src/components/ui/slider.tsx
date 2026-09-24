import React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "cn"

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  variant?: "default" | "threshold"
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  variant = "default",
  ...props
}: SliderProps) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  const getBackground = () => {
    if (variant !== "threshold" || _values.length !== 4) return undefined;
    const [v0, v1, v2, v3] = _values;
    const p0 = ((v0 - min) / (max - min)) * 100;
    const p1 = ((v1 - min) / (max - min)) * 100;
    const p2 = ((v2 - min) / (max - min)) * 100;
    const p3 = ((v3 - min) / (max - min)) * 100;
    
    return `linear-gradient(to right, 
      #ef4444 0%, #ef4444 ${p0}%, 
      #f97316 ${p0}%, #f97316 ${p1}%, 
      #22c55e ${p1}%, #22c55e ${p2}%, 
      #f97316 ${p2}%, #f97316 ${p3}%, 
      #ef4444 ${p3}%, #ef4444 100%)`;
  };

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full relative", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col mt-6">
        <SliderPrimitive.Track
          data-slot="slider-track"
          style={{ background: getBackground() }}
          className={cn(
            "relative grow overflow-hidden rounded-full select-none data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2",
            variant === "default" && "bg-muted"
          )}
        >
          {variant === "default" && (
            <SliderPrimitive.Indicator
              data-slot="slider-range"
              className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
            />
          )}
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="relative block size-4 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
          >
            {variant === "threshold" && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-foreground px-2 py-0.5 text-xs font-semibold text-background whitespace-nowrap">
                {_values[index]}
              </div>
            )}
          </SliderPrimitive.Thumb>
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
