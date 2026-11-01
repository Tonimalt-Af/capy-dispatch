// Tunable rules of the game, in one place.

/** Safety rule for digs (ATU) started without the call to the gas network operator.
 *  'cap1'  : the mistake is allowed, flagged in red in the planning preview, and the day is capped at 1 star (default).
 *  'block' : "Lancer la journée" stays disabled until every planned dig has its gas call.
 *  Decided by Maxime on 31 Oct 2026: 'cap1'. 'block' is kept as a one-line switch (still covered by the tests). */
export type SafetyRule = 'cap1' | 'block';
export const SAFETY_RULE: SafetyRule = 'cap1';

/** A day: 8 one-hour slots, 8h-12h then 13h30-17h30 (the real lunch break 12h-13h30 is drawn, never worked).
 *  Slot indices are unchanged from the 12h-13h version (saves store indices), only the afternoon clock moved by 30 min. */
export const SLOTS = 8;
export const LUNCH_AFTER = 4; // the break sits between slot 3 (11h-12h) and slot 4 (13h30)
export const LUNCH_LABEL = 'Pause déjeuner (12 h – 13 h 30)';
/** Minutes since midnight at the start of slot s (s = SLOTS is the end of the day, 17h30). */
export const slotMin = (s: number) => (s < LUNCH_AFTER ? (8 + s) * 60 : (9 + s) * 60 + 30);
const fmt = (m: number, sp: boolean) => `${Math.floor(m / 60)}${sp ? ' h' : 'h'}${m % 60 ? (sp ? ' ' : '') + String(m % 60).padStart(2, '0') : ''}`;
/** "13 h 30" (text) */
export const slotLabel = (s: number) => fmt(slotMin(s), true);
/** "13h30" (timeline header, chips) */
export const slotShort = (s: number) => fmt(slotMin(s), false);
/** End of slot s: "12 h" for the last morning slot, else the start of the next one. */
export const slotEnd = (s: number, short = false) => (s === LUNCH_AFTER - 1 ? (short ? '12h' : '12 h') : short ? slotShort(s + 1) : slotLabel(s + 1));
export const DAY_END = slotLabel(SLOTS); // "17 h 30"

/** Street distance (m) above which moving to the next job costs one slot ("trajet + stationnement": intra-muros is slow). */
export const TRAVEL_M = 650;
/** Festival day: crowds everywhere intra-muros, a shorter walk/drive already costs a slot. */
export const FESTIVAL_TRAVEL_M = 350;
/** Urgent repairs: target delay between the call and the start of the repair, in slots. */
export const URGENT_TARGET = 2;
/** Campaign length for v0.1: 2 weeks of 5 days. */
export const DAYS = 10;
/** Night between two days, in slots of leak (an open leak keeps flowing overnight). */
export const NIGHT_SLOTS = 15;
/** Sector consumption (m³/day) and starting yield (rendement): 72.3 % is the real 2025 network figure for Grand Avignon. */
export const SECTOR_M3 = 4000;
export const START_YIELD = 0.723;
export const YIELD_TARGET = 0.8;
