import {Mesh, MeshBasicMaterial, Scene} from 'three';
import {ProjectilesSpawner} from './projectiles-spawner';

export class Ship {
  constructor(public maxHealth: number, scene: Scene, public mesh: Mesh, public projectilesSpawner: ProjectilesSpawner) {
    scene.add(this.mesh);
    this.mesh.add(this.projectilesSpawner.mesh);
    this.mesh.geometry.computeBoundingBox();
    this.health = maxHealth;
  }

  health: number;

  damaged() {
    console.log(this.maxHealth, this.health);
    // TODO how to handle scene as immutable?
    this.health -= 1;
    const remainingHealth = Math.max(this.maxHealth - this.health, 0) / this.maxHealth;
    (this.mesh.material as MeshBasicMaterial).color.setHSL(remainingHealth, remainingHealth, remainingHealth);
    return this;
  }
}
