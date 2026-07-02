/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { SceneManager } from '../engine/SceneManager';
import { InputHandler } from '../engine/InputHandler';
import { EntityManager } from '../engine/EntityManager';
import { CardEntity } from '../entities/CardEntity';
import { SealEntity } from '../entities/SealEntity';
import { Alignment, Phase, CardData, GameState, HoveredCardInfo } from '../types';
import { LIGHT_POOL, DARK_POOL, GAME_CONSTANTS } from '../constants';
import type { EnvironmentTheme } from '../theme';
import { ENV_THEME_COLORS } from '../theme';
import { CARD_ART_PATHS, CARD_BACK_PATH, cardArtUrl } from '../cardArtPaths';
import { UIManager } from './UIManager';
import { AbilityManager } from './AbilityManager';
import { PhaseManager } from './PhaseManager';
import { IGameController } from './interfaces';
import { shouldEnemyUseLuna } from './EnemyEasyAI';
import { scheduleCombatExchangeFloats } from '../engine/FloatingCombatNumbers';
import { executePrepUndoEntry, type PrepUndoEntry } from './prepUndo';
import { tweenPlayerHandCardToPrepPose } from './prepHandLayout';

/** Temporary: zone/label tuning. Remove ZoneTuningGui and use final values in createPile/setupPiles when done. */
export interface ZoneTuningParams {
  labelWidth: number;
  labelHeight: number;
  labelOffsetZ: number;
  deckX: number;
  deckZ: number;
  deckY: number;
  limboX: number;
  limboZ: number;
  limboY: number;
  graveX: number;
  graveZ: number;
  graveY: number;
}

export class GameController implements IGameController {
  public sceneManager: SceneManager;
  private inputHandler: InputHandler;
  public entityManager: EntityManager;

  public state: GameState;
  public seals: SealEntity[] = [];
  public playerBattlefield: (CardEntity | null)[] = Array(GAME_CONSTANTS.SEVEN).fill(null);
  public enemyBattlefield: (CardEntity | null)[] = Array(GAME_CONSTANTS.SEVEN).fill(null);
  public playerHand: CardEntity[] = [];
  public playerDeck: CardData[] = [];
  public enemyDeck: CardData[] = [];
  public playerLimbo: CardEntity[] = [];
  public enemyLimbo: CardEntity[] = [];
  /** Enemy prep cards not placed on the battlefield (mirror of player hand → Limbo). */
  public enemyPrepRemainder: CardData[] = [];
  /** Cards that participated in battle this round (for Saint Michael Final Act). */
  public cardsThatBattledThisRound: CardEntity[] = [];
  public playerGraveyard: CardEntity[] = [];
  public enemyGraveyard: CardEntity[] = [];

  private playerDeckMesh!: THREE.Group;
  private enemyDeckMesh!: THREE.Group;
  public playerLimboMesh!: THREE.Group;
  public enemyLimboMesh!: THREE.Group;
  public playerGraveyardMesh!: THREE.Group;
  public enemyGraveyardMesh!: THREE.Group;
  private slotMeshes: THREE.Mesh[] = [];
  private highlightedSlotMesh: THREE.Mesh | null = null;
  private currentTheme: EnvironmentTheme = 'dark';
  private floorMesh!: THREE.Mesh;
  private tableMesh!: THREE.Mesh;
  /** Spotlights over table (red and blue hues). */
  public spotLightRed!: THREE.SpotLight;
  public spotLightBlue!: THREE.SpotLight;
  /** Materials for deck pile layers only (card back texture when loaded). */
  private pileCardBackMaterials: THREE.MeshBasicMaterial[] = [];
  /** Meshes used for zone hover detection (Limbo/Graveyard base planes). */
  private zoneHoverMeshes: { mesh: THREE.Mesh; zone: 'playerLimbo' | 'enemyLimbo' | 'playerGraveyard' | 'enemyGraveyard' }[] = [];

  public isProcessing = false;
  /** True while camera is close on the resolving seal; card hover lift is disabled. */
  public sealCameraZoomedIn = false;
  private activeSelection: CardEntity | null = null;
  /** Card currently receiving hover lift animation (hand / table / limbo). */
  private cardHoverLiftTarget: CardEntity | null = null;
  public currentResolvingSealIndex: number = -1;
  private selectedObject: CardEntity | null = null;


  private prepUndoStack: PrepUndoEntry[] = [];

  public pendingAbilityData: any = null;
  public resolutionCallback: (() => void) | null = null;
  public sealSelectionCallback: ((idx: number) => void) | null = null;
  public nullifyCallback: ((confirmed: boolean) => void) | null = null;

  // Player Delta: after confirming Delta's end-of-round sacrifice, we enter targeting.
  // The selected target gets +3 markers, then we destroy the Delta source.
  public pendingDeltaSacrificeSource: CardEntity | null = null;
  public pendingDeltaSacrificeSourceIdx: number = -1;

  // Reservoirs for free-floating markers
  private powerReservoirMesh!: THREE.Group;
  private weaknessReservoirMesh!: THREE.Group;
  private powerReservoirOrb!: THREE.Mesh;
  private weaknessReservoirSpark!: THREE.Group;

  // Dragging state for free-floating markers
  private draggedMarker: THREE.Object3D | null = null;
  private draggedMarkerType: 'power' | 'weakness' | null = null;
  private draggedFromCard: CardEntity | null = null;
  private hoveredMarkerCard: CardEntity | null = null;
  public abilitySourceCard: CardEntity | null = null;
  private poolMarkerMeshes: { mesh: THREE.Object3D; type: 'power' | 'weakness' }[] = [];

  public uiManager: UIManager;
  public abilityManager: AbilityManager;
  public phaseManager: PhaseManager;
  private readonly onResizeBound = () => this.handleResize();

  /** Zone/label layout (final values from zone tuning). */
  public zoneTuningParams: ZoneTuningParams = {
    labelWidth: 3.5,
    labelHeight: 1.75,
    labelOffsetZ: 2.8,
    deckX: -15.4,
    deckZ: 6,
    deckY: 0.2,
    limboX: 15.4,
    limboZ: 6,
    limboY: 0.05,
    graveX: 19.4,
    graveZ: 6,
    graveY: 0.05
  };

  public onStateChange: (state: GameState) => void = () => {};

  constructor(container: HTMLElement) {
    this.sceneManager = new SceneManager(container);
    this.inputHandler = new InputHandler(this.sceneManager.camera, container);
    this.entityManager = new EntityManager();

    const initialState: GameState = {
      playerAlignment: Alignment.LIGHT,
      currentRound: 1,
      currentPhase: Phase.PREP,
      playerScore: 0,
      enemyScore: 0,
      playerDeckCount: 0,
      enemyDeckCount: 0,
      playerGraveyardCount: 0,
      enemyGraveyardCount: 0,
      instructionText: 'Choose your side.',
      phaseStep: '',
      powerPool: 0,
      weaknessPool: 0,
      logs: [],
      playerLimboCards: [],
      enemyLimboCards: [],
      playerGraveyardCards: [],
      enemyGraveyardCards: [],
      playerDeckCards: [],
      enemyDeckCards: [],
      combatInterstitial: null,
      slowMode: true,
      isResolutionPaused: false
    };

    this.uiManager = new UIManager(initialState, (s) => {
      this.state = s;
      this.onStateChange(s);
    });
    this.state = initialState;

    this.abilityManager = new AbilityManager(this);
    this.phaseManager = new PhaseManager(this);

    this.setupBoard();
    this.inputHandler.onMouseMove = this.handleMouseMove.bind(this);
    this.inputHandler.onMouseDown = this.handleMouseDown.bind(this);
    this.inputHandler.onMouseUp = this.handleMouseUp.bind(this);
    this.inputHandler.onLongPress = this.handleLongPress.bind(this);

    window.addEventListener('resize', this.onResizeBound);
    this.animate();
  }

  private setupBoard() {
    const startX = -(GAME_CONSTANTS.SEVEN - 1) * GAME_CONSTANTS.SLOT_SPACING / 2;
    for (let i = 0; i < GAME_CONSTANTS.SEVEN; i++) {
      const x = startX + i * GAME_CONSTANTS.SLOT_SPACING;
      const seal = new SealEntity(x, i);
      this.seals.push(seal);
      this.entityManager.add(seal);
      this.sceneManager.scene.add(seal.mesh);
      this.sceneManager.scene.add(seal.light);
      
      // Visual slots
      this.createGridSlot(x, 3.2);
      this.createGridSlot(x, -3.2);
    }

    // Floor
    const colors = ENV_THEME_COLORS.dark;
    this.floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(GAME_CONSTANTS.TABLE_SIZE, GAME_CONSTANTS.TABLE_SIZE),
      new THREE.MeshPhongMaterial({ color: colors.floor, shininess: 20 })
    );
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.sceneManager.scene.add(this.floorMesh);

    // Light gray table surface for the play area (seals, deck, limbo, grave)
    const { TABLE_PLAY_WIDTH, TABLE_PLAY_DEPTH } = GAME_CONSTANTS;
    this.tableMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(TABLE_PLAY_WIDTH, TABLE_PLAY_DEPTH),
      new THREE.MeshPhongMaterial({ color: colors.table, shininess: 30 })
    );
    this.tableMesh.rotation.x = -Math.PI / 2;
    this.tableMesh.position.y = 0.01;
    this.tableMesh.receiveShadow = true;
    this.sceneManager.scene.add(this.tableMesh);

    // Spotlights pointed down at the table (red and blue hues) – tunable via SceneTuningGui
    const spotRedTarget = new THREE.Object3D();
    spotRedTarget.position.set(0, 0, 0);
    this.sceneManager.scene.add(spotRedTarget);
    // Pulled out and more diffused: wider angle (45°), higher penumbra (0.65), farther positions
    this.spotLightRed = new THREE.SpotLight(0xcc4444, 4000, 55, Math.PI / 4, 0.65);
    this.spotLightRed.position.set(-16, 24, 0);
    this.spotLightRed.target = spotRedTarget;
    this.spotLightRed.castShadow = true;
    this.sceneManager.scene.add(this.spotLightRed);

    const spotBlueTarget = new THREE.Object3D();
    spotBlueTarget.position.set(0, 0, 0);
    this.sceneManager.scene.add(spotBlueTarget);
    this.spotLightBlue = new THREE.SpotLight(0x4444cc, 4000, 55, Math.PI / 4, 0.65);
    this.spotLightBlue.position.set(20, 24, 0);
    this.spotLightBlue.target = spotBlueTarget;
    this.spotLightBlue.castShadow = true;
    this.sceneManager.scene.add(this.spotLightBlue);

    this.setupPiles();
    this.setupMarkerReservoirs();
  }

  private setupMarkerReservoirs() {
    const rZ = 4.8;
    const rY = 0.06;
    const powerX = -2.2;
    const weaknessX = 2.2;

    // 1. Power Reservoir (Blue Orb)
    this.powerReservoirMesh = new THREE.Group();
    this.powerReservoirMesh.position.set(powerX, rY, rZ);

    // Ring base on table
    const blueRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.4, 32),
      new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    blueRing.rotation.x = -Math.PI / 2;
    blueRing.userData = { isMarkerReservoirBase: true, type: 'power' };
    this.powerReservoirMesh.add(blueRing);

    // Floating pulsing blue orb
    const orbGeo = new THREE.SphereGeometry(0.2, 32, 32);
    const orbMat = new THREE.MeshPhongMaterial({
      color: 0x00f2ff,
      emissive: 0x0088ff,
      transparent: true,
      opacity: 0.75,
      shininess: 100
    });
    this.powerReservoirOrb = new THREE.Mesh(orbGeo, orbMat);
    this.powerReservoirOrb.position.y = 0.25;
    this.powerReservoirOrb.userData = { isMarkerReservoir: true, type: 'power' };
    this.powerReservoirMesh.add(this.powerReservoirOrb);

    // Label canvas for "POWER"
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 128;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d')!;
    pCtx.fillStyle = 'rgba(0,0,0,0)';
    pCtx.fillRect(0, 0, 128, 64);
    pCtx.font = 'bold 20px Cinzel, Arial';
    pCtx.fillStyle = '#00f2ff';
    pCtx.textAlign = 'center';
    pCtx.textBaseline = 'middle';
    pCtx.fillText('POWER', 64, 32);
    const pTex = new THREE.CanvasTexture(pCanvas);
    const pLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.4),
      new THREE.MeshBasicMaterial({ map: pTex, transparent: true })
    );
    pLabel.rotation.x = -Math.PI / 2;
    pLabel.position.set(0, 0.005, 0.6);
    this.powerReservoirMesh.add(pLabel);

    this.powerReservoirMesh.visible = false;
    this.sceneManager.scene.add(this.powerReservoirMesh);


    // 2. Weakness Reservoir (Red Spark)
    this.weaknessReservoirMesh = new THREE.Group();
    this.weaknessReservoirMesh.position.set(weaknessX, rY, rZ);

    // Ring base on table
    const redRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.4, 32),
      new THREE.MeshBasicMaterial({ color: 0xff0044, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    redRing.rotation.x = -Math.PI / 2;
    redRing.userData = { isMarkerReservoirBase: true, type: 'weakness' };
    this.weaknessReservoirMesh.add(redRing);

    // Floating sparking red element
    this.weaknessReservoirSpark = new THREE.Group();
    this.weaknessReservoirSpark.position.y = 0.25;
    
    // Core
    const sparkCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      new THREE.MeshBasicMaterial({ color: 0xff0044 })
    );
    sparkCore.userData = { isMarkerReservoir: true, type: 'weakness' };
    this.weaknessReservoirSpark.add(sparkCore);

    // Spikes/crosses
    const spikeMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const spikeGeo = new THREE.ConeGeometry(0.03, 0.35, 4);
    
    const spike1 = new THREE.Mesh(spikeGeo, spikeMat);
    spike1.rotation.z = Math.PI / 2;
    this.weaknessReservoirSpark.add(spike1);

    const spike2 = new THREE.Mesh(spikeGeo, spikeMat);
    spike2.rotation.z = -Math.PI / 2;
    this.weaknessReservoirSpark.add(spike2);

    const spike3 = new THREE.Mesh(spikeGeo, spikeMat);
    this.weaknessReservoirSpark.add(spike3);

    const spike4 = new THREE.Mesh(spikeGeo, spikeMat);
    spike4.rotation.x = Math.PI / 2;
    this.weaknessReservoirSpark.add(spike4);

    this.weaknessReservoirMesh.add(this.weaknessReservoirSpark);

    // Label canvas for "WEAKNESS"
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 128;
    wCanvas.height = 64;
    const wCtx = wCanvas.getContext('2d')!;
    wCtx.fillStyle = 'rgba(0,0,0,0)';
    wCtx.fillRect(0, 0, 128, 64);
    wCtx.font = 'bold 20px Cinzel, Arial';
    wCtx.fillStyle = '#ff0044';
    wCtx.textAlign = 'center';
    wCtx.textBaseline = 'middle';
    wCtx.fillText('WEAKNESS', 64, 32);
    const wTex = new THREE.CanvasTexture(wCanvas);
    const wLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.6),
      new THREE.MeshBasicMaterial({ map: wTex, transparent: true })
    );
    wLabel.rotation.x = -Math.PI / 2;
    wLabel.position.set(0, 0.005, 0.6);
    this.weaknessReservoirMesh.add(wLabel);

    this.weaknessReservoirMesh.visible = false;
    this.sceneManager.scene.add(this.weaknessReservoirMesh);
  }

  private createPoolMarkerMesh(type: 'power' | 'weakness'): THREE.Object3D {
    if (type === 'power') {
      const group = new THREE.Group();
      const orbGeo = new THREE.SphereGeometry(0.36, 32, 32);
      const orbMat = new THREE.MeshPhongMaterial({
        color: 0x00f2ff,
        emissive: 0x0088ff,
        transparent: true,
        opacity: 0.8,
        shininess: 100
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.userData = { isPoolMarker: true, type: 'power' };
      group.add(orb);
      
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.5, 32),
        new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
      );
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);
      
      group.userData = { isPoolMarkerGroup: true, type: 'power' };
      return group;
    } else {
      const group = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.21, 0),
        new THREE.MeshBasicMaterial({ color: 0xff0044 })
      );
      core.userData = { isPoolMarker: true, type: 'weakness' };
      group.add(core);

      const spikeMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
      const spikeGeo = new THREE.ConeGeometry(0.05, 0.63, 4);
      
      const spike1 = new THREE.Mesh(spikeGeo, spikeMat);
      spike1.rotation.z = Math.PI / 2;
      group.add(spike1);

      const spike2 = new THREE.Mesh(spikeGeo, spikeMat);
      spike2.rotation.z = -Math.PI / 2;
      group.add(spike2);

      const spike3 = new THREE.Mesh(spikeGeo, spikeMat);
      group.add(spike3);

      const spike4 = new THREE.Mesh(spikeGeo, spikeMat);
      spike4.rotation.x = Math.PI / 2;
      group.add(spike4);

      group.userData = { isPoolMarkerGroup: true, type: 'weakness' };
      return group;
    }
  }

  public syncPoolMarkerMeshes() {
    this.poolMarkerMeshes.forEach(item => {
      this.sceneManager.scene.remove(item.mesh);
      item.mesh.traverse(child => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat.dispose();
        }
      });
    });
    this.poolMarkerMeshes = [];

    if (this.state.currentPhase !== Phase.COUNTER_ALLOCATION || !this.abilitySourceCard) {
      this.abilitySourceCard = null;
      return;
    }

    const powerCount = this.state.powerPool;
    const weaknessCount = this.state.weaknessPool;

    for (let i = 0; i < powerCount; i++) {
      const mesh = this.createPoolMarkerMesh('power');
      this.sceneManager.scene.add(mesh);
      this.poolMarkerMeshes.push({ mesh, type: 'power' });
    }

    for (let i = 0; i < weaknessCount; i++) {
      const mesh = this.createPoolMarkerMesh('weakness');
      this.sceneManager.scene.add(mesh);
      this.poolMarkerMeshes.push({ mesh, type: 'weakness' });
    }
  }

  private createDraggedMarker(type: 'power' | 'weakness'): THREE.Object3D {
    if (type === 'power') {
      const orbGeo = new THREE.SphereGeometry(0.25, 32, 32);
      const orbMat = new THREE.MeshPhongMaterial({
        color: 0x00f2ff,
        emissive: 0x00aaff,
        transparent: true,
        opacity: 0.8,
        shininess: 120
      });
      const mesh = new THREE.Mesh(orbGeo, orbMat);
      mesh.position.y = 0.4;
      mesh.userData = { isDraggedMarker: true, type: 'power' };
      return mesh;
    } else {
      const group = new THREE.Group();
      group.position.y = 0.4;
      group.userData = { isDraggedMarker: true, type: 'weakness' };
      
      const sparkCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.15, 0),
        new THREE.MeshBasicMaterial({ color: 0xff0044 })
      );
      group.add(sparkCore);

      const spikeMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
      const spikeGeo = new THREE.ConeGeometry(0.04, 0.4, 4);
      
      const spike1 = new THREE.Mesh(spikeGeo, spikeMat);
      spike1.rotation.z = Math.PI / 2;
      group.add(spike1);

      const spike2 = new THREE.Mesh(spikeGeo, spikeMat);
      spike2.rotation.z = -Math.PI / 2;
      group.add(spike2);

      const spike3 = new THREE.Mesh(spikeGeo, spikeMat);
      group.add(spike3);

      const spike4 = new THREE.Mesh(spikeGeo, spikeMat);
      spike4.rotation.x = Math.PI / 2;
      group.add(spike4);

      return group;
    }
  }

  private setupPiles() {
    const p = this.zoneTuningParams;
    this.playerDeckMesh = this.createPile('DECK');
    this.playerDeckMesh.position.set(p.deckX, p.deckY, p.deckZ);
    this.sceneManager.scene.add(this.playerDeckMesh);

    this.enemyDeckMesh = this.createPile('DECK');
    this.enemyDeckMesh.position.set(p.deckX, p.deckY, -p.deckZ);
    this.sceneManager.scene.add(this.enemyDeckMesh);

    this.playerLimboMesh = this.createPile('LIMBO');
    this.playerLimboMesh.position.set(p.limboX, p.limboY, p.limboZ);
    this.sceneManager.scene.add(this.playerLimboMesh);
    this.registerZoneHoverMesh(this.playerLimboMesh, 'playerLimbo');

    this.enemyLimboMesh = this.createPile('LIMBO');
    this.enemyLimboMesh.position.set(p.limboX, p.limboY, -p.limboZ);
    this.sceneManager.scene.add(this.enemyLimboMesh);
    this.registerZoneHoverMesh(this.enemyLimboMesh, 'enemyLimbo');

    this.playerGraveyardMesh = this.createPile('GRAVE');
    this.playerGraveyardMesh.position.set(p.graveX, p.graveY, p.graveZ);
    this.sceneManager.scene.add(this.playerGraveyardMesh);
    this.registerZoneHoverMesh(this.playerGraveyardMesh, 'playerGraveyard');

    this.enemyGraveyardMesh = this.createPile('GRAVE');
    this.enemyGraveyardMesh.position.set(p.graveX, p.graveY, -p.graveZ);
    this.sceneManager.scene.add(this.enemyGraveyardMesh);
    this.registerZoneHoverMesh(this.enemyGraveyardMesh, 'enemyGraveyard');

    this.loadPileCardBackTexture();
  }

  /** Temporary: apply zone tuning params to existing piles (positions + label size/offset). Call after changing zoneTuningParams. */
  public applyZoneTuning(): void {
    const p = this.zoneTuningParams;
    const piles: { group: THREE.Group; zSign: number }[] = [
      { group: this.playerDeckMesh, zSign: 1 },
      { group: this.enemyDeckMesh, zSign: -1 },
      { group: this.playerLimboMesh, zSign: 1 },
      { group: this.enemyLimboMesh, zSign: -1 },
      { group: this.playerGraveyardMesh, zSign: 1 },
      { group: this.enemyGraveyardMesh, zSign: -1 }
    ];
    const posByType: Record<string, { x: number; y: number; z: number }> = {
      deck: { x: p.deckX, y: p.deckY, z: p.deckZ },
      limbo: { x: p.limboX, y: p.limboY, z: p.limboZ },
      grave: { x: p.graveX, y: p.graveY, z: p.graveZ }
    };
    const types: ('deck' | 'limbo' | 'grave')[] = ['deck', 'deck', 'limbo', 'limbo', 'grave', 'grave'];
    piles.forEach(({ group, zSign }, i) => {
      const pos = posByType[types[i]];
      group.position.set(pos.x, pos.y, zSign * pos.z);
      const label = group.getObjectByName('zoneLabel') as THREE.Mesh | undefined;
      if (label && label.geometry) {
        const oldGeo = label.geometry;
        label.geometry = new THREE.PlaneGeometry(p.labelWidth, p.labelHeight);
        oldGeo.dispose();
        label.position.z = p.labelOffsetZ;
      }
    });
  }

  private registerZoneHoverMesh(pileGroup: THREE.Group, zone: 'playerLimbo' | 'enemyLimbo' | 'playerGraveyard' | 'enemyGraveyard') {
    const base = pileGroup.children[0] as THREE.Mesh;
    if (base && base.isMesh) {
      base.userData = { zone };
      this.zoneHoverMeshes.push({ mesh: base, zone });
    }
  }

  private createPile(type: 'DECK' | 'LIMBO' | 'GRAVE'): THREE.Group {
    const colors = ENV_THEME_COLORS.dark;
    const p = this.zoneTuningParams;
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(GAME_CONSTANTS.CARD_W + 0.3, 0.1, GAME_CONSTANTS.CARD_H + 0.3),
      new THREE.MeshPhongMaterial({ color: colors.pileBase, transparent: true, opacity: colors.pileBaseOpacity })
    );
    group.add(base);

    const isDeck = type === 'DECK';
    if (isDeck) {
      for (let i = 0; i < 6; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: colors.pileDeckLayer,
          transparent: true,
          side: THREE.DoubleSide
        });
        this.pileCardBackMaterials.push(mat);
        const layer = new THREE.Mesh(
          new THREE.PlaneGeometry(GAME_CONSTANTS.CARD_W, GAME_CONSTANTS.CARD_H),
          mat
        );
        layer.rotation.x = -Math.PI / 2;
        layer.position.y = 0.05 + (i * 0.06);
        layer.rotation.z = (Math.random() - 0.5) * 0.15;
        group.add(layer);
      }
    }

    // All zone labels: same gray style and uppercase text (DECK, LIMBO, GRAVE); size/offset from zoneTuningParams
    const labelGray = 0xcccccc;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 44px Cinzel';
    ctx.textAlign = 'center';
    ctx.fillText(type, 128, 48);

    const tex = new THREE.CanvasTexture(canvas);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(p.labelWidth, p.labelHeight),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: labelGray })
    );
    label.name = 'zoneLabel';
    label.rotation.x = -Math.PI / 2;
    label.position.y = 0.06;
    label.position.z = p.labelOffsetZ;
    group.add(label);

    return group;
  }

  private loadPileCardBackTexture(): void {
    const loader = new THREE.TextureLoader().setCrossOrigin('anonymous');
    loader.load(cardArtUrl(CARD_BACK_PATH), (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      this.pileCardBackMaterials.forEach((m) => {
        m.map = tex;
        m.color.setHex(0xffffff);
      });
    });
  }

  private createGridSlot(x: number, z: number) {
    const colors = ENV_THEME_COLORS.dark;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(GAME_CONSTANTS.CARD_W + 0.4, GAME_CONSTANTS.CARD_H + 0.4),
      new THREE.MeshBasicMaterial({ color: colors.slotFill, transparent: true, opacity: colors.slotOpacity, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    mesh.userData = { isSlot: true, slotIndex: Math.round((x - (-(GAME_CONSTANTS.SEVEN - 1) * GAME_CONSTANTS.SLOT_SPACING / 2)) / GAME_CONSTANTS.SLOT_SPACING) };
    this.sceneManager.scene.add(mesh);
    this.slotMeshes.push(mesh);
  }

  /** Switch 3D environment theme (dark/light) for accessibility. */
  public setEnvironmentTheme(theme: EnvironmentTheme) {
    this.currentTheme = theme;
    const colors = ENV_THEME_COLORS[theme];
    this.sceneManager.setTheme(theme);

    (this.floorMesh.material as THREE.MeshPhongMaterial).color.setHex(colors.floor);
    (this.tableMesh.material as THREE.MeshPhongMaterial).color.setHex(colors.table);

    for (const slot of this.slotMeshes) {
      const mat = slot.material as THREE.MeshBasicMaterial;
      mat.color.setHex(colors.slotFill);
      mat.opacity = colors.slotOpacity;
    }

    for (const seal of this.seals) {
      seal.setTheme(theme);
    }

    const pileGroups = [
      this.playerDeckMesh,
      this.enemyDeckMesh,
      this.playerLimboMesh,
      this.enemyLimboMesh,
      this.playerGraveyardMesh,
      this.enemyGraveyardMesh,
    ];
    for (const group of pileGroups) {
      const base = group.children[0] as THREE.Mesh;
      if (base?.isMesh && base.material) {
        const mat = base.material as THREE.MeshPhongMaterial;
        mat.color.setHex(colors.pileBase);
        mat.opacity = colors.pileBaseOpacity;
      }
    }

    for (const mat of this.pileCardBackMaterials) {
      mat.color.setHex(mat.map ? 0xffffff : colors.pileDeckLayer);
    }
  }

  public selectAlignment(side: Alignment) {
    this.state.playerAlignment = side;
    this.addLog(`Selected Alignment: ${side}`);
    if (side === Alignment.LIGHT) {
      this.playerDeck = this.buildDeck(LIGHT_POOL);
      this.enemyDeck = this.buildDeck(DARK_POOL);
    } else {
      this.playerDeck = this.buildDeck(DARK_POOL);
      this.enemyDeck = this.buildDeck(LIGHT_POOL);
    }
    this.enemyPrepRemainder = [];
    this.updateState({ instructionText: 'Prepare for the cycle.' });
    this.phaseManager.startPrepPhase();
  }

  /** Spawns remainder prep cards into enemy Limbo before resolution (after player Limbo purge). */
  public appendEnemyPrepCardsToLimbo(): void {
    const list = this.enemyPrepRemainder;
    const n = list.length;
    this.enemyPrepRemainder = [];
    if (n === 0) return;
    const p = this.zoneTuningParams;
    const baseZ = this.enemyLimboMesh.position.z;
    const baseX = this.enemyLimboMesh.position.x;
    for (let i = 0; i < list.length; i++) {
      const cardData = list[i];
      const card = new CardEntity(cardData, true, this.state.playerAlignment);
      this.entityManager.add(card);
      this.sceneManager.scene.add(card.mesh);
      card.mesh.position.set(-15, 2, -6);
      card.mesh.rotation.x = Math.PI;
      const stackY = 0.2 + this.enemyLimbo.length * 0.05;
      this.enemyLimbo.push(card);
      card.applyBackTextureIfNeeded();
      gsap.to(card.mesh.position, {
        x: baseX,
        y: stackY,
        z: baseZ,
        duration: 0.55,
        delay: i * 0.05,
        ease: 'power2.out',
        onComplete: () => {
          card.mesh.rotation.set(0, 0, 0);
          card.updateVisualMarkers();
        }
      });
    }
    this.addLog(`Enemy sends ${n} unassigned card(s) to Limbo.`);
    this.updateState({});
    this.abilityManager.syncBoardPresencePowerMarkers();
  }

  private buildDeck(pool: CardData[]): CardData[] {
    const tribalFactions = ['Celestial', 'Lycan', 'Daemon', 'Vampyre'];
    const specialFactions = ['Light', 'Darkness']; // God / Horseman / Avatar: 1 copy each
    let deck: CardData[] = [];
    pool.forEach(card => {
      const copies = specialFactions.includes(card.faction) ? 1 : (tribalFactions.includes(card.faction) ? 3 : 1);
      for (let i = 0; i < copies; i++) { deck.push({ ...card }); }
    });
    return deck.sort(() => Math.random() - 0.5);
  }

  public startPrep() {
    this.phaseManager.startPrepPhase();
  }


  public endPrep() {
    this.phaseManager.endPrep();
  }

  public async startResolution() {
    await this.phaseManager.startResolution();
  }

  public async resolveSeal(idx: number) {
    await this.phaseManager.resolveSeal(idx);
  }

  public isImmuneToAbilities(target: CardEntity, source: CardEntity): boolean {
    return this.abilityManager.isImmuneToAbilities(target, source);
  }

  public isProtected(card: CardEntity): boolean {
    return this.abilityManager.isProtected(card);
  }

  public async handleSiege(idx: number, attacker: CardEntity | null, isPlayer: boolean) {
    await this.phaseManager.handleSiege(idx, attacker, isPlayer);
  }

  public ascendToSeal(card: CardEntity, idx: number) {
    this.phaseManager.ascendToSeal(card, idx);
  }

  public checkGameOver() {
    this.phaseManager.checkGameOver();
  }

  public disposeCard(card: CardEntity) {
    this.sceneManager.scene.remove(card.mesh);
    this.entityManager.remove(card);
  }

  public addLog(msg: string) {
    this.uiManager.addLog(msg);
  }

  public cardToHoveredInfo(card: CardEntity): HoveredCardInfo {
    return {
      name: card.data.name,
      faction: card.data.faction,
      power: card.data.power,
      type: card.data.type,
      isChampion: card.data.isChampion,
      ability: card.data.ability,
      powerMarkers: card.data.powerMarkers,
      weaknessMarkers: card.data.weaknessMarkers,
      faceArtPath: CARD_ART_PATHS[card.data.name]
    };
  }

  private cardDataToHoveredInfo(data: CardData): HoveredCardInfo {
    return {
      name: data.name,
      faction: data.faction,
      power: data.power,
      type: data.type,
      isChampion: data.isChampion,
      ability: data.ability,
      powerMarkers: 0,
      weaknessMarkers: 0,
      faceArtPath: CARD_ART_PATHS[data.name]
    };
  }

  public updateState(patch: Partial<GameState>) {
    this.updateLimboGraveyardVisibility();
    const zonePatch: Partial<GameState> = {
      playerLimboCards: this.playerLimbo.map((c) => this.cardToHoveredInfo(c)),
      enemyLimboCards: this.enemyLimbo.map((c) => this.cardToHoveredInfo(c)),
      playerGraveyardCards: this.playerGraveyard.map((c) => this.cardToHoveredInfo(c)),
      enemyGraveyardCards: this.enemyGraveyard.map((c) => this.cardToHoveredInfo(c)),
      playerDeckCards: this.playerDeck.map((d) => this.cardDataToHoveredInfo(d)),
      enemyDeckCards: this.enemyDeck.map((d) => this.cardDataToHoveredInfo(d))
    };
    this.uiManager.updateState({ ...zonePatch, ...patch }, this.playerDeck.length, this.enemyDeck.length, this.playerGraveyard.length, this.enemyGraveyard.length);
    this.syncPoolMarkerMeshes();
  }

  /** Only the top card in each Limbo/Graveyard pile is visible; others are hidden. */
  private updateLimboGraveyardVisibility() {
    for (const arr of [this.playerLimbo, this.enemyLimbo, this.playerGraveyard, this.enemyGraveyard]) {
      const topIndex = arr.length - 1;
      arr.forEach((card, i) => {
        card.mesh.visible = i === topIndex;
      });
    }
  }

  /** Called from UI when user selects a card from the Limbo search modal (e.g. for Sentinel ability). */
  public selectLimboCardForAbility(zone: 'player' | 'enemy', index: number) {
    const limbo = zone === 'player' ? this.playerLimbo : this.enemyLimbo;
    const card = limbo[index];
    if (!card || this.state.currentPhase !== Phase.ABILITY_TARGETING || !this.pendingAbilityData?.effect) return;
    if (this.pendingAbilityData.effect === 'sentinel_absorb') {
      this.abilityManager.applyAbilityEffect(card, this.pendingAbilityData);
    } else if (this.pendingAbilityData.effect === 'pazoo_limbo_to_deck') {
      if (zone !== 'player') return;
      const idx = limbo.indexOf(card);
      if (idx !== -1) limbo.splice(idx, 1);
      const deck = this.playerDeck;
      const { powerMarkers, weaknessMarkers, faceUp, isInvincible, isSuppressed, boardPresencePowerMarkers, ...baseData } = card.data;
      deck.push({ ...baseData });
      this.disposeCard(card);
      this.addLog(`Pazoo places ${card.data.name} from Limbo on top of deck.`);
      this.abilityManager.syncBoardPresencePowerMarkers();
    } else {
      return;
    }
    this.updateState({ currentPhase: Phase.RESOLUTION, instructionText: '', isSelectingLimboTarget: false });
    this.pendingAbilityData = null;
    if (this.resolutionCallback) this.resolutionCallback();
    this.resolutionCallback = null;
    if (this.currentResolvingSealIndex !== -1) this.zoomIn(this.currentResolvingSealIndex);
  }

  public zoomOut() {
    this.sealCameraZoomedIn = false;
    this.phaseManager.zoomOut();
  }

  public zoomIn(idx: number) {
    this.sealCameraZoomedIn = true;
    this.clearCardHoverLiftTarget();
    this.phaseManager.zoomIn(idx);
  }

  public async allocateCounters(card: CardEntity, isAI: boolean) {
    await this.abilityManager.allocateCounters(card, isAI);
  }

  public async handleTargetedAbility(source: CardEntity, isAI: boolean) {
    await this.abilityManager.handleTargetedAbility(source, isAI);
  }

  public async handleSealTargetAbility(source: CardEntity, isAI: boolean) {
    await this.abilityManager.handleSealTargetAbility(source, isAI);
  }

  public async executeGlobalAbility(source: CardEntity) {
    await this.abilityManager.executeGlobalAbility(source);
  }


  public finishCounters() {
    if (this.state.currentPhase !== Phase.GAME_OVER) {
      this.updateState({ powerPool: 0, weaknessPool: 0, currentPhase: Phase.RESOLUTION });
      if (this.currentResolvingSealIndex !== -1) this.zoomIn(this.currentResolvingSealIndex);
    }
    this.pendingAbilityData = null;
    // Clear any ability activation highlight on the source card, if present
    if ((this.pendingAbilityData as any)?.source) {
      (this.pendingAbilityData as any).source.data.isActivatingAbility = false;
    }
    if (this.resolutionCallback) this.resolutionCallback();
    this.resolutionCallback = null;
    this.abilityManager.syncBoardPresencePowerMarkers();
  }


  public forceSkip() {
    // Do not skip while a Fallen One nullify choice is active
    if (this.state.instructionText.includes("Use Fallen One from Limbo")) {
      this.addLog("Resolve Fallen One's nullify choice before skipping.");
      return;
    }

    this.addLog("Forcing skip of current interaction...");
    this.isProcessing = false;

    // Clear any ability activation highlight on all cards so glow never lingers after a skip
    const clearActivationGlow = (card: CardEntity | null) => {
      if (card && card.data.isActivatingAbility) {
        card.data.isActivatingAbility = false;
      }
    };
    this.playerBattlefield.forEach(clearActivationGlow);
    this.enemyBattlefield.forEach(clearActivationGlow);
    this.playerHand.forEach(clearActivationGlow);
    this.playerLimbo.forEach(clearActivationGlow);
    this.enemyLimbo.forEach(clearActivationGlow);
    this.seals.forEach(seal => clearActivationGlow(seal.champion));

    this.pendingAbilityData = null;
    
    if (this.resolutionCallback) {
      this.resolutionCallback();
      this.resolutionCallback = null;
    }
    if (this.sealSelectionCallback) {
      this.sealSelectionCallback(-1);
      this.sealSelectionCallback = null;
    }
    if (this.nullifyCallback) {
      this.nullifyCallback(false);
      this.nullifyCallback = null;
    }
    if ((this as any).creatureTypeCallback) {
      (this as any).creatureTypeCallback('');
      (this as any).creatureTypeCallback = null;
    }

    if (this.state.currentPhase !== Phase.GAME_OVER) {
      const nextPhase = this.currentResolvingSealIndex !== -1 ? Phase.RESOLUTION : Phase.PREP;
      this.updateState({ currentPhase: nextPhase, instructionText: '', isSelectingLimboTarget: false });
      if (this.currentResolvingSealIndex !== -1) this.zoomIn(this.currentResolvingSealIndex);
    }

    // If Delta targeting was pending, treat skip as canceling the sacrifice.
    if (this.pendingDeltaSacrificeSource) {
      this.pendingDeltaSacrificeSource.data.pendingDeltaSacrifice = false;
      this.pendingDeltaSacrificeSource = null;
      this.pendingDeltaSacrificeSourceIdx = -1;
    }
  }

  public setSlowMode(enabled: boolean) {
    this.updateState({ slowMode: enabled });
  }

  public setResolutionPaused(paused: boolean) {
    this.updateState({ isResolutionPaused: paused });
  }

  public setCameraView(view: 'combat' | 'starting' | 'hand' | 'board') {
    const duration = 0.8;
    if (view === 'board') {
      gsap.to(this.sceneManager.camera.position, { x: 0, y: 25, z: 0.1, duration, ease: "power2.inOut" });
      gsap.to(this.sceneManager.cameraTarget, { x: 0, y: 0, z: 0, duration, ease: "power2.inOut" });
    } else if (view === 'hand') {
      gsap.to(this.sceneManager.camera.position, { x: 0, y: 10, z: 18, duration, ease: "power2.inOut" });
      gsap.to(this.sceneManager.cameraTarget, { x: 0, y: 0, z: 12, duration, ease: "power2.inOut" });
    } else { // combat
      gsap.to(this.sceneManager.camera.position, { x: 0, y: 28, z: 32, duration, ease: "power2.inOut" });
      gsap.to(this.sceneManager.cameraTarget, { x: 0, y: 0, z: -2, duration, ease: "power2.inOut" });
    }
  }

  public async handleBattle(attacker: CardEntity, defender: CardEntity, idx: number, isAgainstChamp: boolean): Promise<boolean> {
    return await this.phaseManager.handleBattle(attacker, defender, idx, isAgainstChamp);
  }

  public showCombatDamageFloats(
    attacker: CardEntity,
    defender: CardEntity,
    attackerPower: number,
    defenderPower: number
  ): void {
    scheduleCombatExchangeFloats(this.sceneManager.scene, attacker, defender, attackerPower, defenderPower);
  }

  public clearPrepUndoStack(): void {
    this.prepUndoStack = [];
  }

  /** Prep only: stack undo, or clear hand selection / Baron swap pick. */
  public canUndoPrep(): boolean {
    return (
      this.state.currentPhase === Phase.PREP &&
      !this.isProcessing &&
      (this.prepUndoStack.length > 0 ||
        this.activeSelection !== null)
    );
  }

  public realignPlayerHand(duration = 0.5) {
    this.playerHand.forEach((card, i) => {
      tweenPlayerHandCardToPrepPose(card, i, this.playerHand.length, this.sceneManager.camera, duration);
    });
  }

  private handleResize() {
    if (this.state.currentPhase === Phase.PREP) {
      this.realignPlayerHand(0);
    }
  }

  public undoLastPrepAction(): void {
    if (this.state.currentPhase !== Phase.PREP) {
      this.addLog('Undo is only available during Prep.');
      return;
    }
    if (this.isProcessing) return;

    if (this.prepUndoStack.length > 0) {
      const entry = this.prepUndoStack.pop()!;
      executePrepUndoEntry(this, entry);
      this.addLog('Undid last Prep action.');
      return;
    }



    if (this.activeSelection !== null) {
      this.clearCardHoverLiftTarget();
      this.activeSelection = null;
      this.updateState({});
    }
  }

  public destroyCard(card: CardEntity, isEnemy: boolean, idx: number, isAgainstChamp: boolean = false, killedBy?: { cardName: string; cause: 'combat' | 'ability' }) {
    if (killedBy) {
      const msg = killedBy.cause === 'combat'
        ? `${card.data.name} was killed by ${killedBy.cardName} (combat damage).`
        : `${card.data.name} was destroyed by ${killedBy.cardName}'s ability.`;
      this.addLog(msg);
    }
    this.abilityManager.stripBoardPresencePowerFromCard(card);
    card.data.powerMarkers = 0;
    card.data.weaknessMarkers = 0;
    card.updateVisualMarkers();
    const limbo = isEnemy ? this.enemyLimbo : this.playerLimbo;
    const mesh = isEnemy ? this.enemyLimboMesh : this.playerLimboMesh;
    limbo.push(card);
    // Card should remain visible/interactive in Limbo/Graveyard, so do not dispose it here.
    card.data.isActivatingAbility = false;
    
    if (isAgainstChamp) {
      this.seals[idx].champion = null;
    } else {
      if (isEnemy) this.enemyBattlefield[idx] = null;
      else this.playerBattlefield[idx] = null;
    }



    const destX = mesh.position.x + (Math.random() - 0.5);
    const destY = 0.2 + (limbo.length * 0.05);
    const destZ = mesh.position.z + (Math.random() - 0.5);
    const destRotY = Math.random() * 0.5;

    (card as any).setOpacity(1);
    card.mesh.scale.set(1, 1, 1);

    // Explode (scale up + fade out), travel to Limbo position, then reform (scale from tiny + fade in).
    const opacityState = { value: 1 };
    const fadeTo = (value: number) => {
      opacityState.value = value;
      (card as any).setOpacity(opacityState.value);
    };
    fadeTo(1);

    this.abilityManager.syncBoardPresencePowerMarkers();

    const tl = gsap.timeline({
      onComplete: () => this.updateLimboGraveyardVisibility()
    });

    // Explode + fade out at current position
    tl.to(card.mesh.scale, { x: 1.65, y: 1.65, z: 1.65, duration: 0.18, ease: 'power2.out' }, 0);
    tl.to(opacityState, {
      value: 0,
      duration: 0.14,
      ease: 'power2.in',
      onUpdate: () => fadeTo(opacityState.value)
    }, 0);

    // Travel to Limbo while invisible
    tl.to(card.mesh.position, { x: destX, y: destY, z: destZ, duration: 0.36, ease: 'power2.inOut' }, 0.07);
    tl.to(card.mesh.rotation, { x: 0, y: destRotY, z: 0, duration: 0.36, ease: 'power2.inOut' }, 0.07);

    // Reform: tiny then scale up with a pop
    tl.add(() => {
      card.mesh.scale.set(0.01, 0.01, 0.01);
      fadeTo(0);
    }, '>');

    tl.to(card.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.32, ease: 'back.out(1.6)' }, '>');
    tl.to(opacityState, {
      value: 1,
      duration: 0.26,
      ease: 'power2.out',
      onUpdate: () => fadeTo(opacityState.value)
    }, '>');
  }

  public async claimSeal(
    idx: number,
    status: Alignment,
    cause?: { type: 'combat' | 'ability'; cardName: string }
  ): Promise<void> {
    if (this.state.lockedSealIndex === idx) {
      this.addLog(`Seal ${idx + 1} is locked and cannot be changed.`);
      return;
    }
    // Luna: Final Act: Only when Seal has no Champion; optional — you may move Luna to Graveyard to nullify.
    const sealWithoutChampion = !this.seals[idx].champion;
    const lunaCard = sealWithoutChampion
      ? [...this.playerLimbo, ...this.enemyLimbo].find(c => c.data.name === "Luna" && c.data.isEnemy !== (status === Alignment.DARK))
      : null;
    if (lunaCard) {
      const isEnemyLuna = lunaCard.data.isEnemy;
      if (isEnemyLuna) {
        const pAlign = this.state.playerAlignment;
        const eAlign = pAlign === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
        if (shouldEnemyUseLuna(idx, status, this.seals, pAlign, eAlign)) {
          this.abilityManager.moveToGraveyard(lunaCard);
          this.addLog(`Enemy uses Luna from Limbo to nullify the influence change.`);
          return;
        }
      } else {
        this.updateState({
          decisionContext: 'LUNA_NULLIFY',
          instructionText: 'Use Luna from Limbo to nullify this influence change? (Luna moves to Graveyard)',
          decisionMessage: 'Your opponent is changing a Seal\'s influence. Use Luna from your Limbo to nullify this? (Luna is moved to your Graveyard.)'
        });
        const useLuna = await new Promise<boolean>(resolve => { (this as any).nullifyCallback = resolve; });
        this.updateState({ decisionContext: undefined, decisionMessage: undefined });
        if (useLuna) {
          this.abilityManager.moveToGraveyard(lunaCard);
          this.addLog(`Luna is moved to the Graveyard to nullify the influence change.`);
          return;
        }
      }
    }

    // Valtarious: Passive: Prevents Purified Seals from being Corrupted while in play.
    // Exception: Desire's explicit player choice to corrupt is allowed (Desire's "influence seal dark" option).
    if (status === Alignment.DARK) {
      const hasValtarious = [...this.playerBattlefield, ...this.seals.map(s => s.champion)].some(c => c && c.data.name === "Valtarious");
      const isDesireChoice = cause?.cardName === 'Desire';
      if (hasValtarious && this.seals[idx].alignment === Alignment.LIGHT && !isDesireChoice) return;
    }

    const previousAlignment = this.seals[idx].alignment;
    const willChange = previousAlignment !== status;
    if (willChange && (status === Alignment.LIGHT || status === Alignment.DARK) && cause) {
      const verb = status === Alignment.LIGHT ? 'Purified' : 'Corrupted';
      this.addLog(`Seal ${idx + 1} ${verb} by ${cause.type} (card: ${cause.cardName}).`);
    }
    this.seals[idx].setAlignment(status);
    this.updateGlobalScores();
  }

  private updateGlobalScores() {
    const pAlign = this.state.playerAlignment;
    const eAlign = pAlign === Alignment.LIGHT ? Alignment.DARK : Alignment.LIGHT;
    this.state.playerScore = this.seals.filter(s => s.alignment === pAlign).length;
    this.state.enemyScore = this.seals.filter(s => s.alignment === eAlign).length;

    // Win Con: Activate with 7 Seals
    if (this.state.playerScore >= 7) {
      this.phaseManager.finalizeGame();
    } else if (this.state.enemyScore >= 7) {
      this.phaseManager.finalizeGame();
    }

    this.updateState({});
  }

  private handleMouseMove(event: MouseEvent | PointerEvent) {
    if (this.draggedMarker && this.draggedMarkerType) {
      const ray = this.inputHandler.raycaster.ray;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.4); // float y = 0.4
      const intersectPoint = new THREE.Vector3();
      
      const sealChampions = this.seals.map(s => s.champion).filter((c): c is CardEntity => c !== null);
      const allBoardCards = [...this.playerBattlefield, ...this.enemyBattlefield, ...sealChampions].filter(c => c !== null) as CardEntity[];
      
      let hoveredCard: CardEntity | null = null;
      
      if (ray.intersectPlane(plane, intersectPoint)) {
        this.draggedMarker.position.copy(intersectPoint);
        
        // Find closest card within generous distance (2.0 units) on XZ plane
        let minDistance = 2.0;
        for (const card of allBoardCards) {
          const cardPos = card.mesh.position;
          const dx = intersectPoint.x - cardPos.x;
          const dz = intersectPoint.z - cardPos.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < minDistance) {
            minDistance = dist;
            hoveredCard = card;
          }
        }
      }

      if (hoveredCard !== this.hoveredMarkerCard) {
        if (this.hoveredMarkerCard) {
          this.hoveredMarkerCard.resetHoverLift(0.2);
        }
        if (hoveredCard) {
          const liftY = 0.3 * hoveredCard.getHoverLiftWorldUpSign();
          hoveredCard.tweenHoverLift(liftY, 0.2, 'power2.out', false);
        }
        this.hoveredMarkerCard = hoveredCard;
      }
      return;
    }

    if (this.state.draggingCard) {
      this.updateState({ dragPosition: { x: event.clientX, y: event.clientY } });

      // Highlight slot/seal being dragged over
      const ray = this.inputHandler.raycaster.ray;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersectPoint = new THREE.Vector3();
      let hoveredSlot: THREE.Mesh | null = null;

      if (ray.intersectPlane(plane, intersectPoint)) {
        let closestSlotMesh: THREE.Mesh | null = null;
        let minDist = 2.0; // Tightened detection radius (weighted) to require drag closer to slot
        this.slotMeshes.forEach(slot => {
          if (slot.position.z > 0.5) {
            const dx = intersectPoint.x - slot.position.x;
            const dz = intersectPoint.z - slot.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz * 0.16); // Weighted: Z has 0.4x weight
            if (dist < minDist) {
              minDist = dist;
              closestSlotMesh = slot;
            }
          }
        });
        hoveredSlot = closestSlotMesh;
      }

      if (hoveredSlot !== this.highlightedSlotMesh) {
        if (this.highlightedSlotMesh) {
          const defaultColors = ENV_THEME_COLORS[this.currentTheme];
          const mat = this.highlightedSlotMesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(defaultColors.slotFill);
          mat.opacity = defaultColors.slotOpacity;

          // Reset the highlighted seal as well
          const oldSlotIdx = this.highlightedSlotMesh.userData.slotIndex;
          if (oldSlotIdx >= 0 && oldSlotIdx < this.seals.length) {
            this.seals[oldSlotIdx].setHoverHighlight(false, false);
          }
        }
        if (hoveredSlot) {
          const slotIdx = hoveredSlot.userData.slotIndex;
          const isOccupied = !!this.playerBattlefield[slotIdx];
          const mat = hoveredSlot.material as THREE.MeshBasicMaterial;
          if (!isOccupied) {
            mat.color.setHex(0x00f2ff); // Cyan for valid
            mat.opacity = 0.8;
          } else {
            mat.color.setHex(0xff0044); // Red/pink for invalid (occupied)
            mat.opacity = 0.8;
          }
          this.highlightedSlotMesh = hoveredSlot;

          // Highlight the corresponding seal
          if (slotIdx >= 0 && slotIdx < this.seals.length) {
            this.seals[slotIdx].setHoverHighlight(true, !isOccupied);
          }
        } else {
          this.highlightedSlotMesh = null;
        }
      }
    }

    // When a decision or targeting prompt is active, still allow card hover preview but don't overwrite instruction text
    const promptActive = !!this.state.decisionContext ||
      this.state.currentPhase === Phase.ABILITY_TARGETING ||
      this.state.currentPhase === Phase.SEAL_TARGETING ||
      this.state.currentPhase === Phase.COUNTER_ALLOCATION ||
      this.state.currentPhase === Phase.DELTA_BUFF_TARGETING;

    const sealChampions = this.seals.map(s => s.champion).filter((c): c is CardEntity => c !== null);
    const allCards = [...this.playerHand, ...this.playerBattlefield, ...this.enemyBattlefield, ...this.playerLimbo, ...this.enemyLimbo, ...sealChampions].filter(c => c !== null) as CardEntity[];
    const intersects = this.inputHandler.raycaster.intersectObjects(allCards.map(c => c.mesh), true);

    if (intersects.length > 0) {
      const card = this.findCardEntityFromObject(intersects[0].object, allCards);
      if (!this.sealCameraZoomedIn) {
        this.updateCardHoverLift(card ?? null);
      }
      if (card && this.selectedObject !== card) {
        this.selectedObject = card;
        const isSecret = card.data.isEnemy && !card.data.faceUp;
        const hovered: HoveredCardInfo = isSecret ? {
          name: 'Face Down Card',
          faction: 'Unknown',
          power: 0,
          type: 'Unknown',
          isChampion: false,
          ability: 'This card is face down.',
          powerMarkers: 0,
          weaknessMarkers: 0,
          faceArtPath: CARD_BACK_PATH
        } : {
          name: card.data.name,
          faction: card.data.faction,
          power: card.data.power,
          type: card.data.type,
          isChampion: card.data.isChampion,
          ability: card.data.ability,
          powerMarkers: card.data.powerMarkers,
          weaknessMarkers: card.data.weaknessMarkers,
          faceArtPath: CARD_ART_PATHS[card.data.name]
        };
        if (promptActive) {
          this.updateState({ hoveredCard: hovered, hoveredZone: null });
        } else {
          this.updateState({
            instructionText: isSecret ? 'Face Down Card' : `${card.data.name}: ${card.data.ability}`,
            hoveredCard: hovered,
            hoveredZone: null
          });
        }
      }
    } else {
      if (!this.sealCameraZoomedIn) {
        this.updateCardHoverLift(null);
      }
      const zoneMeshes = this.zoneHoverMeshes.map((z) => z.mesh);
      const zoneIntersects = this.inputHandler.raycaster.intersectObjects(zoneMeshes);
      let hoveredZone: GameState['hoveredZone'] = null;
      if (zoneIntersects.length > 0) {
        const hitMesh = zoneIntersects[0].object as THREE.Mesh;
        const entry = this.zoneHoverMeshes.find((z) => z.mesh === hitMesh);
        if (entry) {
          hoveredZone = { zone: entry.zone, count: this.getZoneCount(entry.zone) };
        }
      }
      this.selectedObject = null;
      this.updateState({ hoveredCard: null, hoveredZone });
    }
  }

  /** Walk parents until we find a card root mesh in the given list. */
  private findCardEntityFromObject(obj: THREE.Object3D | null, cards: CardEntity[]): CardEntity | null {
    let o: THREE.Object3D | null = obj;
    while (o) {
      const hit = cards.find((c) => c.mesh === o);
      if (hit) return hit;
      o = o.parent;
    }
    return null;
  }

  /** Local Y on CardEntity.visualLiftRoot: hand (tilted) vs flat table vs limbo pile. */
  private static readonly HOVER_LIFT_HAND = 0.52;
  /** Magnitude for table/limbo; sign from live mesh rotation (see CardEntity.getHoverLiftWorldUpSign). */
  private static readonly HOVER_LIFT_TABLE_MAG = 0.22;
  private static readonly HOVER_LIFT_LIMBO_MAG = 0.14;

  /** Desired visualLiftRoot.position.y for hover (hand uses fixed lift; board/limbo follow quaternion). */
  private computeHoverLocalY(card: CardEntity): number {
    if (this.playerHand.includes(card)) {
      return GameController.HOVER_LIFT_HAND;
    }
    const mag = this.playerLimbo.includes(card)
      ? GameController.HOVER_LIFT_LIMBO_MAG
      : GameController.HOVER_LIFT_TABLE_MAG;
    return mag * card.getHoverLiftWorldUpSign();
  }

  private updateCardHoverLift(hovered: CardEntity | null) {
    const sealChampions = this.seals.map((s) => s.champion).filter((c): c is CardEntity => c !== null);
    const liftCandidates: CardEntity[] = [
      ...this.playerHand,
      ...this.playerBattlefield.filter((c): c is CardEntity => c !== null),
      ...this.enemyBattlefield.filter((c): c is CardEntity => c !== null),
      ...sealChampions,
      ...this.playerLimbo,
    ];

    const eligible =
      hovered &&
      liftCandidates.includes(hovered) &&
      hovered !== this.activeSelection;

    const nextTarget = eligible ? hovered : null;

    if (!nextTarget) {
      if (this.cardHoverLiftTarget) {
        this.cardHoverLiftTarget.resetHoverLift(0.24);
        this.cardHoverLiftTarget = null;
      }
      return;
    }

    const desiredY = this.computeHoverLocalY(nextTarget);

    if (this.cardHoverLiftTarget !== nextTarget) {
      if (this.cardHoverLiftTarget) {
        this.cardHoverLiftTarget.resetHoverLift(0.24);
      }
      this.cardHoverLiftTarget = nextTarget;
      const isHand = this.playerHand.includes(nextTarget);
      nextTarget.tweenHoverLift(desiredY, 0.3, 'power2.out', isHand);
      return;
    }

    // Same card still hovered: rotation may change during flip / haste reveal while `faceUp` lags — retarget lift.
    const curY = nextTarget.getVisualLiftLocalY();
    if (Math.abs(desiredY - curY) > 0.025) {
      const isHand = this.playerHand.includes(nextTarget);
      nextTarget.tweenHoverLift(desiredY, 0.14, 'power2.out', isHand);
    }
  }

  private clearCardHoverLiftTarget() {
    if (this.cardHoverLiftTarget) {
      this.cardHoverLiftTarget.resetHoverLift(0.22);
      this.cardHoverLiftTarget = null;
    }
  }

  private getZoneCount(zone: 'playerLimbo' | 'enemyLimbo' | 'playerGraveyard' | 'enemyGraveyard'): number {
    switch (zone) {
      case 'playerLimbo': return this.playerLimbo.length;
      case 'enemyLimbo': return this.enemyLimbo.length;
      case 'playerGraveyard': return this.playerGraveyard.length;
      case 'enemyGraveyard': return this.enemyGraveyard.length;
    }
  }

  private handleLongPress(event: MouseEvent | PointerEvent) {
    // Handled immediately in handleMouseDown to enable responsive tap-and-drag.
  }

  private handleMouseUp(event: MouseEvent | PointerEvent) {
    if (this.draggedMarker && this.draggedMarkerType) {
      const type = this.draggedMarkerType;
      const markerMesh = this.draggedMarker;
      const card = this.hoveredMarkerCard;

      if (card) {
        if (type === 'power') {
          card.data.powerMarkers++;
          if (this.draggedFromCard === null) {
            this.updateState({ powerPool: this.state.powerPool - 1 });
          }
        } else {
          card.data.weaknessMarkers++;
          if (this.draggedFromCard === null) {
            this.updateState({ weaknessPool: this.state.weaknessPool - 1 });
          }
        }
        card.updateVisualMarkers();
        this.addLog(`Placed ${type} marker on ${card.data.name}.`);

        this.sceneManager.scene.remove(markerMesh);
      } else {
        if (this.draggedFromCard) {
          this.addLog(`Discarded ${type} marker from table.`);
          if (type === 'power') {
            this.updateState({ powerPool: this.state.powerPool + 1 });
          } else {
            this.updateState({ weaknessPool: this.state.weaknessPool + 1 });
          }
          gsap.to(markerMesh.scale, {
            x: 0.01,
            y: 0.01,
            z: 0.01,
            duration: 0.25,
            onComplete: () => {
              this.sceneManager.scene.remove(markerMesh);
            }
          });
        } else {
          this.syncPoolMarkerMeshes();
          gsap.to(markerMesh.scale, {
            x: 0.01,
            y: 0.01,
            z: 0.01,
            duration: 0.35,
            onComplete: () => {
              this.sceneManager.scene.remove(markerMesh);
            }
          });
        }
      }

      if (this.hoveredMarkerCard) {
        this.hoveredMarkerCard.resetHoverLift(0.2);
      }

      this.draggedMarker = null;
      this.draggedMarkerType = null;
      this.draggedFromCard = null;
      this.hoveredMarkerCard = null;
      return;
    }

    if (this.state.draggingCard && this.activeSelection) {
      // Restore opacity
      this.activeSelection.setOpacity(1.0);

      // Reset highlighted slot and seal if any
      if (this.highlightedSlotMesh) {
        const defaultColors = ENV_THEME_COLORS[this.currentTheme];
        const mat = this.highlightedSlotMesh.material as THREE.MeshBasicMaterial;
        mat.color.setHex(defaultColors.slotFill);
        mat.opacity = defaultColors.slotOpacity;

        const slotIdx = this.highlightedSlotMesh.userData.slotIndex;
        if (slotIdx >= 0 && slotIdx < this.seals.length) {
          this.seals[slotIdx].setHoverHighlight(false, false);
        }

        this.highlightedSlotMesh = null;
      }

      const slotIntersects = this.inputHandler.raycaster.intersectObjects(this.slotMeshes);
      const playerSlotIntersect = slotIntersects.find(i => i.object.position.z > 0.5);

      let targetIdx = -1;
      if (playerSlotIntersect) {
        targetIdx = playerSlotIntersect.object.userData.slotIndex;
      } else {
        // Lenient proximity check if direct intersection missed on emulator
        const ray = this.inputHandler.raycaster.ray;
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        if (ray.intersectPlane(plane, intersectPoint)) {
          let closestSlot = -1;
          let minDist = 2.0; // Tightened detection radius (weighted) to require drag closer to slot
          this.slotMeshes.forEach(slot => {
            if (slot.position.z > 0.5) {
              const dx = intersectPoint.x - slot.position.x;
              const dz = intersectPoint.z - slot.position.z;
              const dist = Math.sqrt(dx * dx + dz * dz * 0.16); // Weighted: Z has 0.4x weight
              if (dist < minDist) {
                minDist = dist;
                closestSlot = slot.userData.slotIndex;
              }
            }
          });
          targetIdx = closestSlot;
        }
      }

      if (targetIdx >= 0 && targetIdx < GAME_CONSTANTS.SEVEN && !this.playerBattlefield[targetIdx]) {
        const card = this.activeSelection;
        this.addLog(`Player places ${card.data.name} at Seal ${targetIdx + 1}`);
        this.playerHand = this.playerHand.filter(c => c !== card);
        this.playerBattlefield[targetIdx] = card;
        card.resetHoverLift(0.06);
        this.realignPlayerHand(0.4);
        gsap.to(card.mesh.position, {
          x: (targetIdx - 3) * GAME_CONSTANTS.SLOT_SPACING,
          y: 0.1,
          z: 3.2,
          duration: 0.5
        });
        gsap.to(card.mesh.rotation, { x: Math.PI, y: 0, z: 0, duration: 0.5 });
        card.applyBackTextureIfNeeded();
        this.prepUndoStack.push({ type: 'place', slotIndex: targetIdx, card });
        this.abilityManager.syncBoardPresencePowerMarkers();
      }
      this.activeSelection = null;
      this.updateState({ draggingCard: null, dragPosition: null });
    }
  }

  private async handleMouseDown(event: MouseEvent | PointerEvent) {
    if (this.state.currentPhase === Phase.GAME_OVER) return;

    // Only allow marker dragging during PREP or COUNTER_ALLOCATION phases
    const isMarkerDragAllowed = this.state.currentPhase === Phase.PREP || this.state.currentPhase === Phase.COUNTER_ALLOCATION;
    const sealChampions = this.seals.map(s => s.champion).filter((c): c is CardEntity => c !== null);
    const allBoardCards = [...this.playerBattlefield, ...this.enemyBattlefield, ...sealChampions].filter(c => c !== null) as CardEntity[];

    if (isMarkerDragAllowed) {
      const poolMeshes = this.poolMarkerMeshes.map(pm => pm.mesh);
      const markerMeshesToTest: THREE.Object3D[] = [];
      allBoardCards.forEach(c => {
        markerMeshesToTest.push(...c.getMarkerMeshes());
      });

      // Add full card meshes and pool markers to make selecting them much easier
      const dragTargets = [...poolMeshes, ...markerMeshesToTest, ...allBoardCards.map(c => c.mesh)];
      const markerIntersects = this.inputHandler.raycaster.intersectObjects(dragTargets, true);

      if (markerIntersects.length > 0) {
        const hitObj = markerIntersects[0].object;
        let type: 'power' | 'weakness' | null = null;
        let fromCard: CardEntity | null = null;

        // 1. Check if we hit any part of the floating pool markers
        let clickedPoolMarker: { mesh: THREE.Object3D; type: 'power' | 'weakness' } | null = null;
        let currentObj: THREE.Object3D | null = hitObj;
        while (currentObj) {
          const match = this.poolMarkerMeshes.find(pm => pm.mesh === currentObj);
          if (match) {
            clickedPoolMarker = match;
            break;
          }
          currentObj = currentObj.parent;
        }

        if (clickedPoolMarker) {
          type = clickedPoolMarker.type;
          fromCard = null;
          
          this.sceneManager.scene.remove(clickedPoolMarker.mesh);
          const pmIdx = this.poolMarkerMeshes.indexOf(clickedPoolMarker);
          if (pmIdx !== -1) {
            this.poolMarkerMeshes.splice(pmIdx, 1);
          }
        } else {
          // 2. Check if we clicked directly on or within a card
          for (const card of allBoardCards) {
            let markerType = card.hitTestMarkers(hitObj);
            
            // Generous check: if clicked on the card itself, lift an existing marker
            if (!markerType) {
              let isCardHit = false;
              let tempObj: THREE.Object3D | null = hitObj;
              while (tempObj) {
                if (tempObj === card.mesh) {
                  isCardHit = true;
                  break;
                }
                tempObj = tempObj.parent;
              }
              if (isCardHit) {
                if (card.data.powerMarkers > 0 && card.data.weaknessMarkers === 0) {
                  markerType = 'power';
                } else if (card.data.weaknessMarkers > 0 && card.data.powerMarkers === 0) {
                  markerType = 'weakness';
                } else if (card.data.powerMarkers > 0 && card.data.weaknessMarkers > 0) {
                  const intersection = markerIntersects.find(i => i.object === hitObj || card.mesh.getObjectById(i.object.id));
                  if (intersection) {
                    const localPoint = card.mesh.worldToLocal(intersection.point.clone());
                    // Left half = Power, Right half = Weakness
                    markerType = localPoint.x < 0 ? 'power' : 'weakness';
                  } else {
                    markerType = 'power';
                  }
                }
              }
            }

            if (markerType) {
              type = markerType;
              fromCard = card;
              break;
            }
          }
        }

        if (type) {
          this.clearCardHoverLiftTarget();
          if (fromCard) {
            if (type === 'power') {
              fromCard.data.powerMarkers = Math.max(0, fromCard.data.powerMarkers - 1);
            } else {
              fromCard.data.weaknessMarkers = Math.max(0, fromCard.data.weaknessMarkers - 1);
            }
            fromCard.updateVisualMarkers();
            this.addLog(`Player picked up a ${type} marker from ${fromCard.data.name}.`);
          } else {
            this.addLog(`Player picked up a new ${type} marker.`);
          }

          this.draggedMarkerType = type;
          this.draggedFromCard = fromCard;
          this.draggedMarker = this.createDraggedMarker(type);

          const ray = this.inputHandler.raycaster.ray;
          const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.4);
          const intersectPoint = new THREE.Vector3();
          if (ray.intersectPlane(plane, intersectPoint)) {
            this.draggedMarker.position.copy(intersectPoint);
          } else {
            this.draggedMarker.position.set(fromCard ? fromCard.mesh.position.x : (type === 'power' ? -2.2 : 2.2), 0.4, fromCard ? fromCard.mesh.position.z : 4.8);
          }

          this.sceneManager.scene.add(this.draggedMarker);
          return;
        }
      }
    }

    if (this.state.currentPhase === Phase.PREP) {
      const limboIntersects = this.inputHandler.raycaster.intersectObjects(this.playerLimbo.map(c => c.mesh), true);
      if (limboIntersects.length > 0) {
        const card = this.findCardEntityFromObject(limboIntersects[0].object, this.playerLimbo);
        if (card && card.data.hasLimboAbility) {
          this.abilityManager.handleLimboAbility(card);
          return;
        }
      }

      // Drag and drop handles hand selection; start dragging immediately on pointer/mouse down!
      const handIntersects = this.inputHandler.raycaster.intersectObjects(this.playerHand.map(c => c.mesh), true);
      if (handIntersects.length > 0) {
        const picked = this.findCardEntityFromObject(handIntersects[0].object, this.playerHand);
        if (picked) {
          this.clearCardHoverLiftTarget();
          this.activeSelection = picked;
          picked.setOpacity(0.4);
          this.updateState({
            draggingCard: this.cardToHoveredInfo(picked),
            dragPosition: { x: event.clientX, y: event.clientY }
          });
        }
        return;
      }


    } else if (this.state.currentPhase === Phase.COUNTER_ALLOCATION) {
      const allBoard = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter(c => c !== null && c.data.faceUp) as CardEntity[];
      const intersects = this.inputHandler.raycaster.intersectObjects(allBoard.map(c => c.mesh), true);
      if (intersects.length > 0) {
        const card = this.findCardEntityFromObject(intersects[0].object, allBoard);
        if (card) {
          if (this.pendingAbilityData && this.pendingAbilityData.source && this.isImmuneToAbilities(card, this.pendingAbilityData.source)) {
            this.addLog(`${card.data.name} is immune to markers from ${this.pendingAbilityData.source.data.name}`);
            return;
          }
          if (this.state.powerPool > 0) {
            card.data.powerMarkers++;
            this.updateState({ powerPool: this.state.powerPool - 1 });
          } else if (this.state.weaknessPool > 0) {
            card.data.weaknessMarkers++;
            this.updateState({ weaknessPool: this.state.weaknessPool - 1 });
          }
          card.updateVisualMarkers();
        }
      }
    } else if (this.state.currentPhase === Phase.DELTA_BUFF_TARGETING) {
      const allBoard = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter(c => c !== null && c.data.faceUp) as CardEntity[];
      const intersects = this.inputHandler.raycaster.intersectObjects(allBoard.map(c => c.mesh), true);
      if (intersects.length > 0) {
        const card = this.findCardEntityFromObject(intersects[0].object, allBoard);
        if (card) {
          card.data.powerMarkers += 3;
          card.updateVisualMarkers();
          this.addLog(`${card.data.name} receives +3 Power Markers from Delta's sacrifice.`);

          // Execute the sacrifice after the player picks the +3 recipient.
          const deltaSource = this.pendingDeltaSacrificeSource;
          const deltaIdx = this.pendingDeltaSacrificeSourceIdx;
          this.pendingDeltaSacrificeSource = null;
          this.pendingDeltaSacrificeSourceIdx = -1;
          if (deltaSource) {
            deltaSource.data.pendingDeltaSacrifice = false;
            const isEnemy = deltaSource.data.isEnemy;
            const actualIdx = deltaIdx >= 0
              ? deltaIdx
              : isEnemy
                ? this.enemyBattlefield.indexOf(deltaSource)
                : this.playerBattlefield.indexOf(deltaSource);
            if (actualIdx >= 0) {
              this.destroyCard(deltaSource, isEnemy, actualIdx, false);
            }
          }

          this.updateState({ currentPhase: Phase.RESOLUTION, instructionText: '' });
          if (this.resolutionCallback) this.resolutionCallback();
          this.resolutionCallback = null;
        }
      }
    } else if (this.state.currentPhase === Phase.ABILITY_TARGETING) {
      const forSentinel = this.pendingAbilityData?.effect === 'sentinel_absorb';
      const forSaintMichael = this.pendingAbilityData?.effect === 'saint_michael_destroy';
      const forChampion = this.pendingAbilityData?.targetType === 'champion';
      let allBoard: CardEntity[];
      if (this.pendingAbilityData?.validTargets?.length) {
        allBoard = this.pendingAbilityData.validTargets as CardEntity[];
      } else if (forSentinel) {
        allBoard = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion), ...this.playerLimbo, ...this.enemyLimbo].filter(c => c !== null) as CardEntity[];
      } else if (forChampion) {
        allBoard = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter(c => c !== null && c.data.faceUp && c.data.isChampion) as CardEntity[];
      } else {
        allBoard = [...this.playerBattlefield, ...this.enemyBattlefield, ...this.seals.map(s => s.champion)].filter(c => c !== null && c.data.faceUp) as CardEntity[];
        // Include cards at the current seal that were just revealed (not yet faceUp) so they can be targeted (e.g. Famine destroying Herald)
        if (this.currentResolvingSealIndex >= 0 && this.currentResolvingSealIndex < this.playerBattlefield.length) {
          const p = this.playerBattlefield[this.currentResolvingSealIndex];
          const e = this.enemyBattlefield[this.currentResolvingSealIndex];
          if (p && !allBoard.includes(p)) allBoard = [...allBoard, p];
          if (e && !allBoard.includes(e)) allBoard = [...allBoard, e];
        }
      }
      const intersects = this.inputHandler.raycaster.intersectObjects(allBoard.map(c => c.mesh), true);
      if (intersects.length > 0) {
        const card = this.findCardEntityFromObject(intersects[0].object, allBoard);
        if (card) {
          if (forSentinel && !this.playerLimbo.includes(card) && !this.enemyLimbo.includes(card)) return; // Sentinel must target Limbo
          if (forChampion && !card.data.isChampion) return; // Lord must target Champion
          const isMetatronSelect = this.pendingAbilityData?.effect === 'metatron_select_type';
          this.abilityManager.applyAbilityEffect(card, this.pendingAbilityData);
          if (!isMetatronSelect) {
            const phaseAfterEffect = this.state.currentPhase as Phase;
            if (phaseAfterEffect !== Phase.GAME_OVER) {
              const nextPhase = this.currentResolvingSealIndex !== -1 ? Phase.RESOLUTION : Phase.PREP;
              this.updateState({ currentPhase: nextPhase, instructionText: '', isSelectingLimboTarget: false });
              if (this.currentResolvingSealIndex !== -1) this.zoomIn(this.currentResolvingSealIndex);
            }
            this.pendingAbilityData = null;
            if (this.resolutionCallback) this.resolutionCallback();
            this.resolutionCallback = null;
          }
        }
      }
    } else if (this.state.currentPhase === Phase.SEAL_TARGETING) {
      const sealMeshes = this.seals.map(s => s.mesh);
      const intersects = this.inputHandler.raycaster.intersectObjects(sealMeshes);
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const seal = this.seals.find(s => s.mesh === mesh);
        if (seal) {
          if (this.sealSelectionCallback) {
            this.sealSelectionCallback(seal.index);
            this.sealSelectionCallback = null;
            const nextPhase = this.currentResolvingSealIndex !== -1 ? Phase.RESOLUTION : Phase.PREP;
            this.updateState({ currentPhase: nextPhase });
            return;
          }
          if (!seal.champion) {
            if (this.pendingAbilityData.corruptOnly && seal.alignment !== Alignment.DARK) {
              this.addLog("The Almighty can only Purify a Corrupted (Dark) Seal.");
              return;
            }
            await this.claimSeal(seal.index, this.pendingAbilityData.effect, {
              type: 'ability',
              cardName: this.pendingAbilityData.source.data.name
            });
            const phaseAfterClaim = this.state.currentPhase as Phase;
            if (phaseAfterClaim !== Phase.GAME_OVER) {
              const nextPhase = this.currentResolvingSealIndex !== -1 ? Phase.RESOLUTION : Phase.PREP;
              this.updateState({ currentPhase: nextPhase, instructionText: '' });
              if (this.currentResolvingSealIndex !== -1) this.zoomIn(this.currentResolvingSealIndex);
            }
            if (this.resolutionCallback) this.resolutionCallback();
            this.resolutionCallback = null;
          }
        }
      }
    }
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));
    const time = Date.now() * 0.001;

    // Synchronize locked status to SealEntities
    const lockedIdx = this.state.lockedSealIndex ?? -1;
    this.seals.forEach((seal, idx) => {
      seal.setLocked(idx === lockedIdx);
    });

    // Ensure side reservoirs are hidden
    if (this.powerReservoirMesh) this.powerReservoirMesh.visible = false;
    if (this.weaknessReservoirMesh) this.weaknessReservoirMesh.visible = false;

    // Orbit and bob pool markers behind card
    if (this.state.currentPhase === Phase.COUNTER_ALLOCATION && this.abilitySourceCard && this.poolMarkerMeshes.length > 0) {
      const N = this.poolMarkerMeshes.length;
      const localOffset = new THREE.Vector3(0, 0.6, -1.8);
      const center = localOffset.applyMatrix4(this.abilitySourceCard.mesh.matrixWorld);
      
      const speed = 1.5;
      const radius = 1.1;

      this.poolMarkerMeshes.forEach((item, i) => {
        const angle = time * speed + (i * 2 * Math.PI) / N;
        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(time * 3.0 + i) * 0.15;
        const z = center.z + Math.sin(angle) * radius;
        item.mesh.position.set(x, y, z);
        
        if (item.type === 'power') {
          item.mesh.rotation.y = time * 2.0;
        } else {
          item.mesh.rotation.x = time * 1.5;
          item.mesh.rotation.y = time * 2.5;
        }
      });
    }

    // Animate Dragged Marker
    if (this.draggedMarker && this.draggedMarkerType) {
      if (this.draggedMarkerType === 'power') {
        const orbScale = 1.1 + Math.sin(time * 8.0) * 0.15;
        this.draggedMarker.scale.set(orbScale, orbScale, orbScale);
      } else {
        const jitter = 0.85 + Math.random() * 0.4;
        this.draggedMarker.scale.set(jitter, jitter, jitter);
        this.draggedMarker.rotation.x += 0.12;
        this.draggedMarker.rotation.y += 0.18;
      }
    }

    this.entityManager.update(time);
    this.sceneManager.update();
  }

  public dispose() {
    this.clearCardHoverLiftTarget();
    window.removeEventListener('resize', this.onResizeBound);

    // Clean up marker reservoirs
    if (this.powerReservoirMesh) {
      this.sceneManager.scene.remove(this.powerReservoirMesh);
      this.powerReservoirMesh.traverse((child) => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat.dispose();
        }
      });
    }
    if (this.weaknessReservoirMesh) {
      this.sceneManager.scene.remove(this.weaknessReservoirMesh);
      this.weaknessReservoirMesh.traverse((child) => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat.dispose();
        }
      });
    }

    this.poolMarkerMeshes.forEach(item => {
      this.sceneManager.scene.remove(item.mesh);
      item.mesh.traverse(child => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat.dispose();
        }
      });
    });
    this.poolMarkerMeshes = [];

    this.sceneManager.dispose();
    this.inputHandler.dispose();
    this.entityManager.clear();
  }
}
