import { describe, it, expect } from "vitest";
import { overlap } from "../firestore";

describe("overlap", () => {
  it("returns true when intervals overlap", () => {
    expect(overlap(0, 10, 5, 15)).toBe(true);
    expect(overlap(5, 15, 0, 10)).toBe(true);
  });
  it("returns false when intervals touch but do not overlap", () => {
    expect(overlap(0, 10, 10, 20)).toBe(false);
    expect(overlap(10, 20, 0, 10)).toBe(false);
  });
});
