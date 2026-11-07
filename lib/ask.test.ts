import { describe, expect, test } from "vitest";
import { isDemoSentence, parseAsk } from "./ask";

const ids = ["milk", "eggs", "rice"];
const places = ["campus", "home"];

describe("parseAsk", () => {
  test("keeps known items, drops unknown ones and bad quantities", () => {
    const r = parseAsk(
      JSON.stringify({
        items: [
          { itemId: "milk", qty: 2, bulkOk: false },
          { itemId: "caviar", qty: 1, bulkOk: false },
          { itemId: "eggs", qty: 0, bulkOk: false },
          { itemId: "rice", qty: 3, bulkOk: true },
        ],
        goal: "savings", mode: "no_car", leave: "17:00", homeBy: "18:30", from: "campus", to: "home",
      }),
      ids, places,
    );
    expect(r?.list).toEqual([{ itemId: "milk", qty: 2, bulkOk: false }, { itemId: "rice", qty: 3, bulkOk: true }]);
    expect(r).toMatchObject({ goal: "savings", mode: "no_car", leave: "17:00", homeBy: "18:30", from: "campus", to: "home" });
  });

  test("falls back to safe defaults for bad goal, mode, times and places", () => {
    const r = parseAsk(
      JSON.stringify({ items: [{ itemId: "milk", qty: 1, bulkOk: false }], goal: "fastest", mode: "jetpack", leave: "5pm", homeBy: "", from: "moon", to: "" }),
      ids, places,
    );
    expect(r).toMatchObject({ goal: "savings", mode: "no_car", leave: "", homeBy: "", from: "", to: "" });
  });

  test("returns null when there's nothing usable", () => {
    expect(parseAsk("not json", ids, places)).toBeNull();
    expect(parseAsk(JSON.stringify({ items: [] }), ids, places)).toBeNull();
  });
});

test("the demo sentence is recognised regardless of case and punctuation", () => {
  expect(isDemoSentence("groceries for 3 roommates this week, leaving the U at 5, no car, home by 6:30, cheapest!")).toBe(true);
  expect(isDemoSentence("pasta night for two")).toBe(false);
});
