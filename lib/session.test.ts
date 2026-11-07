import { expect, test } from "vitest";
import { DEMO, EMPTY, missingSteps, tripReady } from "./session";

test("a new visitor has everything left to choose", () => {
  expect(missingSteps(EMPTY)).toEqual([
    "Add at least one item", "Choose where you start", "Choose where you end", "Choose car or no car", "Choose what matters most",
  ]);
  expect(tripReady(EMPTY)).toBe(false);
});

test("the example list is ready to plan", () => {
  expect(missingSteps(DEMO)).toEqual([]);
  expect(tripReady(DEMO)).toBe(true);
});

test("only the missing pieces are listed", () => {
  const s = { ...DEMO, goal: null, trip: { ...DEMO.trip, mode: null } };
  expect(missingSteps(s)).toEqual(["Choose car or no car", "Choose what matters most"]);
});
