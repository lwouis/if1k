import {AnimationClip, BoxGeometry, Color, Mesh, MeshBasicMaterial, ObjectLoader, Vector3} from 'three';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';

type Scale = { x: number, y: number, z: number };

export class Helpers {
  static boxMeshWithPosition(color: Color, scale: Scale, position: Vector3): Mesh {
    const mesh = Helpers.boxMesh(color, scale);
    mesh.position.copy(position);
    return mesh;
  }

  static boxMesh(color: Color, scale: Scale): Mesh {
    return new Mesh(new BoxGeometry(scale.x, scale.y, scale.z), new MeshBasicMaterial({color: color}));
  }

  static async sceneLoader(url: string): Promise<[Mesh, AnimationClip]> {
    return new Promise<[Mesh, AnimationClip]>((resolve, reject) => {
      new ObjectLoader().load(url,
        (sceneObject: any) => resolve([sceneObject.children[0], sceneObject.animations[0]]),
        (event: any) => {},
        (event: any) => {
          // typescript signatures are misleading as this is not a ErrorEvent
          event.target.status !== 200 ? reject(event.target.response) : reject(event);
        });
    });
  }

  static behaviourSubjectFromObservable<T>(observable$: Observable<T>, firstValue: T) {
    const behaviourSubject = new BehaviorSubject<T>(firstValue);
    observable$.subscribe(next => behaviourSubject.next(next));
    return behaviourSubject;
  }
}
