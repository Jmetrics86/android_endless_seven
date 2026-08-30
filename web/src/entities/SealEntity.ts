/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { Alignment } from '../types';
import { CardEntity } from './CardEntity';
import { GameEntity } from '../engine/EntityManager';
import type { EnvironmentTheme } from '../theme';
import { ENV_THEME_COLORS } from '../theme';

export class SealEntity implements GameEntity {
  public mesh: THREE.Mesh;
  public light: THREE.PointLight;
  public alignment: Alignment;
  public champion: CardEntity | null = null;
  public index: number;
  private _theme: EnvironmentTheme = 'dark';
  private isHovered = false;
  private lockBorder: THREE.Mesh | null = null;

  constructor(x: number, index: number) {
    this.index = index;
    this.alignment = Alignment.NEUTRAL;
    const colors = ENV_THEME_COLORS.dark;
    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.25, 0.25, 6),
      new THREE.MeshPhongMaterial({ color: colors.sealBase, emissive: colors.sealEmissive })
    );
    this.mesh.position.set(x, 0.1, 0);

    this.light = new THREE.PointLight(0xffffff, 0, 12);
    this.light.position.set(x, 2, 0);

    // Pulsing golden hexagon border for protection (scale 0/hidden initially)
    const borderGeo = new THREE.RingGeometry(1.35, 1.55, 6);
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    this.lockBorder = new THREE.Mesh(borderGeo, borderMat);
    this.lockBorder.rotation.x = -Math.PI / 2;
    this.lockBorder.position.y = -0.02; // Base level just above the table
    this.lockBorder.visible = false;
    this.mesh.add(this.lockBorder);
  }

  /** Update seal base appearance for environment theme (neutral state). */
  public setTheme(theme: EnvironmentTheme) {
    this._theme = theme;
    const colors = ENV_THEME_COLORS[theme];
    const material = this.mesh.material as THREE.MeshPhongMaterial;
    material.color.setHex(colors.sealBase);
    if (this.alignment === Alignment.NEUTRAL) {
      material.emissive.setHex(colors.sealEmissive);
    }
  }

  public setAlignment(status: Alignment) {
    this.alignment = status;
    let color = 0x080808;
    if (status === Alignment.LIGHT) color = 0x00f2ff;
    if (status === Alignment.DARK) color = 0xff0044;

    const material = this.mesh.material as THREE.MeshPhongMaterial;
    material.emissive.setHex(color);
    material.emissiveIntensity = status === Alignment.NEUTRAL ? 0.1 : 0.8;
    this.light.color.setHex(color);
    this.light.intensity = status === Alignment.NEUTRAL ? 0 : 3.5;
  }

  public setHoverHighlight(active: boolean, valid: boolean) {
    this.isHovered = active;
    const material = this.mesh.material as THREE.MeshPhongMaterial;
    if (active) {
      const color = valid ? 0x00f2ff : 0xff0044;
      material.emissive.setHex(color);
      material.emissiveIntensity = 2.0;
      this.light.color.setHex(color);
      this.light.intensity = 5.0;
    } else {
      this.setAlignment(this.alignment);
    }
  }

  public setLocked(locked: boolean) {
    if (this.lockBorder) {
      this.lockBorder.visible = locked;
    }
  }

  public hasWard: boolean = false;

  public setWard(hasWard: boolean) {
    this.hasWard = hasWard;
    this.setLocked(hasWard);
  }

  public update(time: number) {
    if (this.lockBorder && this.lockBorder.visible) {
      const mat = this.lockBorder.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.6 + Math.sin(time * 6) * 0.3; // Pulses opacity
      const scaleVal = 1.0 + Math.sin(time * 6) * 0.03;
      this.lockBorder.scale.set(scaleVal, scaleVal, 1.0); // Pulses scale horizontally
    }

    if (this.isHovered) return;
    if (this.alignment !== Alignment.NEUTRAL) {
      const material = this.mesh.material as THREE.MeshPhongMaterial;
      material.emissiveIntensity = 1.0 + Math.sin(time * 8) * 0.8;
    }
  }

  public dispose() {
    this.mesh.geometry.dispose();
    if (this.lockBorder) {
      this.lockBorder.geometry.dispose();
      (this.lockBorder.material as THREE.Material).dispose();
    }
    (this.mesh.material as THREE.Material).dispose();
  }
}
