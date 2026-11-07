import { expect, test } from "vitest";
import { DEMO, EMPTY, missingSteps, toTrip, tripReady } from "./session";

test("a new visitor has everything left to choose", () => {
  expect(missingSteps(EMPTY)).toEqual([
    "Add at least one item", "Choose where you start", "Choose car or no car", "Choose what matters most",
  ]);
  expect(tripReady(EMPTY)).toBe(false);
});

test("the example list is ready to plan", () => {
  expect(missingSteps(DEMO)).toEqual([]);
  expect(tripReady(DEMO)).toBe(true);
});

test("no end place means a round trip back to the start", () => {
  const s = { ...DEMO, trip: { ...DEMO.trip, to: null } };
  expect(missingSteps(s)).toEqual([]);
  expect(toTrip(s.trip).end).toEqual(DEMO.trip.from);
});

test("only the missing pieces are listed", () => {
  const s = { ...DEMO, goal: null, trip: { ...DEMO.trip, mode: null } };
  expect(missingSteps(s)).toEqual(["Choose car or no car", "Choose what matters most"]);
});
