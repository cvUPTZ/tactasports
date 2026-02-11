import { LoggedEvent } from '../hooks/useGamepad';
import { EVENT_REGISTRY, EventDefinition } from '../config/eventRegistry';

/**
 * Generates the conventional filename for an event based on the user's specification.
 * Format: NAME_SNAKE_CASE_MIN_SEC.mp4
 * Returns full path: /Match_DATE/Category/Event/Filename
 */
export const generateEventFilename = (event: LoggedEvent, matchDate: string, eventsList: EventDefinition[] = EVENT_REGISTRY): string => {
    // 1. Find the event definition
    const definition = eventsList.find(e => e.eventName === event.eventName);
    if (!definition) return '';

    // 2. Parse Time (MM_SS)
    // event.matchTime is typicaly "45:00"
    let timeStr = event.matchTime || "00:00";
    if (timeStr.includes('+')) timeStr = timeStr.split('+')[0]; // simple handling for now

    const [minStr, secStr] = timeStr.split(':');
    const min = minStr ? minStr.padStart(2, '0') : "00";
    const sec = secStr ? secStr.padStart(2, '0') : "00";

    // 3. Replace Placeholders
    let filename = definition.filenameConvention
        .replace('MIN', min)
        .replace('SEC', sec);

    let folderPath = definition.folderPath.replace('DATE', matchDate); // e.g. 2024-01-19

    return `${folderPath}${filename}`;
};
