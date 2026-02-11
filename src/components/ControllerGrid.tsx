import { Card } from "@/components/ui/card";
import { GamepadButtonMapping } from "@/hooks/useGamepad";
import { useEffect, useState } from "react";

interface ControllerGridProps {
  lastEventButtonLabel?: string;
  pressedButtons?: number[];
  onManualInput?: (event: string, button: string) => void;
  mappings: GamepadButtonMapping[];
}

export const ControllerGrid = ({ lastEventButtonLabel, pressedButtons = [], onManualInput, mappings }: ControllerGridProps) => {
  const [flashingButton, setFlashingButton] = useState<string | null>(null);

  useEffect(() => {
    if (lastEventButtonLabel) {
      setFlashingButton(lastEventButtonLabel);
      const timer = setTimeout(() => setFlashingButton(null), 300);
      return () => clearTimeout(timer);
    }
  }, [lastEventButtonLabel]);

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {mappings.map((mapping: GamepadButtonMapping) => {
        // Skip unassigned mappings
        if (mapping.index === -1) return null;

        const isPressed = pressedButtons.includes(mapping.index);
        const isFlashing = flashingButton === mapping.buttonLabel;

        return (
          <Card
            key={`${mapping.buttonLabel}-${mapping.index}`}
            onClick={() => onManualInput?.(mapping.eventName, mapping.buttonLabel)}
            className={`p-2 border-2 transition-all w-28 h-24 text-center flex flex-col items-center justify-center cursor-pointer select-none ${isFlashing || isPressed
              ? "border-success bg-success/10 animate-button-flash scale-105"
              : "border-border bg-card hover:border-primary/30 hover:bg-accent/50"
              }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl font-mono font-bold text-primary leading-none">
                {mapping.buttonLabel}
              </span>
              <div>
                <h3 className="text-sm font-bold leading-tight">{mapping.eventDescription}</h3>
                {/* <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">{mapping.eventName}</p> */}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
