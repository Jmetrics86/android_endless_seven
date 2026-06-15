/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared player hand layout math (Prep draw + undo place back to hand).
 */

import * as THREE from 'three';
import gsap from 'gsap';
import type { CardEntity } from '../entities/CardEntity';

/**
 * Horizontal fan index for Prep hand (matches historical PhaseManager draw: `i - 3.5`).
 * Uses fixed eight-slot spread so partial hands match original deal positions.
 */
export function playerHandPrepHandOffset(handIndex: number): number {
  return handIndex - 3.5;
}

/**
 * Dynamic horizontal offset that centers the hand fanning based on current hand size.
 */
export function playerHandDynamicOffset(handIndex: number, handSize: number): number {
  if (handSize <= 1) return 0;
  return handIndex - (handSize - 1) / 2;
}

/** Tween a card to its Prep hand pose, dynamically anchored to the viewport bottom. */
export function tweenPlayerHandCardToPrepPose(
  card: CardEntity,
  handIndex: number,
  handSize: number,
  camera: THREE.PerspectiveCamera,
  duration = 0.5
): void {
  const offset = playerHandDynamicOffset(handIndex, handSize);

  // Compute camera-relative vectors to anchor the hand to the bottom of the screen
  const fovRad = (camera.fov * Math.PI) / 180;
  const halfFov = fovRad / 2;
  const aspect = camera.aspect || 1.0;

  // Camera direction and up vectors in world coordinates
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

  // Distance from camera to cards
  const D = 15.6;

  // Position at distance D along camera direction, offset downwards to the bottom edge of frustum
  const centerPoint = new THREE.Vector3().copy(camera.position).addScaledVector(dir, D);
  const bottomOffset = D * Math.tan(halfFov) * 0.63; // 0.63 offset frames cards nicely above bottom bezel
  const handBaseline = new THREE.Vector3().copy(centerPoint).addScaledVector(up, -bottomOffset);

  // Squeeze spacing on narrower aspect ratios (e.g. portrait) so cards fit within screen width
  const spacingScale = Math.min(1.0, aspect / 1.55);
  const targetX = offset * 2.2 * spacingScale;

  // Local camera right vector to align cards horizontally relative to viewport tilt
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const targetPos = new THREE.Vector3().copy(handBaseline).addScaledVector(right, targetX);

  // Tilt forward to face camera
  const rx = 0.7;
  const ry = 0;
  const rz = 0;

  gsap.to(card.mesh.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration,
    ease: 'power2.out',
  });

  gsap.to(card.mesh.rotation, {
    x: rx,
    y: ry,
    z: rz,
    duration,
    ease: 'power2.out',
  });
}
