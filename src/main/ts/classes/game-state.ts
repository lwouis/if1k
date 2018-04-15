import {AnimationClip, AnimationMixer, Frustum, Mesh, PerspectiveCamera, Scene, WebGLRenderer} from 'three';
import {Player} from './player';
import {Boss} from './boss';
import {Projectile} from './projectile';
import {List} from 'immutable';
import {Observable} from 'rxjs/Observable';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {FrameContext} from './frame-context';

export class GameState {
  constructor(public renderer: WebGLRenderer,
    public stats: any,
    public scene: Scene,
    public camera: PerspectiveCamera,
    public frustum: Frustum,
    public player: Player,
    public bossesAssets: [Mesh, AnimationClip][],
    public boss: Boss,
    public mixer: AnimationMixer,
    public animationFrame$: Observable<FrameContext>) {
  }
}
