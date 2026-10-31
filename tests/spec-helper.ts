import * as C from '../src/content';
/** The ten day specs, whatever their export name. */
export const DAYS_SPEC = () => (Object.values(C).find((v) => Array.isArray(v) && v.length === 10 && typeof (v[0] as { chef?: unknown })?.chef === 'string') ?? []) as { chef: string }[];
