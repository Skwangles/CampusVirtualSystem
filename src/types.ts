export enum EdgeType {
  Covisibility = -1,
  Normal,
  Loop,
  MergePoint,
  EdgeContraction,
}

export interface PointData {
  id: number;
  x: number;
  y: number;
  z: number;
  type: number;
  label?: string;
  groups?: string[];
  shaft?: string;
}

export interface Label {
  id: number;
  name: string;
  groups: string[];
  shaft?: string;
}

export interface LocationGroup {
  id: number;
  name: string;
  description?: string;
} 

export type ThreeNumbersArray = [number, number, number];