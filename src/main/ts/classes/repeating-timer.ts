export type Milliseconds = number;

export class RepeatingTimer {
  private timerId: number;

  constructor(private delay: Milliseconds, private callback: Function) {  }

  start () {
    this.timerId = window.setInterval(this.callback, this.delay);
  }

  stop() {
    window.clearInterval(this.timerId);
  };
}
