/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Game events analytics logger bridging web gameplay to Android Firebase Analytics.
 */

export function logGameEvent(name: string, params: Record<string, any> = {}): void {
  const bridge = typeof window !== 'undefined' ? (window as any).AndroidAnalytics : undefined;
  if (bridge && typeof bridge.logEvent === 'function') {
    try {
      bridge.logEvent(name, JSON.stringify(params));
    } catch (e) {
      console.error("Error logging GA4 event via Android bridge:", e);
    }
  } else {
    // Simulated print for local web development
    console.log(`[GA4 SIMULATION] Event: "${name}"`, params);
  }
}
