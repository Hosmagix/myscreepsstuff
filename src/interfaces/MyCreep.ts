// see types.d.ts

export interface MyCreep extends Creep {
  memory: CreepMemory;
}

export interface CombatMemory extends CreepMemory {
  ranged?: boolean;
  ignoreneutrals?: boolean;
  safepoint: RoomPosition;
  endangeredroom: string;
  hasheal: boolean;
}

export interface CombatCreep extends MyCreep {
  memory: CombatMemory;
}

export interface MineralMemory extends CreepMemory {
  dump: boolean;
  mineral: MineralConstant;
  mineralpos: RoomPosition;
  sourcepos: RoomPosition;
  containerpos: RoomPosition;
  drop: boolean;
}

export interface MineralCreep extends MyCreep {
  memory: MineralMemory;
}

export interface BuilderMemory extends CreepMemory {
  linkfrom?: RoomPosition;
  sourcepos: RoomPosition;
  link?: RoomPosition;
  source?: number;
  nofear: boolean;
  building: boolean;
  repairing?: boolean;
}

export interface BuilderCreep extends MyCreep {
  memory: BuilderMemory;
}

export interface ClaimerMemory extends CreepMemory {
  lasttarget: RoomPosition;
}

export interface ClaimerCreep extends MyCreep {
  memory: ClaimerMemory;
}

export interface HealerMemory extends CreepMemory {
  gatheringpoint: RoomPosition;
}

export interface HealerCreep extends MyCreep {
  memory: HealerMemory;
}
