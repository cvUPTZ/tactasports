// src/types/gamepad.ts

/**
 * Gamepad and Controller Type Definitions
 * These types support string-based button identifiers for flexibility
 */

export interface GamepadButtonMapping {
  button: string;
  action: string;
  eventName: string;
}

export type ButtonMappings = Record<string, string>;
export type PressedButtons = Set<string>;
export type UpdateMappingHandler = (button: string, action: string) => void;

// Additional helper types for controller events
export interface ControllerEvent {
  button: string;
  eventName: string;
  timestamp: number;
}

export interface KeyboardShortcut {
  key: string;
  eventName: string;
  description?: string;
}
