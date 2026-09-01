export type SupplierAdapterStatus = {
  key: string;
  name: string;
  mode: "official_api" | "licensed_feed" | "permitted_web_source";
  configured: boolean;
  availability: "ready" | "credentials_required";
  setupUrl: string;
};

const supplierDefinitions = [
  { key: "expedia_rapid", name: "Expedia Rapid API", mode: "official_api" as const, envKey: "RAPID_API_KEY", setupUrl: "https://partner.expediagroup.com/en-us/solutions/build-your-travel-experience/rapid-api" },
  { key: "booking_demand", name: "Booking.com Demand API", mode: "official_api" as const, envKey: "BOOKING_DEMAND_API_KEY", setupUrl: "https://developers.booking.com/" },
  { key: "hotelbeds", name: "Hotelbeds", mode: "licensed_feed" as const, envKey: "HOTELBEDS_API_KEY", setupUrl: "https://developer.hotelbeds.com/" },
];

export function getSupplierAdapterStatuses(env: NodeJS.ProcessEnv = process.env): SupplierAdapterStatus[] {
  return supplierDefinitions.map(definition => ({
    key: definition.key,
    name: definition.name,
    mode: definition.mode,
    configured: Boolean(env[definition.envKey]),
    availability: env[definition.envKey] ? "ready" : "credentials_required",
    setupUrl: definition.setupUrl,
  }));
}

export function supplierComparisonIsConfigured(env: NodeJS.ProcessEnv = process.env) {
  return getSupplierAdapterStatuses(env).some(adapter => adapter.configured);
}
