import {KeyName} from './controls';
import {List} from 'immutable';

export type FrameContext = {
  time?: number;
  delta?: number;
  keysDown?: List<KeyName>;
  needResize?: boolean;
}
