import {AmbientLight, AnimationClip, AnimationMixer, Color, Frustum, Matrix4, Mesh, PerspectiveCamera, Scene, WebGLRenderer} from 'three';
import {GameState} from './classes/game-state';
import {Helpers} from './classes/helpers';
import {Controls, Key, KeyName} from './classes/controls';
import {Ship} from './classes/ship';
import {ProjectilesSpawner} from './classes/projectiles-spawner';
import {FrameContext} from './classes/frame-context';
import {Boss} from './classes/boss';
import {Player} from './classes/player';
import {List} from 'immutable';
import * as Stats from 'stats.js';
import {BehaviorSubject, Observable, Scheduler} from 'rxjs';

const resize$ = new BehaviorSubject(true);

let rendererDom: any;

function controls$(): Observable<List<KeyName>> {
  const isRightOrLeft = (event: KeyboardEvent) => event.key === Key.ArrowLeft || event.key === Key.ArrowRight;
  const keydown$ = Observable.fromEvent<KeyboardEvent>(document.body, 'keydown')
      .filter(isRightOrLeft)
      .map((event: KeyboardEvent) => keysDown => event.key !== keysDown.last() ? keysDown.push(event.key) : keysDown);
  const keyup$ = Observable.fromEvent<KeyboardEvent>(document.body, 'keyup')
      .filter(isRightOrLeft)
      .map((event: KeyboardEvent) => keysDown => keysDown.filterNot(e => e === event.key));
  const initialState = List<KeyName>();
  return Observable.merge(keydown$, keyup$)
      .scan((state, reducer) => reducer(state), initialState)
      .startWith(initialState);
}

function animationFrame$(controls$: Observable<List<KeyName>>, resize$: BehaviorSubject<boolean>): Observable<FrameContext> {
  // TODO 1000/60 is a workaround as Scheduler.animationFrame seems to have a bug and hits 120hz on my 60hz monitor
  const clock$ = Observable.interval(1000 / 60, Scheduler.animationFrame)
      .map(() => state => {
        const time = performance.now();
        return Object.assign({}, state, {
          time: time,
          delta: (time - state.time) / 1000,
        });
      })
      .scan((state, reducer) => reducer(state), {time: performance.now(), delta: 0} as FrameContext);
  return clock$.withLatestFrom(controls$, resize$, (timeAndDelta, keysDown, needResize) =>
      Object.assign({}, timeAndDelta, {
        keysDown: keysDown,
        needResize: needResize,
      }) as FrameContext);
}

async function initialState(animationFrame$: Observable<FrameContext>): Promise<GameState> {
  const renderer = initialRenderer();
  const stats = initialStats();
  const scene = new Scene();
  scene.add(new AmbientLight(0x404040));
  const camera = initialCamera(scene);
  const frustum = new Frustum();
  const player = await initialPlayer(scene, animationFrame$);
  const bossAssets = await Promise.all(['src/main/assets/blender/boss.json'].map(url => Helpers.sceneLoader(url)));
  return new GameState(renderer, stats, scene, camera, frustum, player, bossAssets, undefined, undefined, animationFrame$);
}

function initialStats(): any {
  const stats = new Stats();
  document.body.appendChild(stats.dom);
  stats.dom.style.cssText = stats.dom.style.cssText.replace('top', 'bottom');
  return stats;
}

function initialRenderer(): WebGLRenderer {
  const renderer = new WebGLRenderer({
    antialias: true,
  });
  renderer.setPixelRatio(Math.floor(window.devicePixelRatio));
  rendererDom = renderer.domElement;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function initialCamera(scene: Scene): PerspectiveCamera {
  const camera = new PerspectiveCamera(75, 16 / 9, 0.1, 1000);
  camera.position.y = -20;
  camera.lookAt(scene.position);
  camera.updateMatrixWorld(false);
  camera.matrixAutoUpdate = false;
  return camera;
}

function spawnBoss(id: number, scene: Scene, assets: [Mesh, AnimationClip], projectileSpawner: ProjectilesSpawner): [Boss, AnimationMixer] {
  const boss = new Boss(id, scene, assets[0], projectileSpawner);
  scene.add(assets[0]);
  const mixer = new AnimationMixer(assets[0]);
  mixer.clipAction(assets[1]).play();
  return [boss, mixer];
}

async function initialPlayer(scene: Scene, animationFrame$: Observable<FrameContext>): Promise<Player> {
  const [playerMesh, _] = await Helpers.sceneLoader('src/main/assets/blender/player.json');
  const projectileSpawnerMesh = Helpers.boxMesh(new Color(0xb22323), {x: 2, y: 2, z: 2});
  const projectilesSpawner = new ProjectilesSpawner(100, projectileSpawnerMesh, 0.5, animationFrame$);
  return new Player(0.3, scene, playerMesh, projectilesSpawner);
}

function drawLoop(gameState: GameState, frameContext: FrameContext): GameState {
  resizeIfNeeded(gameState, frameContext);
  gameState.stats.update();
  if (gameState.boss === undefined || gameState.boss.ship.health <= 0) {
    const bossId = gameState.boss === undefined ? 0 : gameState.boss.id + 1;
    const projectileSpawnerMesh = Helpers.boxMesh(new Color('blue'), {x: 2, y: 2, z: 2});
    const projectileSpawner = new ProjectilesSpawner(100, projectileSpawnerMesh, -0.5, gameState.animationFrame$);
    const [boss, mixer] = spawnBoss(bossId, gameState.scene, gameState.bossesAssets[0], projectileSpawner);
    gameState.boss = boss;
    gameState.mixer = mixer;
  }
  gameState.mixer.update(frameContext.delta);
  gameState.boss.ship.mesh.geometry.boundingBox.setFromObject(gameState.boss.ship.mesh);
  gameState.player.ship.mesh.geometry.boundingBox.setFromObject(gameState.player.ship.mesh);
  gameState.player = updatePlayer(gameState.player, frameContext.keysDown);
  [gameState.player, gameState.boss, gameState.scene] = updateProjectiles(gameState.player, gameState.boss, gameState.scene, gameState.frustum);
  if (gameState.player.ship.health === 2) {
    gameState.player.ship.health = 10;
  }
  gameState.renderer.render(gameState.scene, gameState.camera);
  return gameState;
}

function updateProjectiles(player: Player, boss: Boss, scene: Scene, frustum: Frustum): [Player, Boss, Scene] {
  const newPlayerProjectiles = player.ship.projectilesSpawner.newProjectiles();
  const newBossProjectiles = boss.ship.projectilesSpawner.newProjectiles();
  newPlayerProjectiles.concat(newBossProjectiles).forEach(newProjectile => scene.add(newProjectile.mesh));
  [boss.ship, player.ship, scene] = updateShipProjectiles(boss.ship, player.ship, scene, frustum);
  [boss.ship, player.ship, scene] = updateShipProjectiles(player.ship, boss.ship, scene, frustum);
  return [player, boss, scene];
}

function updateShipProjectiles(firingShip: Ship, targetShip: Ship, scene: Scene, frustum: Frustum): [Ship, Ship, Scene] {
  const [projectiles, newTargetShip, newScene] = firingShip.projectilesSpawner.projectiles.reduce(([projectilesLeft, targetShip, scene], projectile) => {
    if (frustum.intersectsObject(projectile.mesh)) {
      if (projectile.mesh.geometry.boundingBox.intersectsBox(targetShip.mesh.geometry.boundingBox)) {
        return [projectilesLeft, targetShip.damaged(), sceneWithoutMesh(scene, projectile.mesh)];
      } else {
        projectile.move();
        return [projectilesLeft.push(projectile), targetShip, scene];
      }
    } else {
      return [projectilesLeft, targetShip, sceneWithoutMesh(scene, projectile.mesh)];
    }
  }, [firingShip.projectilesSpawner.newProjectiles(), targetShip, scene] as any);
  firingShip.projectilesSpawner.projectiles = projectiles;
  return [firingShip, newTargetShip, newScene];
}

function updatePlayer(player: Player, keysDown: List<KeyName>): Player {
  if (!keysDown.isEmpty()) {
    player.move(Controls.currentDirection(keysDown));
  }
  return player;
}

function sceneWithoutMesh(scene: Scene, mesh: Mesh) {
  // TODO how to handle scene as immutable?
  scene.remove(mesh);
  return scene;
}

function resizeIfNeeded(gameState: GameState, frameContext: FrameContext) {
  if (frameContext.needResize) {
    const width = document.body.offsetWidth;
    const height = document.body.offsetHeight;
    gameState.renderer.setSize(width, height);
    gameState.camera.aspect = width / height;
    gameState.camera.updateProjectionMatrix();
    gameState.frustum = gameState.frustum.setFromMatrix(new Matrix4()
        .multiplyMatrices(gameState.camera.projectionMatrix, gameState.camera.matrixWorldInverse));
    resize$.next(false);
  }
}

async function run(): Promise<void> {
  const a = animationFrame$(controls$(), resize$);
  a
      .scan((gameState, frameContext) => drawLoop(gameState, frameContext), await initialState(a))
      .subscribe();
}

run();

Observable.fromEvent(window, 'resize').subscribe(() => resize$.next(true));
