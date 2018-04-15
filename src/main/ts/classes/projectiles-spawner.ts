import {Milliseconds, RepeatingTimer} from './repeating-timer';
import {Mesh, MeshBasicMaterial} from 'three';
import {Projectile} from './projectile';
import {Helpers} from './helpers';
import {Observable} from 'rxjs/Observable';
import {List} from 'immutable';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

export class ProjectilesSpawner {
  projectiles$: BehaviorSubject<List<Projectile>>;
  projectiles = List<Projectile>();

  constructor(interval: Milliseconds, public mesh: Mesh, speed: number, bufferStop$: Observable<any>) {
    mesh.visible = false;
    const projectiles$ = Observable.interval(interval)
      .map(() => new Projectile(Helpers.boxMeshWithPosition((this.mesh.material as MeshBasicMaterial).color, {
        x: 0.5,
        y: 0.5,
        z: 0.5,
      }, this.mesh.getWorldPosition()), speed))
      .buffer(bufferStop$)
      .map(next => List(next));
    this.projectiles$ = Helpers.behaviourSubjectFromObservable(projectiles$, List<Projectile>());
  }

  newProjectiles() {
    return this.projectiles$.value;
  }
}
