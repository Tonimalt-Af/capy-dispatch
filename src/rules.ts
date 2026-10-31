// Tunable rules of the game, in one place.

/** Safety rule for digs (ATU) started without the call to the gas network operator.
 *  'cap1'  : the mistake is allowed, flagged in red in the planning preview, and the day is capped at 1 star (default).
 *  'block' : "Lancer la journée" stays disabled until every planned dig has its gas call.
 *  Decided by Maxime on 31 Oct 2026: 'cap1'. 'block' is kept as a one-line switch (still covered by the tests). */
export type SafetyRule = 'cap1' | 'block';
export const SAFETY_RULE: SafetyRule = 'cap1';

/** A day: 8 one-hour slots, 8h-12h then 13h-17h (lunch break 12h-13h is drawn, never worked). */
export const SLOTS = 8;
export const LUNCH_AFTER = 4; // the break sits between slot 3 (11h) and slot 4 (13h)
export const slotHour = (s: number) => (s < LUNCH_AFTER ? 8 + s : 9 + s);
export const slotLabel = (s: number) => `${slotHour(s)} h`;

/** Street distance (m) above which moving to the next job costs one slot ("trajet + stationnement": intra-muros is slow). */
export const TRAVEL_M = 650;
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
