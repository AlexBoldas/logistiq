export type ObjectType = 'box' | 'sphere' | 'torus' | 'pallet';

export type SceneObject = {
  id: string;
  type: ObjectType;
  position: [number, number, number];
  color: string;
  size?: [number, number, number];
};

export type Bin = {
  id: string;
  name: string;
  isFull: boolean;
  item?: string;
};

export type Layer = {
  id: string;
  name: string;
  bins: Bin[];
};

export type Column = {
  id: string;
  name: string;
  layers: Layer[];
};

export type Rack = {
  id: string;
  name: string;
  columns: Column[];
};

export type Warehouse = {
  racks: Rack[];
};

export type AnimationSegment = {
  duration: number;
  startPosition: [number, number, number];
  endPosition: [number, number, number];
}

export type AnimationState = {
  id: string;
  palletId: string;
  segments: AnimationSegment[];
  totalDuration: number;
};