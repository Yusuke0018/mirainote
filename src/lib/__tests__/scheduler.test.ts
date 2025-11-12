import { describe, it, expect } from "vitest";
import { planInterrupt } from "../scheduler";

describe("planInterrupt", () => {
  it("slides movable blocks after interrupt within intermissions", () => {
    const blocks: Array<import("@/lib/schemas").Block & { id: string }> = [
      {
        id: "a",
        userId: "u",
        planId: "p",
        start: 1000,
        end: 1600,
        lockedLength: true,
        movable: true,
      },
      {
        id: "b",
        userId: "u",
        planId: "p",
        start: 1700,
        end: 2000,
        lockedLength: true,
        movable: true,
      },
      {
        id: "f",
        userId: "u",
        planId: "p",
        start: 2100,
        end: 2300,
        lockedLength: true,
        movable: false,
      },
    ];
    const intermissions: Array<
      import("@/lib/schemas").Intermission & { id: string }
    > = [{ id: "i1", userId: "u", planId: "p", start: 0, end: 3000 }];
    const res = planInterrupt(
      blocks,
      intermissions,
      { start: 1500, duration: 200 },
      3000,
      6000,
      20000,
    );
    // block a overlaps and should move after fixed block window to start at 2300
    const movedA = res.moved.find((m) => m.id === "a")!;
    expect(movedA.to.start).toBe(2300);
    // block b stays at 1700 (fits before fixed 2100)
    const movedB = res.moved.find((m) => m.id === "b")!;
    expect(movedB.to.start).toBe(1700);
  });
});
