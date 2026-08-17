/**
 * Game Rules and Mechanical Errata Configuration for Headless Simulator
 */

export type ErrataFlags = {
  /** Whether Valerius Nightshade steals 1 power before combat (web variant vs sheet) */
  valeriusStealPower?: boolean;
  /** Whether Samyaza can sacrifice from Limbo to nullify creature ability activation */
  samyazaLimboNullify?: boolean;
  /** Whether Tarkidos power reduction / destroy nullification is strictly once per round */
  tarkidosOncePerRound?: boolean;
  /** Custom boolean or numeric switches for experimental rules */
  [key: string]: boolean | number | string | undefined;
};

export interface RuleConfig {
  /** Number of lane slots / seals (default: 7) */
  laneCount: number;
  /** Number of cards drawn per round (default: 8) */
  handDrawCount: number;
  /** Maximum number of rounds before tie-breaker victory resolution (default: 4) */
  maxRounds: number;
  /** Minimum cards required in deck at prep start before attrition loss triggers (default: 8) */
  attritionThreshold: number;
  /** Number of copies of each Avatar card in deck construction (default: 1) */
  avatarCopies?: number;
  /** Whether to use priority-based prep ability deferral (default: true) */
  enableAbilityDeferral: boolean;
  /** Mechanical and card-specific errata flags */
  errataFlags: {
    valeriusStealPower: boolean;
    samyazaLimboNullify: boolean;
    tarkidosOncePerRound: boolean;
    [key: string]: boolean | number | string | undefined;
  };
}

export type PartialRuleConfig = Partial<Omit<RuleConfig, 'errataFlags'>> & {
  errataFlags?: ErrataFlags;
};

export const DEFAULT_RULES: RuleConfig = {
  laneCount: 7,
  handDrawCount: 8,
  maxRounds: 4,
  attritionThreshold: 8,
  avatarCopies: 1,
  enableAbilityDeferral: true,
  errataFlags: {
    valeriusStealPower: false,
    samyazaLimboNullify: true,
    tarkidosOncePerRound: true,
  }
};

/**
 * Creates a merged RuleConfig from partial overrides.
 */
export function createRuleConfig(overrides?: PartialRuleConfig): RuleConfig {
  if (!overrides) {
    return {
      ...DEFAULT_RULES,
      errataFlags: { ...DEFAULT_RULES.errataFlags }
    };
  }

  return {
    ...DEFAULT_RULES,
    ...overrides,
    errataFlags: {
      ...DEFAULT_RULES.errataFlags,
      ...(overrides.errataFlags || {})
    }
  };
}
