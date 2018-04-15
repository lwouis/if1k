import {Mesh, Scene} from 'three';
import {ProjectilesSpawner} from './projectiles-spawner';
import {Ship} from './ship';

export class Boss {
  ship: Ship;

  constructor(public id: number, scene: Scene, mesh: Mesh, projectilesSpawner: ProjectilesSpawner) {
    this.ship = new Ship(100, scene, mesh, projectilesSpawner);
  }
}
