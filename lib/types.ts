export type Channel = "in_person" | "instacart" | "amazon" | "doordash" | "ubereats";
export type Goal = "savings" | "fewest_stops" | "time";
export type Mode = "car" | "no_car";

export type Item = { id: string; name: string; unit: "oz" | "count" | "lb" | "fl_oz"; typicalSize: number; aisle?: string; /** Store search term for real prices. */ search?: string };
/** qty = how many of the item's typicalSize the user needs. */
export type ListEntry = { itemId: string; qty: number; bulkOk: boolean; brandLock?: string };

export type PriceQuote = {
  itemId: string;
  storeId: string;
  channel: Channel;
  price: number;
  size: number;
  unit: Item["unit"];
  source: "demo" | "seed" | "receipt" | "shop" | "estimate";
  seenAt: string;
  link?: string;
  /** Store's own product name, when the price came from the store (Kroger API or the team's sheet). */
  product?: string;
};

export type Memberships = {
  costco?: boolean;
  samsClub?: boolean;
  restaurantDepot?: boolean;
  smithsRewards?: boolean;
  instacartPlus?: boolean;
  uberOne?: boolean;
  dashPass?: boolean;
  prime?: boolean;
};

export type Place = { lat: number; lng: number; label: string };

export type Trip = {
  start: Place;
  end: Place;
  mode: Mode;
  timeLimitMin?: number;
  costPerMile: number;
  minutesPerStop: number;
};

export type Store = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Warehouse membership needed to shop in person. */
  membershipRequired?: keyof Memberships;
  /** Channels this store offers, including "in_person". */
  channels: Channel[];
  link?: string;
  /** Street address, for the team to confirm and for geocoding. */
  address?: string;
  /** Kroger API store id (Smith's), set by `npm run prices:smiths`. */
  krogerLocationId?: string;
  /** Store page inside each delivery app, e.g. Instacart storefront. */
  orderLinks?: Partial<Record<Channel, string>>;
  coordsNote?: string;
};

export type ChannelOverride = { minOrder?: number; memberFreeOver?: number; markup?: number; markupWithMembership?: number };

export type ChannelInfo = {
  name: string;
  /** Delivery + service fee without the channel membership. */
  fee: number;
  minOrder: number;
  /** Membership that waives the fee once the order reaches memberFreeOver. */
  membership?: keyof Memberships;
  memberFreeOver?: number;
  /** Online price = in-store price x markup when no online quote exists. */
  markup: number;
  storeOverrides?: Record<string, ChannelOverride>;
};

export type CatalogData = {
  stores: Store[];
  items: Item[];
  prices: PriceQuote[];
  channels: Partial<Record<Channel, ChannelInfo>>;
};

export type LineItem = { itemId: string; qty: number; quote: PriceQuote; packs: number; cost: number };

export type Plan = {
  goal: Goal;
  stops: { storeId: string; items: LineItem[] }[]; // in visit order
  onlineOrders: { storeId: string; channel: Channel; items: LineItem[]; fee: number }[];
  money: number;
  minutes: number;
  miles: number;
  stopCount: number;
  savingsVsOneStore: number;
  warnings: string[];
};
