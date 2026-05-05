/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

type InputPointerEvent = MouseEvent | PointerEvent;

export class InputHandler {
  public mouse: THREE.Vector2;
  public raycaster: THREE.Raycaster;
  private camera: THREE.Camera;
  private domElement: HTMLElement;

  public onMouseDown: ((event: InputPointerEvent) => void) | null = null;
  public onMouseMove: ((event: InputPointerEvent) => void) | null = null;
  public onMouseUp: ((event: InputPointerEvent) => void) | null = null;
  public onLongPress: ((event: InputPointerEvent) => void) | null = null;

  private longPressTimeout: number | null = null;
  private readonly LONG_PRESS_DURATION = 350; // ms
  private longPressActive = false;
  private startCoords = { x: 0, y: 0 };
  private readonly MOVE_THRESHOLD = 10; // px

  private readonly supportsPointerEvents: boolean;
  private readonly handlePointerMoveBound: (event: PointerEvent) => void;
  private readonly handlePointerDownBound: (event: PointerEvent) => void;
  private readonly handlePointerUpBound: (event: PointerEvent) => void;
  private readonly handleMouseMoveBound: (event: MouseEvent) => void;
  private readonly handleMouseDownBound: (event: MouseEvent) => void;
  private readonly handleMouseUpBound: (event: MouseEvent) => void;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.supportsPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;

    this.handlePointerMoveBound = this.handlePointerMove.bind(this);
    this.handlePointerDownBound = this.handlePointerDown.bind(this);
    this.handlePointerUpBound = this.handlePointerUp.bind(this);
    this.handleMouseMoveBound = this.handleMouseMove.bind(this);
    this.handleMouseDownBound = this.handleMouseDown.bind(this);
    this.handleMouseUpBound = this.handleMouseUp.bind(this);

    if (this.supportsPointerEvents) {
      window.addEventListener('pointermove', this.handlePointerMoveBound, { passive: true });
      window.addEventListener('pointerdown', this.handlePointerDownBound);
      window.addEventListener('pointerup', this.handlePointerUpBound);
    } else {
      window.addEventListener('mousemove', this.handleMouseMoveBound, { passive: true });
      window.addEventListener('mousedown', this.handleMouseDownBound);
      window.addEventListener('mouseup', this.handleMouseUpBound);
    }
  }

  private setPointerFromClientCoords(clientX: number, clientY: number) {
    const rect = this.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  private handlePointerMove(event: PointerEvent) {
    this.setPointerFromClientCoords(event.clientX, event.clientY);

    if (this.longPressTimeout) {
      const dist = Math.sqrt(Math.pow(event.clientX - this.startCoords.x, 2) + Math.pow(event.clientY - this.startCoords.y, 2));
      if (dist > this.MOVE_THRESHOLD) {
        window.clearTimeout(this.longPressTimeout);
        this.longPressTimeout = null;
      }
    }

    if (this.onMouseMove) this.onMouseMove(event);
  }

  private handlePointerDown(event: PointerEvent) {
    this.setPointerFromClientCoords(event.clientX, event.clientY);
    this.startCoords = { x: event.clientX, y: event.clientY };
    this.longPressActive = false;

    this.longPressTimeout = window.setTimeout(() => {
      this.longPressActive = true;
      if (this.onLongPress) this.onLongPress(event);
      this.longPressTimeout = null;
    }, this.LONG_PRESS_DURATION);

    if (this.onMouseDown) this.onMouseDown(event);
  }

  private handlePointerUp(event: PointerEvent) {
    if (this.longPressTimeout) {
      window.clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    if (this.onMouseUp) this.onMouseUp(event);
  }

  private handleMouseMove(event: MouseEvent) {
    this.setPointerFromClientCoords(event.clientX, event.clientY);
    if (this.onMouseMove) this.onMouseMove(event);
  }

  private handleMouseDown(event: MouseEvent) {
    this.setPointerFromClientCoords(event.clientX, event.clientY);
    if (this.onMouseDown) this.onMouseDown(event);
  }

  private handleMouseUp(event: MouseEvent) {
    if (this.onMouseUp) this.onMouseUp(event);
  }

  public dispose() {
    if (this.longPressTimeout) window.clearTimeout(this.longPressTimeout);
    if (this.supportsPointerEvents) {
      window.removeEventListener('pointermove', this.handlePointerMoveBound);
      window.removeEventListener('pointerdown', this.handlePointerDownBound);
      window.removeEventListener('pointerup', this.handlePointerUpBound);
    } else {
      window.removeEventListener('mousemove', this.handleMouseMoveBound);
      window.removeEventListener('mousedown', this.handleMouseDownBound);
      window.removeEventListener('mouseup', this.handleMouseUpBound);
    }
  }
}
