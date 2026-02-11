import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useEventConfig } from '@/contexts/EventConfigContext';
import { PlayerPosition, predictPassTargets, createDefaultRoster, convertToPlayerPosition } from "@/utils/passPredictor";

// Mappings are now derived dynamically from EventConfigContext
export type GamepadButtonMapping = {
  index: number;
  eventName: string;
  eventDescription: string;
  buttonLabel: string;
};

export const BUTTON_LABELS: { [key: number]: string } = {
  0: "A", 1: "B", 2: "X", 3: "Y",
  4: "LB", 5: "RB", 6: "LT", 7: "RT",
  8: "View", 9: "Menu", 10: "L3", 11: "R3",
  12: "D-Up", 13: "D-Down", 14: "D-Left", 15: "D-Right",
};

export type ModifierCombo = {
  modifier: 'RT' | 'LT' | 'RB' | 'LB' | 'View' | 'Menu' | 'D-Up' | 'D-Down' | 'D-Left' | 'D-Right';
  button: number;
  eventName: string;
  eventDescription: string;
  buttonLabel: string;
};

// Events that trigger Immediate Player Selection (One-Step)
const IMMEDIATE_PLAYER_EVENTS = [
  "pass_start",
  "shot_start",
  "dribble_attempt",
  "foul",
  "interception",
  "turnover",
  "save",
  "card_yellow",
  "card_red",
  "goal",
  "key_pass",
  "assist"
];

export type LoggedEvent = {
  id: number;
  timestamp: string;
  eventName: string;
  team: "TEAM_A" | "TEAM_B";
  buttonLabel: string;
  player?: {
    id: number;
    name: string;
  };
  matchTime?: string;
  videoTime?: number;
  isCalculated?: boolean;
  mode?: 'LIVE' | 'POST_MATCH';
  zone?: number;
  subType?: "SHORT" | "LONG";
  x?: number; // 0-105m
  y?: number; // 0-68m
  endX?: number;
  endY?: number;
  endZone?: number;
  qualityRating?: 1 | 2 | 3 | 4 | 5;
  category?: string;
  folder?: string;
  filenameConvention?: string;
  tempo?: 'HIGH' | 'MEDIUM' | 'LOW';
  underPressure?: boolean;
  isProgressive?: boolean;
  xgValue?: number;
  corridor?: 'LW' | 'LHS' | 'C' | 'RHS' | 'RW';
  durationMs?: number;
  isValidated?: boolean;
  reviewedBy?: string;
  validationNotes?: string;

  // --- Semantic Intelligence Layer ---
  semanticIndicator?: string;      // e.g., "Defensive Block Height", "Momentum Shift"
  intensity?: 'LOW' | 'MEDIUM' | 'HIGH';
  psychology?: 'SPIRIT' | 'EGO' | 'FEAR' | 'COMA';
  contextualFactor?: string;       // e.g., "Post-Goal", "Ref Decision"

  // --- Match State Machine & Prediction ---
  matchState?: any;                // MatchState snapshot
  possessionId?: number;
  inTransitionWindow?: boolean;
  predictions?: any[];             // Prediction[]
  isDelayed?: boolean;             // Logger: Marked as captured with delay
  isMissed?: boolean;              // Logger: Marked as a missed event
  isPendingZone?: boolean;          // NEW: Awaiting asynchronous zone assignment
};

export interface GameState {
  currentTeam: "TEAM_A" | "TEAM_B";
  lastAction: { type: string, timestamp: number, team: "TEAM_A" | "TEAM_B" } | null;
  passSequenceCount: number;
  lastStickMove?: number;
}

export interface PlayerSelectionState {
  currentBallHolder: PlayerPosition | null;
  predictedTargets: PlayerPosition[];
  selectedTargetIndex: number;
  isSelecting: boolean;
}

export interface QuickSelectorState {
  isOpen: boolean;
  roster: PlayerPosition[];
  selectedIndex: number;
  team: "TEAM_A" | "TEAM_B";
}

export interface ZoneSelectorState {
  isOpen: boolean;
  selectedZone: number;
}

// NEW: Thirds-based zone selection state
export type PitchThird = 'DEFENSE' | 'MIDFIELD' | 'ATTACK';
export interface ThirdsZoneState {
  activeThird: PitchThird;
  previewZone: number | null; // 1-18, null if stick is neutral
  confirmedZone: number; // Last confirmed zone (for display)
}

interface UseGamepadOptions {
  teamARoster?: any[];
  teamBRoster?: any[];
  teamAStartingNumbers?: number[];
  teamBStartingNumbers?: number[];
  analysisMode?: 'LIVE' | 'POST_MATCH';
  useKeyboardAsController?: boolean; // NEW: Enable Virtual Controller
}

// Virtual Controller Mapping (Keyboard -> Gamepad Button Index)
const KEYBOARD_CONTROLLER_MAP: { [key: string]: number } = {
  // Face Buttons
  "Space": 0,       // A (Confirm)
  "ShiftLeft": 1,   // B (Cancel)
  "KeyK": 2,        // X
  "KeyL": 3,        // Y

  // Bumpers
  "KeyQ": 4,        // LB
  "KeyE": 5,        // RB

  // Triggers
  "KeyU": 6,        // LT
  "KeyO": 7,        // RT

  // Special
  "KeyV": 8,        // View
  "KeyM": 9,        // Menu
  "KeyZ": 10,       // L3
  "KeyX": 11,       // R3

  // D-Pad
  "ArrowUp": 12,    // D-Up
  "ArrowDown": 13,  // D-Down
  "ArrowLeft": 14,  // D-Left
  "ArrowRight": 15, // D-Right
};

const HOLD_THRESHOLD = 500; // 500ms for hold events

export const useGamepad = (
  onEventLogged: (event: LoggedEvent) => void,
  options: UseGamepadOptions = {},
  onPlayPause?: (isPlaying: boolean) => void
) => {
  const { events: registryEvents } = useEventConfig();
  const [isConnected, setIsConnected] = useState(false);
  const [pressedButtons, setPressedButtons] = useState<number[]>([]);
  const [axes, setAxes] = useState<number[]>([]);
  const [buttons, setButtons] = useState<GamepadButton[]>([]);

  // --- 1. Dynamic Mapping Logic (SSOT) ---
  const { mappings, combos, buttonHolds, dpadHolds } = useMemo(() => {
    const mappings: GamepadButtonMapping[] = [];
    const combos: ModifierCombo[] = [];
    const buttonHolds: { [key: number]: string } = {};
    const dpadHolds: { [key: number]: string } = {};

    registryEvents.forEach(event => {
      if (!event.gamepadMappings) return;

      event.gamepadMappings.forEach(m => {
        // Filter by mode (LIVE vs POST)
        const isPostMatch = options.analysisMode === 'POST_MATCH';
        const matchMode = m.mode === 'BOTH' || (isPostMatch ? m.mode === 'POST' : m.mode === 'LIVE');
        if (!matchMode) return;

        const buttonLabel = m.modifier ? `${m.modifier}+${BUTTON_LABELS[m.buttonIndex]}` : BUTTON_LABELS[m.buttonIndex];

        if (m.modifier) {
          combos.push({
            modifier: m.modifier,
            button: m.buttonIndex,
            eventName: event.eventName,
            eventDescription: event.label,
            buttonLabel: buttonLabel
          });
        } else if (m.isHold) {
          if (m.buttonIndex >= 12 && m.buttonIndex <= 15) {
            dpadHolds[m.buttonIndex] = event.eventName;
          } else {
            buttonHolds[m.buttonIndex] = event.eventName;
          }
        } else {
          mappings.push({
            index: m.buttonIndex,
            eventName: event.eventName,
            eventDescription: event.label,
            buttonLabel: buttonLabel
          });
        }
      });
    });

    return { mappings, combos, buttonHolds, dpadHolds };
  }, [registryEvents, options.analysisMode]);

  // Player Selection State (Legacy / Semantic)
  const [playerSelection, setPlayerSelection] = useState<PlayerSelectionState>({
    currentBallHolder: null,
    predictedTargets: [],
    selectedTargetIndex: 0,
    isSelecting: false
  });

  // Quick Player Selector State (New Popup)
  const [quickSelectorState, setQuickSelectorState] = useState<QuickSelectorState>({
    isOpen: false,
    roster: [],
    selectedIndex: 0,
    team: "TEAM_A"
  });

  const [zoneSelector, setZoneSelector] = useState<ZoneSelectorState>({
    isOpen: false,
    selectedZone: 1
  });

  // NEW: Thirds-based Zone Selection State
  const [thirdsZone, setThirdsZone] = useState<ThirdsZoneState>({
    activeThird: 'MIDFIELD',
    previewZone: null,
    confirmedZone: 0
  });
  const thirdsZoneRef = useRef<ThirdsZoneState>({
    activeThird: 'MIDFIELD',
    previewZone: null,
    confirmedZone: 0
  });

  // Sync thirdsZone to ref
  useEffect(() => {
    thirdsZoneRef.current = thirdsZone;
  }, [thirdsZone]);

  const [pendingEvent, setPendingEvent] = useState<Partial<LoggedEvent> | null>(null);
  const pendingEventRef = useRef<Partial<LoggedEvent> | null>(null);
  const quickSelectorRef = useRef<QuickSelectorState>({
    isOpen: false,
    roster: [],
    selectedIndex: 0,
    team: "TEAM_A"
  });
  const zoneSelectorRef = useRef<ZoneSelectorState>({
    isOpen: false,
    selectedZone: 1
  });

  // Workflow State
  const [isPassing, setIsPassing] = useState(false);
  const isPassingRef = useRef(false);

  useEffect(() => {
    isPassingRef.current = isPassing;
  }, [isPassing]);

  // Sync refs
  useEffect(() => {
    quickSelectorRef.current = quickSelectorState;
  }, [quickSelectorState]);

  useEffect(() => {
    pendingEventRef.current = pendingEvent;
  }, [pendingEvent]);

  useEffect(() => {
    zoneSelectorRef.current = zoneSelector;
  }, [zoneSelector]);

  const resetMappings = useCallback(() => {
    // Legacy: Reset no longer needed as state comes from SSOT
    console.warn("resetMappings called: This is now handled by the Event Registry SSOT.");
  }, []);

  const updateMapping = useCallback((index: number, eventName: string) => {
    // Legacy: Mappings are now read-only derived from registry
    console.warn("updateMapping called locally: Please update the Event Registry via Admin UI instead.");
  }, []);


  // Grid System State
  const [currentZone, setCurrentZone] = useState<number>(0);
  const zoneRef = useRef(0);
  const [keyboardBuffer, setKeyboardBuffer] = useState<string>("");
  const keyboardBufferRef = useRef("");
  const playerSelectionRef = useRef(playerSelection);

  useEffect(() => {
    playerSelectionRef.current = playerSelection;
  }, [playerSelection]);

  useEffect(() => {
    zoneRef.current = currentZone;
  }, [currentZone]);

  const buttonStatesRef = useRef<boolean[]>(new Array(32).fill(false));
  const buttonPressTimestamps = useRef<{ [key: number]: number }>({});

  // TACTA Standard Hold Event Tracking
  const holdEventRef = useRef<{
    startTime: number;
    eventName: string;
    team: "TEAM_A" | "TEAM_B";
    x: number;
    y: number;
    outcomes: Set<string>;
    tempo?: 'HIGH' | 'LOW';
    buttonIndex: number;
  } | null>(null);

  // New: Track if a combo was triggered during a button press sequence
  const comboTriggeredRef = useRef<boolean>(false);
  const modifierSourceRef = useRef<number | null>(null); // Track which modifier button is being held

  // Quality Tap Tracking
  const qualityTapRef = useRef<{
    startTime: number;
    count: number;
    eventId: number | null;
  } | null>(null);

  const rosterARef = useRef<PlayerPosition[]>([]);
  const rosterBRef = useRef<PlayerPosition[]>([]);
  const startingNumbersARef = useRef<number[] | undefined>(undefined);
  const startingNumbersBRef = useRef<number[] | undefined>(undefined);

  // Buffer System for Cancellation (600ms)
  const pendingLogTimeouts = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const lastPendingEventId = useRef<number | null>(null);
  const CANCELLATION_WINDOW_MS = 600;

  const gameStateRef = useRef<GameState>({
    currentTeam: "TEAM_A",
    lastAction: null,
    passSequenceCount: 0,
  });

  // Virtual Controller State (Keyboard emulation)
  const virtualControllerState = useRef<{ [key: number]: boolean }>({});

  // Initialize rosters
  useEffect(() => {
    if (options.teamARoster) rosterARef.current = convertToPlayerPosition(options.teamARoster, "TEAM_A");
    else rosterARef.current = createDefaultRoster("TEAM_A");

    if (options.teamBRoster) rosterBRef.current = convertToPlayerPosition(options.teamBRoster, "TEAM_B");
    else rosterBRef.current = createDefaultRoster("TEAM_B");

    startingNumbersARef.current = options.teamAStartingNumbers;
    startingNumbersBRef.current = options.teamBStartingNumbers;

    if (rosterARef.current.length > 0) {
      let initialPlayer = rosterARef.current[0];
      if (options.teamAStartingNumbers && options.teamAStartingNumbers.length > 0) {
        const starter = rosterARef.current.find(p => options.teamAStartingNumbers?.includes(p.number));
        if (starter) initialPlayer = starter;
      }
      setPlayerSelection(prev => !prev.currentBallHolder ? { ...prev, currentBallHolder: initialPlayer } : prev);
    }
  }, [options.teamARoster, options.teamBRoster, options.teamAStartingNumbers, options.teamBStartingNumbers]);

  const logEvent = useCallback((
    eventName: string,
    team: "TEAM_A" | "TEAM_B",
    buttonLabel: string = "System",
    isCalculated: boolean = false,
    player?: PlayerPosition | null,
    subType?: "SHORT" | "LONG",
    metadata: Partial<LoggedEvent> = {}
  ) => {
    // 0. PREVENT LOGGING UI EVENTS (A/B buttons in LIVE mode)
    // AND HANDLE CANCELLATION
    if (eventName === 'ui_confirm') {
      console.log(`🎮 UI Action: ${eventName}`);
      return;
    }

    if (eventName === 'ui_cancel') {
      // CANCELLATION LOGIC
      if (lastPendingEventId.current && pendingLogTimeouts.current.has(lastPendingEventId.current)) {
        const idToCancel = lastPendingEventId.current;
        clearTimeout(pendingLogTimeouts.current.get(idToCancel));
        pendingLogTimeouts.current.delete(idToCancel);
        lastPendingEventId.current = null;

        console.log("❌ EVENT CANCELLED BY USER");
        return;
      }

      console.log(`🎮 UI Action: ${eventName}`);
      return;
    }

    // 1. POST-MATCH SPECIAL WORKFLOWS
    if (options.analysisMode === 'POST_MATCH') {
      // A) PASSING WORKFLOW (2-Step)
      if (eventName === 'pass_start') {
        if (!isPassingRef.current) {
          // Step 1: Start Pass (Log Start, Enter State)
          const event: LoggedEvent = {
            id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
            timestamp: new Date().toISOString(),
            eventName: "pass_start",
            team,
            buttonLabel,
            isCalculated,
            zone: zoneRef.current,
            subType,
            mode: 'POST_MATCH'
          };
          onEventLogged(event);
          setIsPassing(true);
          isPassingRef.current = true; // Sync ref immediately for consistent checks
          console.log("⚽ Pass Started... Waiting for Receiver");
          return;
        } else {
          // Step 2: End Pass (Trigger Selector for 'pass_end')
          eventName = "pass_end";
          // Fall through to Selector Logic...
        }
      }

      // B) IMMEDIATE EVENTS (or Step 2 of Pass)
      if (IMMEDIATE_PLAYER_EVENTS.includes(eventName) || eventName === 'pass_end') {
        const partialEvent: Partial<LoggedEvent> = {
          id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
          timestamp: new Date().toISOString(),
          eventName,
          team,
          buttonLabel,
          isCalculated,
          zone: zoneRef.current,
          subType,
          mode: 'POST_MATCH'
        };

        setPendingEvent(partialEvent);
        pendingEventRef.current = partialEvent;

        const fullRoster = team === "TEAM_A" ? rosterARef.current : rosterBRef.current;
        const startingNumbers = team === "TEAM_A" ? startingNumbersARef.current : startingNumbersBRef.current;

        let filteredRoster = fullRoster;
        if (startingNumbers && startingNumbers.length > 0) {
          filteredRoster = fullRoster.filter(p => startingNumbers.includes(p.number));
        }

        // Fallback if filter results in empty list (e.g. bad config), show full
        if (filteredRoster.length === 0) filteredRoster = fullRoster;

        const selectorData = {
          isOpen: true,
          roster: filteredRoster,
          selectedIndex: 0,
          team
        };
        setQuickSelectorState(selectorData);
        quickSelectorRef.current = selectorData;

        // Pause Video Immediately
        if (onPlayPause) {
          onPlayPause(false);
        }

        return; // STOP here
      }
    }

    // Find dynamic definition
    const eventDef = registryEvents.find(e => e.eventName === eventName);

    // --- NEW: INTERACTION CHECKS (Async Flow) ---
    const needsZone = eventDef?.requiresZone && !metadata.zone;

    // If it needs a zone, we log it immediately but mark it as pending
    // This prevents the "Live Dialog" interruption requested by the user.
    if (needsZone) {
      console.log(`📍 Event [${eventName}] queued for Asynchronous Zone Selection...`);
      metadata = { ...metadata, isPendingZone: true };
    }

    const event: LoggedEvent = {
      id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
      timestamp: new Date().toISOString(),
      eventName,
      team,
      buttonLabel,
      isCalculated,
      zone: zoneRef.current,
      subType,
      mode: options.analysisMode || 'POST_MATCH',
      // Dynamic Metadata from Registry
      category: eventDef?.category,
      folder: eventDef?.folderPath,
      filenameConvention: eventDef?.filenameConvention,
      durationMs: (eventDef?.defaultDuration ? eventDef.defaultDuration[0] * 1000 : 0), // Default to min duration
      ...(player ? {
        player: {
          id: player.id,
          name: player.name
        }
      } : {}),
      ...metadata
    };

    // NEW BUFFERED LOGGING (0.6s Grace Period)
    const timeoutId = setTimeout(() => {
      onEventLogged(event);
      pendingLogTimeouts.current.delete(event.id);
      if (lastPendingEventId.current === event.id) {
        lastPendingEventId.current = null;
      }
    }, CANCELLATION_WINDOW_MS);

    pendingLogTimeouts.current.set(event.id, timeoutId);
    lastPendingEventId.current = event.id;

    // Switch possession on turnover
    if (eventName === 'turnover') {
      gameStateRef.current.currentTeam = gameStateRef.current.currentTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
      console.log(`⚽ Possession changed to ${gameStateRef.current.currentTeam}`);
    }
    return event;
  }, [onEventLogged, options.analysisMode, onPlayPause, registryEvents]);

  // Keyboard Listener (TACTA Standard + Virtual Controller)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 0. IGNORE if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // --- VIRTUAL CONTROLLER LOGIC ---
      if (options.useKeyboardAsController) {
        const buttonIndex = KEYBOARD_CONTROLLER_MAP[e.code];
        if (buttonIndex !== undefined) {
          e.preventDefault();
          virtualControllerState.current[buttonIndex] = true;
          // Don't return, as we still might want native shortcuts if not mapped to a button?
          // Actually, if it's acting as a controller, we should let the pollGamepad loop handle it
          // OR we can allow hybrid.
          // For now, if it's a controller key, we update state and return to prevent double firing native shortcuts if they overlap
          // If it's a controller key, we update state and return to prevent double firing native shortcuts if they overlap
          // unless it's a key that shouldn't conflict or we want both.
          // For safety, if mapped to controller, we consume it.
          return;
        }
      }

      // 1. GLOBAL: Player ID Input (Numpad)
      if (e.code.startsWith("Numpad") && e.code.length === 7) {
        const num = e.code.slice(6);
        setKeyboardBuffer(prev => prev + num);
        keyboardBufferRef.current += num;
        return;
      }
      if (e.code === "Enter" || e.code === "NumpadEnter") {
        const playerId = parseInt(keyboardBufferRef.current);
        if (!isNaN(playerId)) {
          const currentTeam = gameStateRef.current.currentTeam;
          const roster = currentTeam === "TEAM_A" ? rosterARef.current : rosterBRef.current;
          const player = roster.find(p => p.number === playerId);
          if (player) {
            setPlayerSelection(prev => ({ ...prev, currentBallHolder: player }));
            console.log(`Identified Player: #${playerId} (${player.name})`);
          } else {
            console.warn(`Player #${playerId} not found in ${currentTeam}`);
          }
        }
        setKeyboardBuffer("");
        keyboardBufferRef.current = "";
        return;
      }

      // 2. KEYBOARD SHORTCUTS (Available in both LIVE and POST-MATCH)
      // Only process these if NOT in Virtual Controller mode OR if keys don't conflict
      const team = gameStateRef.current.currentTeam;
      const source = "Keyboard";

      // NUMBER KEYS (1-4) - Core Events
      if (e.key === "1") {
        if (e.altKey) logEvent("pre_assist", team, source);
        else if (e.ctrlKey) logEvent("assist", team, source);
        else if (e.shiftKey) logEvent("key_pass", team, source);
        else logEvent("pass_end", team, source);
        return;
      } else if (e.key === "2") {
        if (e.shiftKey) logEvent("goal", team, source);
        else logEvent("shot_outcome", team, source);
        return;
      } else if (e.key === "3") {
        if (e.shiftKey) logEvent("dribble_fail", team, source);
        else logEvent("dribble_success", team, source);
        return;
      } else if (e.key === "4") {
        logEvent("duel_ground", team, source);
        return;
      } else if (e.key === "5") {
        logEvent("duel_aerial", team, source);
        return;
      }

      // TACTICAL PHASES (Q, W, E, M, L)
      else if (e.key.toLowerCase() === "q") {
        if (!options.useKeyboardAsController) { logEvent("phase_buildup_end", team, source); return; }
      }
      else if (e.key.toLowerCase() === "w") { logEvent("phase_consolidation", team, source); return; }
      else if (e.key.toLowerCase() === "e") {
        if (!options.useKeyboardAsController) { logEvent("phase_final_third", team, source); return; }
      }
      else if (e.key.toLowerCase() === "m") { logEvent("phase_midblock", team, source); return; }
      else if (e.key.toLowerCase() === "l") { logEvent("phase_lowblock", team, source); return; }

      // TRANSITIONS (Z)
      else if (e.key.toLowerCase() === "z") { logEvent("transition_end", team, source); return; }

      // PRESSING (P, R)
      else if (e.key.toLowerCase() === "p") {
        if (e.shiftKey) logEvent("pressing_fail", team, source);
        else logEvent("pressing_success", team, source);
        return;
      }
      else if (e.key.toLowerCase() === "r") { logEvent("pressing_resistance", team, source); return; }

      // OFF-BALL MOVEMENT (O, T, D)
      else if (e.key.toLowerCase() === "o") {
        if (!options.useKeyboardAsController) {
          if (e.altKey) logEvent("underlap", team, source);
          else if (e.shiftKey) logEvent("overlap", team, source);
          else logEvent("off_ball_run", team, source);
          return;
        }
      }
      else if (e.key.toLowerCase() === "t") { logEvent("third_man_run", team, source); return; }
      else if (e.key.toLowerCase() === "d") { logEvent("dummy_run", team, source); return; }

      // PERFORMANCE (C)
      else if (e.key.toLowerCase() === "c") { logEvent("chance_created", team, source); return; }

      // WORKFLOW (F, Enter, Backspace)
      else if (e.key.toLowerCase() === "f") { logEvent("timestamp_fix", team, source); return; }
      else if (e.key === "Enter" && !e.code.startsWith("Numpad")) {
        // Avoid conflict with numpad Enter for player ID
        logEvent("ai_accept", team, source);
        return;
      }
      else if (e.key === "Backspace") { logEvent("ai_reject", team, source); return; }

      // LIVE MODE Legacy / Extras
      if (options.analysisMode === 'LIVE' && !options.useKeyboardAsController) {
        if (e.code === "Space") logEvent("corner_start", team, "Keyboard");
        else if (e.code === "ArrowUp") logEvent("foul_committed", team, "Keyboard");
        else if (e.code === "ArrowDown") logEvent("offside", team, "Keyboard");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (options.useKeyboardAsController) {
        const buttonIndex = KEYBOARD_CONTROLLER_MAP[e.code];
        if (buttonIndex !== undefined) {
          e.preventDefault();
          virtualControllerState.current[buttonIndex] = false;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [logEvent, options.analysisMode, options.useKeyboardAsController]);


  useEffect(() => {
    const handleBlur = () => {
      console.group('[useGamepad] Window Focus Lost');
      console.info('Resetting button states and modifier refs...');
      buttonStatesRef.current = new Array(16).fill(false);
      modifierSourceRef.current = null;
      comboTriggeredRef.current = false;
      buttonPressTimestamps.current = {};
      console.groupEnd();
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  useEffect(() => {
    const checkGamepadConnection = () => {
      const gamepads = navigator.getGamepads();
      const connected = gamepads.some(gp => gp !== null);
      // Virtual controller implies "connected"
      setIsConnected(connected || !!options.useKeyboardAsController);
    };

    // Initial check
    checkGamepadConnection();

    const processInput = (mapping: GamepadButtonMapping, modifiers: { lb: boolean, rb: boolean }, durationMs?: number) => {
      const { currentTeam } = gameStateRef.current;
      // In Live Mode or generic Post-Match input, simple logging:
      logEvent(mapping.eventName, currentTeam, mapping.buttonLabel, false, null, undefined, { durationMs });
    };

    let animationFrameId: number;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gamepad = Array.from(gamepads).find(gp => gp !== null);

      let currentlyPressed: number[] = [];
      let buttonPressed = (idx: number) => false;
      let currentAxes = [0, 0, 0, 0]; // Default axes

      // Merge Physical & Virtual Inputs
      if (gamepad) {
        // Physical gamepad exists
        const physicalButtonPressed = (idx: number) => {
          const btn = gamepad.buttons[idx];
          if (!btn) return false;
          // For triggers (6, 7), use threshold; for others use native pressed flag
          if (idx === 6 || idx === 7) return btn.value > 0.2;
          return btn.pressed;
        };

        buttonPressed = (idx: number) => {
          const physical = physicalButtonPressed(idx);
          const virtual = options.useKeyboardAsController ? virtualControllerState.current[idx] : false;
          return physical || virtual;
        };
        currentAxes = [...gamepad.axes];
        setButtons([...gamepad.buttons]); // Still show physical buttons if available
      } else if (options.useKeyboardAsController) {
        // Virtual Controller Only
        buttonPressed = (idx: number) => !!virtualControllerState.current[idx];
        setButtons(new Array(16).fill(null).map((_, i) => ({
          pressed: virtualControllerState.current[i] || false,
          value: virtualControllerState.current[i] ? 1 : 0,
          touched: virtualControllerState.current[i] || false,
        } as GamepadButton)));
      } else {
        // No input source, skip loop
        animationFrameId = requestAnimationFrame(pollGamepad);
        return;
      }

      setAxes(currentAxes);

      // --- THIRDS-BASED ZONE SELECTION (LT/RT + Right Stick) ---
      // Calculates zone 1-18 based on trigger state and stick direction
      const ltPressed = buttonPressed(6); // LT = Defense (Zones 1-6)
      const rtPressed = buttonPressed(7); // RT = Attack (Zones 13-18)

      // Determine active third
      let activeThird: PitchThird = 'MIDFIELD';
      let thirdOffset = 6; // Midfield zones start at 7 (offset 6)
      if (ltPressed && !rtPressed) {
        activeThird = 'DEFENSE';
        thirdOffset = 0; // Defense zones start at 1 (offset 0)
      } else if (rtPressed && !ltPressed) {
        activeThird = 'ATTACK';
        thirdOffset = 12; // Attack zones start at 13 (offset 12)
      }

      // Calculate subzone from Right Stick (axes[2], axes[3])
      // Grid: 2 rows (top/bottom) x 3 cols (left/center/right)
      const rx = currentAxes[2] || 0;
      const ry = currentAxes[3] || 0;
      const ZONE_STICK_THRESHOLD = 0.4;

      let previewZone: number | null = null;
      if (Math.abs(rx) > ZONE_STICK_THRESHOLD || Math.abs(ry) > ZONE_STICK_THRESHOLD) {
        // Determine column (1-3): Left, Center, Right
        let col = 2; // Center
        if (rx < -ZONE_STICK_THRESHOLD) col = 1; // Left
        else if (rx > ZONE_STICK_THRESHOLD) col = 3; // Right

        // Determine row (1-2): Top (away from goal), Bottom (near goal)
        // Negative Y = Up/Away, Positive Y = Down/Near
        let row = ry < 0 ? 1 : 2; // Row 1 = Top, Row 2 = Bottom

        // Calculate subzone (1-6 within this third)
        // Layout: Row 1 = [1,2,3], Row 2 = [4,5,6]
        const subzone = (row - 1) * 3 + col;
        previewZone = thirdOffset + subzone;
      }

      // Update thirdsZone state if changed
      if (thirdsZoneRef.current.activeThird !== activeThird ||
        thirdsZoneRef.current.previewZone !== previewZone) {
        setThirdsZone(prev => ({
          ...prev,
          activeThird,
          previewZone
        }));
      }

      // Calculate Currently Pressed
      for (let i = 0; i < 16; i++) { // Check standard 16 buttons
        if (buttonPressed(i)) currentlyPressed.push(i);
      }
      setPressedButtons(currentlyPressed);

      // *** INTERCEPT: Quick Player Selection Mode ***
      if (quickSelectorRef.current.isOpen) {
        const { selectedIndex, roster } = quickSelectorRef.current;
        const cols = 5;

        if (buttonPressed(15) && !buttonStatesRef.current[15]) { // Right
          setQuickSelectorState(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, prev.roster.length - 1) }));
        }
        if (buttonPressed(14) && !buttonStatesRef.current[14]) { // Left
          setQuickSelectorState(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) }));
        }
        if (buttonPressed(13) && !buttonStatesRef.current[13]) { // Down
          setQuickSelectorState(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + cols, prev.roster.length - 1) }));
        }
        if (buttonPressed(12) && !buttonStatesRef.current[12]) { // Up
          setQuickSelectorState(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - cols, 0) }));
        }

        if (buttonPressed(0) && !buttonStatesRef.current[0]) { // A
          const selectedPlayer = roster[selectedIndex];
          if (pendingEventRef.current && selectedPlayer) {
            const finalEvent: LoggedEvent = {
              ...pendingEventRef.current as LoggedEvent,
              player: { id: selectedPlayer.id, name: selectedPlayer.name }
            };
            onEventLogged(finalEvent);
            console.log(`✅ Logged ${finalEvent.eventName} for ${selectedPlayer.name}`);
          }
          setQuickSelectorState(prev => ({ ...prev, isOpen: false }));
          setPendingEvent(null);
          setIsPassing(false);
          if (onPlayPause) onPlayPause(true);
        }

        if (buttonPressed(1) && !buttonStatesRef.current[1]) { // B
          if (pendingEventRef.current) {
            const finalEvent: LoggedEvent = { ...pendingEventRef.current as LoggedEvent };
            onEventLogged(finalEvent);
          }
          setQuickSelectorState(prev => ({ ...prev, isOpen: false }));
          setPendingEvent(null);
          setIsPassing(false);
          if (onPlayPause) onPlayPause(true);
        }

        // Always update states before early exit
        for (let i = 0; i < 16; i++) {
          buttonStatesRef.current[i] = buttonPressed(i);
        }
        animationFrameId = requestAnimationFrame(pollGamepad);
        return;
      }

      // --- THIRDS-BASED ZONE CONFIRMATION (A Button) ---
      if (buttonPressed(0) && !buttonStatesRef.current[0]) {
        const pZone = thirdsZoneRef.current.previewZone;
        if (pZone !== null) {
          // Confirm the previewed zone
          setCurrentZone(pZone);
          zoneRef.current = pZone;
          setThirdsZone(prev => ({ ...prev, confirmedZone: pZone }));
          console.log(`📍 Zone Confirmed: ${pZone}`);
        }
      }

      // *** INTERCEPT: Zone Selection Mode (POST_MATCH only usually, but safety check) ***
      // In LIVE mode, zones might be automatic or different workflow.
      // But if Zone Selector IS open, we should control it.
      // However, OP requested D-Pad logic check missing live check?
      // "Lines 550-558 handled zone selector D-pad... should only apply in POST_MATCH".
      if (zoneSelectorRef.current.isOpen && options.analysisMode === 'POST_MATCH') {
        const { selectedZone } = zoneSelectorRef.current;
        const cols = 3; // 3x6 Grid

        // D-Pad or Stick Navigation
        if ((buttonPressed(15) && !buttonStatesRef.current[15])) { // Right
          if (selectedZone % cols !== 0) setZoneSelector(prev => ({ ...prev, selectedZone: prev.selectedZone + 1 }));
        }
        if ((buttonPressed(14) && !buttonStatesRef.current[14])) { // Left
          if (selectedZone % cols !== 1) setZoneSelector(prev => ({ ...prev, selectedZone: prev.selectedZone - 1 }));
        }
        if ((buttonPressed(13) && !buttonStatesRef.current[13])) { // Down
          if (selectedZone <= 15) setZoneSelector(prev => ({ ...prev, selectedZone: prev.selectedZone + cols }));
        }
        if ((buttonPressed(12) && !buttonStatesRef.current[12])) { // Up
          if (selectedZone > cols) setZoneSelector(prev => ({ ...prev, selectedZone: prev.selectedZone - cols }));
        }

        if (buttonPressed(0) && !buttonStatesRef.current[0]) { // A (Confirm)
          if (pendingEventRef.current) {
            logEvent(pendingEventRef.current.eventName!, pendingEventRef.current.team!, pendingEventRef.current.buttonLabel, false, null, undefined, { zone: selectedZone });
          }
          setZoneSelector({ isOpen: false, selectedZone: 1 });
          setPendingEvent(null);
          if (onPlayPause) onPlayPause(true);
        }

        if (buttonPressed(1) && !buttonStatesRef.current[1]) { // B (Cancel)
          setZoneSelector({ isOpen: false, selectedZone: 1 });
          setPendingEvent(null);
          if (onPlayPause) onPlayPause(true);
        }

        for (let i = 0; i < 16; i++) {
          buttonStatesRef.current[i] = buttonPressed(i);
        }
        animationFrameId = requestAnimationFrame(pollGamepad);
        return;
      }

      const now = Date.now();

      // --- 1. Quality Rating Management ---
      if (qualityTapRef.current) {
        const { startTime, count, eventId } = qualityTapRef.current;
        if (now - startTime > 2000) {
          qualityTapRef.current = null;
        } else if (buttonPressed(0) && !buttonStatesRef.current[0]) {
          const newCount = Math.min(count + 1, 5);
          qualityTapRef.current.count = newCount;
          console.log(`⭐ Quality Rated: ${newCount}/5 for Event ${eventId}`);
        }
      }

      // --- 2. Button Hold & Release Logic (Improved) ---
      const activeModifiers = {
        RT: buttonPressed(7),
        LT: buttonPressed(6),
        RB: buttonPressed(5),
        LB: buttonPressed(4),
        View: buttonPressed(8),
        Menu: buttonPressed(9),
        "D-Up": buttonPressed(12),
        "D-Down": buttonPressed(13),
        "D-Left": buttonPressed(14),
        "D-Right": buttonPressed(15)
      };

      // TRACK PRESS START for all buttons to support Hold events
      for (let i = 0; i < 16; i++) {
        if (buttonPressed(i) && !buttonStatesRef.current[i]) {
          buttonPressTimestamps.current[i] = now;
          // If it's a modifier, track that we've started a potential combo/standalone sequence
          if ([4, 5, 6, 7, 8, 9, 12, 13, 14, 15].includes(i)) {
            comboTriggeredRef.current = false;
            modifierSourceRef.current = i;
          }
        }
      }

      // CHECK FOR HOLD EVENTS (X, D-Pad Up, etc.)
      Object.entries(buttonHolds).forEach(([idx, eventName]) => {
        const i = parseInt(idx);
        if (buttonPressed(i) && buttonPressTimestamps.current[i]) {
          const duration = now - buttonPressTimestamps.current[i];
          if (duration >= HOLD_THRESHOLD && !buttonStatesRef.current[i]) { // Trigger once at threshold
            logEvent(eventName, gameStateRef.current.currentTeam, BUTTON_LABELS[i] || `B${i}`);
            // Mark as triggered so we don't fire tap event on release
            comboTriggeredRef.current = true;
          }
        }
      });

      Object.entries(dpadHolds).forEach(([idx, eventName]) => {
        const i = parseInt(idx);
        if (buttonPressed(i) && buttonPressTimestamps.current[i]) {
          const duration = now - buttonPressTimestamps.current[i];
          if (duration >= HOLD_THRESHOLD && !buttonStatesRef.current[i]) {
            logEvent(eventName, gameStateRef.current.currentTeam, BUTTON_LABELS[i] || `B${i}`);
            comboTriggeredRef.current = true;
          }
        }
      });

      // --- 3. Combo Logic ---
      let comboTriggeredInFrame = false;

      combos.forEach(combo => {
        if (activeModifiers[combo.modifier]) {
          if (buttonPressed(combo.button) && !buttonStatesRef.current[combo.button]) {
            processInput({
              index: combo.button,
              eventName: combo.eventName,
              eventDescription: combo.eventDescription,
              buttonLabel: combo.buttonLabel
            }, { lb: activeModifiers.LB, rb: activeModifiers.RB }, 0); // Combos are instantaneous triggers usually
            comboTriggeredInFrame = true;
            comboTriggeredRef.current = true; // Mark that a combo happened during this modifier's hold
          }
        }
      });

      // --- 4. Standalone & Modifier Release Logic (The Fix) ---
      // We only log standalone actions when the button is RELEASED, 
      // and only if no combo or hold was triggered during the press.
      for (let i = 0; i < 16; i++) {
        const released = !buttonPressed(i) && buttonStatesRef.current[i];
        if (released) {
          const pressDuration = now - (buttonPressTimestamps.current[i] || 0);

          // If it's a modifier button (RT, LT, RB, LB, View, Menu, D-Pad)
          if ([4, 5, 6, 7, 8, 9, 12, 13, 14, 15].includes(i)) {
            // LT (6) and RT (7) are MODIFIER-ONLY in TACTA - do not fire standalone events ever
            if (i === 6 || i === 7) {
              modifierSourceRef.current = null;
              delete buttonPressTimestamps.current[i];
              continue;
            }

            // For other modifiers (LB, RB, View), only fire if NOT part of a combo
            if (!comboTriggeredRef.current) {
              const mapping = mappings.find(m => m.index === i);
              if (mapping) {
                processInput(mapping, { lb: activeModifiers.LB, rb: activeModifiers.RB }, pressDuration);
              }
            }
            modifierSourceRef.current = null;
          }
          // If it's a regular button (A, B, X, Y, etc.) and not a hold/combo
          else if (!comboTriggeredRef.current || pressDuration < HOLD_THRESHOLD) {
            const mapping = mappings.find(m => m.index === i);
            if (mapping && !comboTriggeredInFrame) {
              // Ensure we don't fire standalone mapping if it's LT/RT by any chance
              if (mapping.eventName !== 'transition_def_start' && mapping.eventName !== 'transition_off_start') {
                processInput(mapping, { lb: activeModifiers.LB, rb: activeModifiers.RB }, pressDuration);
              }
            }
          }
          delete buttonPressTimestamps.current[i];
        }
      }

      // --- 5. Stick Navigation ---
      // ... (rest of stick logic)
      // Basic Virtual D-Pad for zones if using keyboard
      if (!activeModifiers.RT && !activeModifiers.LT) {
        // If using keyboard, use arrow keys (12,13,14,15) as "stick" for zones if held?
        // Currently loop handles digital 0/1. Stick logic requires axis.
        // We can skip stick logic for keyboard/virtual controller for now as they use D-Pad for pressing
        const lx = currentAxes[0];
        const ly = currentAxes[1];
        const STICK_THRESHOLD = 0.5;

        if (!gameStateRef.current.lastStickMove || (now - gameStateRef.current.lastStickMove > 200)) {
          let newZone = zoneRef.current;
          let moved = false;

          // ROW-MAJOR Navigation Logic (To match ZoneGrid.tsx)
          // Grid is 3 Columns x 6 Rows
          // [1, 2, 3]
          // [4, 5, 6]
          // ...
          // [16,17,18]

          if (ly < -STICK_THRESHOLD) {
            // Down (Physically down on stick) -> Increase Row ID (+3)
            if (newZone <= 15) { newZone += 3; moved = true; }
          }
          else if (ly > STICK_THRESHOLD) {
            // Up (Physically up on stick) -> Decrease Row ID (-3)
            if (newZone > 3) { newZone -= 3; moved = true; }
          }
          else if (lx < -STICK_THRESHOLD) {
            // Left - don't move if at left edge (zone % 3 === 1)
            // 1, 4, 7... are left edge. 1%3==1, 4%3==1.
            if (newZone > 1 && newZone % 3 !== 1) {
              newZone -= 1;
              moved = true;
            }
          }
          else if (lx > STICK_THRESHOLD) {
            // Right - don't move if at right edge (zone % 3 === 0)
            if (newZone < 18 && newZone % 3 !== 0) {
              newZone += 1;
              moved = true;
            }
          }

          if (moved) {
            setCurrentZone(newZone);
            gameStateRef.current.lastStickMove = now;
          }
        }
      }

      // --- 6. Team Toggle (Fallback) ---
      if (!buttonPressed(5) && buttonStatesRef.current[5] && !comboTriggeredRef.current) {
        if (!mappings.find(m => m.index === 5)) {
          gameStateRef.current.currentTeam = gameStateRef.current.currentTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
          console.log(`⚽ Team Toggled: ${gameStateRef.current.currentTeam}`);
        }
      }

      // Update button states for next frame
      for (let i = 0; i < 16; i++) {
        buttonStatesRef.current[i] = buttonPressed(i);
      }
    };

    const workerCode = `let intervalId; self.onmessage = function(e) { if (e.data === 'start') { intervalId = setInterval(() => { self.postMessage('tick'); }, 16); } else if (e.data === 'stop') { clearInterval(intervalId); } };`;
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = (e) => { if (e.data === 'tick') pollGamepad(); };

    window.addEventListener("gamepadconnected", checkGamepadConnection);
    window.addEventListener("gamepaddisconnected", checkGamepadConnection);
    checkGamepadConnection();
    worker.postMessage('start');

    return () => {
      window.removeEventListener("gamepadconnected", checkGamepadConnection);
      window.removeEventListener("gamepaddisconnected", checkGamepadConnection);
      worker.postMessage('stop');
      worker.terminate();
    };
  }, [mappings, onEventLogged, options.useKeyboardAsController, onPlayPause]);

  const manualCheck = useCallback(() => {
    const gamepads = navigator.getGamepads();
    const connected = gamepads.some(gp => gp !== null);
    setIsConnected(connected);
    return connected;
  }, []);

  return {
    isConnected,
    manualCheck,
    pressedButtons,
    axes,
    buttons,
    mappings,
    updateMapping,
    resetMappings,
    playerSelection,
    currentZone,
    setCurrentZone,
    keyboardBuffer,
    quickSelectorState,
    zoneSelector,
    setZoneSelector,
    thirdsZone, // NEW: Thirds-based zone selection state
    setThirdsZone
  };
};
