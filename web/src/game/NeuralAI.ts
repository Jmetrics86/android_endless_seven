/**
 * Native Neural Network AI Engine for Endless Seven Web App
 * Performs forward pass inference using trained model weights (endless_ai_weights.json)
 */

import { CardEntity } from '../entities/CardEntity.js';
import { SealEntity } from '../entities/SealEntity.js';
import { Alignment, CardData } from '../types.js';

import rawWeights from './endless_ai_weights.json' with { type: 'json' };

const CARD_NAME_MAP = new Map<string, number>([
  ["Bella", 1], ["Noble The Great", 2], ["Valtarious", 3], ["Calmadious", 4], ["Coal", 5], ["Dawn", 6], ["Lucian Blackwood", 7],
  ["Tarkidos", 8], ["Kaelo", 9], ["Luna", 10], ["Ulfric Thorne", 11], ["Garmr", 12], ["Varg Fur-back", 13], ["Fenris Lightfoot", 14],
  ["Metatron", 15], ["Cassiel Haggis", 16], ["Jophiel", 17], ["Remiel", 18], ["Oriel The bold", 19], ["Anakim The Wise", 20], ["Samyaza", 21],
  ["Skarados", 22], ["Lycandor", 23], ["Golgothane", 24], ["Umbarax", 25], ["Pazoo", 26], ["Karlyah", 27], ["Nix", 28], ["Mammon", 29],
  ["Bogva", 30], ["Desire", 31], ["Zelus", 32], ["Belphegor", 33], ["Alistar Elren", 34], ["Bacchus", 35], ["Lord Alaric", 36],
  ["Kaelarion", 37], ["Duke Aren Drakos", 38], ["Elowen Thornver", 39], ["Cyprian", 40], ["Valerius Nightshade", 41], ["Sulvian Vane", 42]
]);

export interface NeuralWeightsWeb {
  version?: string;
  input_dim?: number;
  mean: number[];
  std: number[];
  fc1_w: number[][];
  fc1_b: number[];
  fc2_w: number[][];
  fc2_b: number[];
  fc3_w: number[][];
  fc3_b: number[];
}

export function effectivePowerWeb(c: CardEntity | CardData): number {
  if ('mesh' in c) {
    return c.data.power + c.data.powerMarkers - c.data.weaknessMarkers;
  }
  return c.power;
}

export class NeuralAI {
  private static weights: NeuralWeightsWeb = rawWeights as NeuralWeightsWeb;

  private static forwardPass(features: number[]): number {
    const w = NeuralAI.weights;
    if (!w || !w.mean) return 0;

    const inputLen = w.mean.length;
    const norm = new Array(inputLen).fill(0);
    for (let i = 0; i < inputLen; i++) {
      const val = i < features.length ? features[i] : 0;
      norm[i] = (val - w.mean[i]) / (w.std[i] || 1e-6);
    }

    // Layer 1: Dense + ReLU
    const a1 = new Array(w.fc1_b.length).fill(0);
    for (let j = 0; j < w.fc1_b.length; j++) {
      let sum = w.fc1_b[j];
      for (let i = 0; i < norm.length; i++) {
        sum += norm[i] * w.fc1_w[j][i];
      }
      a1[j] = Math.max(0, sum);
    }

    // Layer 2: Dense + ReLU
    const a2 = new Array(w.fc2_b.length).fill(0);
    for (let j = 0; j < w.fc2_b.length; j++) {
      let sum = w.fc2_b[j];
      for (let i = 0; i < a1.length; i++) {
        sum += a1[i] * w.fc2_w[j][i];
      }
      a2[j] = Math.max(0, sum);
    }

    // Layer 3: Dense + Tanh
    let out = w.fc3_b[0];
    for (let i = 0; i < a2.length; i++) {
      out += a2[i] * w.fc3_w[0][i];
    }

    return Math.tanh(out);
  }

  public static selectPrepPlacements(
    hand: CardData[],
    battlefield: (CardEntity | null)[],
    oppBattlefield: (CardEntity | null)[],
    seals: SealEntity[],
    isEnemy: boolean,
    currentRound: number
  ): { cardData: CardData; slotIdx: number }[] {
    const availableHand = [...hand];
    const vacantSlots = battlefield.map((v, i) => (v === null ? i : -1)).filter(i => i !== -1);
    const placements: { cardData: CardData; slotIdx: number }[] = [];

    if (vacantSlots.length === 0 || availableHand.length === 0) return placements;

    const myAlign = isEnemy ? Alignment.DARK : Alignment.LIGHT;
    const oppAlign = isEnemy ? Alignment.LIGHT : Alignment.DARK;

    const mySeals = seals.filter(s => s.alignment === myAlign).length;
    const oppSeals = seals.filter(s => s.alignment === oppAlign).length;

    const handChamps = availableHand.filter(c => c.isChampion).length;
    const handPowerSum = availableHand.reduce((acc, c) => acc + c.power, 0);

    const isV2 = NeuralAI.weights.version === "v2" || NeuralAI.weights.mean.length === 13;

    while (vacantSlots.length > 0 && availableHand.length > 0) {
      let bestChoice: { cardIdx: number; slotIdxIdx: number; score: number } | null = null;
      let highestScore = -Infinity;

      for (let cIdx = 0; cIdx < availableHand.length; cIdx++) {
        const card = availableHand[cIdx];

        for (let sIdxIdx = 0; sIdxIdx < vacantSlots.length; sIdxIdx++) {
          const slot = vacantSlots[sIdxIdx];
          const oppCard = oppBattlefield[slot];
          const oppPower = oppCard ? effectivePowerWeb(oppCard) : 0;
          const cId = CARD_NAME_MAP.get(card.name) || 0;

          const features = isV2 ? [
            currentRound,
            isEnemy ? 1 : 0,
            mySeals,
            oppSeals,
            handChamps,
            handPowerSum,
            slot,
            cId,
            card.power,
            card.isChampion ? 1 : 0,
            card.hasHaste ? 1 : 0,
            card.hasActivate ? 1 : 0,
            oppPower
          ] : [
            currentRound,
            isEnemy ? 1 : 0,
            mySeals,
            oppSeals,
            handChamps,
            handPowerSum,
            slot,
            card.power,
            card.isChampion ? 1 : 0,
            card.hasHaste ? 1 : 0,
            oppPower
          ];

          const score = NeuralAI.forwardPass(features);

          if (score > highestScore) {
            highestScore = score;
            bestChoice = { cardIdx: cIdx, slotIdxIdx: sIdxIdx, score };
          }
        }
      }

      if (bestChoice) {
        const [cardData] = availableHand.splice(bestChoice.cardIdx, 1);
        const [slotIdx] = vacantSlots.splice(bestChoice.slotIdxIdx, 1);
        placements.push({ cardData, slotIdx });
      } else {
        break;
      }
    }

    return placements;
  }
}
