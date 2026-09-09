import { describe, expect, it } from "vitest";
import { brickAtCell, cellsFor, footprintFor, originForPivot } from "../geometry";
import type { Placement } from "../types";

describe("footprintFor", () => {
  it("keeps width/depth at rotation 0", () => {
    expect(footprintFor("2x3-blue", 0)).toEqual({ w: 2, d: 3 });
  });

  it("keeps width/depth at rotation 180", () => {
    expect(footprintFor("2x3-blue", 180)).toEqual({ w: 2, d: 3 });
  });

  it("swaps width/depth at rotation 90", () => {
    expect(footprintFor("2x3-blue", 90)).toEqual({ w: 3, d: 2 });
  });

  it("swaps width/depth at rotation 270", () => {
    expect(footprintFor("2x3-blue", 270)).toEqual({ w: 3, d: 2 });
  });
});

describe("cellsFor", () => {
  it("2x3 at rotation 90 occupies 3 along x and 2 along z", () => {
    const cells = cellsFor("2x3-blue", 90, { x: 1, y: 0, z: 1 });
    const xs = new Set(cells.map((c) => c.x));
    const zs = new Set(cells.map((c) => c.z));
    expect(cells).toHaveLength(6);
    expect(xs).toEqual(new Set([1, 2, 3]));
    expect(zs).toEqual(new Set([1, 2]));
  });

  it("places every cell at the origin's y", () => {
    const cells = cellsFor("2x2-red", 0, { x: 0, y: 2, z: 0 });
    expect(cells.every((c) => c.y === 2)).toBe(true);
  });
});

describe("originForPivot", () => {
  const pivot = { x: 0, y: 0, z: 0 };

  it("pseudo-centers on the mouse pointer (2x4 piece)", () => {
    // For w=2, d=4, offset is x: -floor((2-1)/2) = 0, z: -floor((4-1)/2) = -1
    expect(originForPivot("2x4-yellow", 0, pivot)).toEqual({ x: 0, y: 0, z: -1 });
    // For 90 deg: w=4, d=2, offset is x: -floor((4-1)/2) = -1, z: -floor((2-1)/2) = 0
    expect(originForPivot("2x4-yellow", 90, pivot)).toEqual({ x: -1, y: 0, z: 0 });
    // 180 and 270 act identically to 0 and 90
    expect(originForPivot("2x4-yellow", 180, pivot)).toEqual({ x: 0, y: 0, z: -1 });
    expect(originForPivot("2x4-yellow", 270, pivot)).toEqual({ x: -1, y: 0, z: 0 });
  });

  it("puts each rotation in a different quadrant around the pivot", () => {
    const origins = ([0, 90, 180, 270] as const).map((r) => originForPivot("2x4-yellow", r, pivot));
    const unique = new Set(origins.map((o) => `${o.x},${o.z}`));
    expect(unique.size).toBe(2);
  });
});

describe("brickAtCell", () => {
  const placed: Placement[] = [
    { instanceId: "a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } },
  ];

  it("finds the placement occupying a cell", () => {
    expect(brickAtCell(placed, { x: 1, y: 0, z: 1 })?.instanceId).toBe("a");
  });

  it("returns null for an empty cell", () => {
    expect(brickAtCell(placed, { x: 5, y: 0, z: 5 })).toBeNull();
  });
});
