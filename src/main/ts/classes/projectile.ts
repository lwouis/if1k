import {Mesh} from 'three';

export class Projectile {
  constructor(public mesh: Mesh, private speed: number) {
    this.mesh.geometry.computeBoundingBox();
  }

  move(): Projectile {
    this.mesh.translateZ(this.speed);
    this.mesh.geometry.boundingBox.setFromObject(this.mesh);
    return this;
  }
}
