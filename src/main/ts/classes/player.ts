import {Mesh, Scene} from 'three';
import {ProjectilesSpawner} from './projectiles-spawner';
import {Ship} from './ship';

export class Player {
  ship: Ship;

  constructor(private speed: number, scene: Scene, mesh: Mesh, projectilesSpawner: ProjectilesSpawner) {
    this.ship = new Ship(10, scene, mesh, projectilesSpawner);
  }

  move(direction: number): void {
    // TODO implement min and max position
    this.ship.mesh.position.x += direction * this.speed;
  }
}
