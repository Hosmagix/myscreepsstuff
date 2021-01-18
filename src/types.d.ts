// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {
  role: string;
  room: string;
  init: boolean;
  maxcarry?: number;
  lasttarget?: RoomPosition;
  path?: RoomPosition[];
  boost: boolean;
  dangertill: number;
  home: string;
}

interface Memory {
  uuid: number;
  log: any;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}

interface RoomMemory {
  sources?: RoomPosition[];
  haslinks: boolean;
  dangertill: number;
  reaction: {
    m1: MineralConstant;
    m2: MineralConstant;
  };
  noupgrade?: boolean;
  display: boolean;
  mineralregentime: number;
  slaverooms?: (RoomPosition & { container: boolean })[];
  upgradepos?: RoomPosition;
  wallshp: number;
}

interface FlagMemory {
  visited: number;
}
