import { getRevenueCatClient } from "./revenueCatClient";
import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "SmartBins";

const PRODUCTS = [
  {
    identifier: "smartbin_lite_monthly",
    playStoreIdentifier: "smartbin_lite_monthly:monthly",
    displayName: "Smart Bin Lite",
    userFacingTitle: "Lite – Cloud Sync",
    duration: "P1M" as const,
    entitlementKey: "lite",
    entitlementDisplayName: "Lite Access",
    offeringKey: "lite",
    offeringDisplayName: "Lite Offering",
    packageKey: "$rc_monthly",
    packageDisplayName: "Lite Monthly",
    prices: [
      { amount_micros: 1490000, currency: "USD" },
      { amount_micros: 1290000, currency: "EUR" },
    ],
  },
  {
    identifier: "smartbin_pro_monthly",
    playStoreIdentifier: "smartbin_pro_monthly:monthly",
    displayName: "Smart Bin Pro",
    userFacingTitle: "Pro – Cloud Sync",
    duration: "P1M" as const,
    entitlementKey: "pro",
    entitlementDisplayName: "Pro Access",
    offeringKey: "pro",
    offeringDisplayName: "Pro Offering",
    packageKey: "$rc_monthly",
    packageDisplayName: "Pro Monthly",
    prices: [
      { amount_micros: 2990000, currency: "USD" },
      { amount_micros: 2490000, currency: "EUR" },
    ],
  },
];

const APP_STORE_BUNDLE_ID = "com.smartbin.findmythings";
const PLAY_STORE_PACKAGE_NAME = "com.smartbin.findmythings";

type TestStorePricesResponse = { object: string; prices: { amount_micros: number; currency: string }[] };

async function seedRevenueCat() {
  const client = getRevenueCatClient();

  // ── Project ──────────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({ client, query: { limit: 20 } });
  if (listProjectsError) throw new Error("Failed to list projects: " + JSON.stringify(listProjectsError));
  const existingProject = existingProjects?.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id, existingProject.name);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error || !newProject) throw new Error("Failed to create project: " + JSON.stringify(error));
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ──────────────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  if (listAppsError || !apps) throw new Error("Failed to list apps: " + JSON.stringify(listAppsError));

  let testApp = apps.items?.find((a: App) => a.type === "test_store");
  let appStoreApp = apps.items?.find((a: App) => a.type === "app_store");
  let playStoreApp = apps.items?.find((a: App) => a.type === "play_store");

  if (!testApp) throw new Error("No test store app found in project. Please create one in RevenueCat dashboard first.");
  console.log("Test store app:", testApp.id);

  if (!appStoreApp) {
    const { data, error } = await createApp({ client, path: { project_id: project.id }, body: { name: "Smart Bin iOS", type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } } });
    if (error || !data) throw new Error("Failed to create App Store app: " + JSON.stringify(error));
    appStoreApp = data;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data, error } = await createApp({ client, path: { project_id: project.id }, body: { name: "Smart Bin Android", type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } } });
    if (error || !data) throw new Error("Failed to create Play Store app: " + JSON.stringify(error));
    playStoreApp = data;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  // ── Products, Entitlements, Offerings ────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
  if (listProductsError) throw new Error("Failed to list products: " + JSON.stringify(listProductsError));

  const ensureProduct = async (targetApp: App, label: string, identifier: string, isTest: boolean, config: (typeof PRODUCTS)[0]): Promise<Product> => {
    const existing = existingProducts?.items?.find((p: Product) => p.store_identifier === identifier && p.app_id === targetApp.id);
    if (existing) { console.log(`  ${label} product exists:`, existing.id); return existing; }
    const body: CreateProductData["body"] = { store_identifier: identifier, app_id: targetApp.id, type: "subscription", display_name: config.displayName };
    if (isTest) {
      (body as Record<string, unknown>).subscription = { duration: config.duration };
      (body as Record<string, unknown>).title = config.userFacingTitle;
    }
    const { data, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error || !data) throw new Error(`Failed to create ${label} product: ` + JSON.stringify(error));
    console.log(`  Created ${label} product:`, data.id);
    return data;
  };

  for (const config of PRODUCTS) {
    console.log(`\n── Setting up ${config.displayName} ──`);

    const testProduct = await ensureProduct(testApp, "Test Store", config.identifier, true, config);
    const appStoreProduct = await ensureProduct(appStoreApp, "App Store", config.identifier, false, config);
    const playStoreProduct = await ensureProduct(playStoreApp, "Play Store", config.playStoreIdentifier, false, config);

    // Test store prices
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: testProduct.id },
      body: { prices: config.prices },
      headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}` },
    });
    if (priceError) {
      if (typeof priceError === "object" && "type" in priceError && (priceError as Record<string, string>).type === "resource_already_exists") {
        console.log("  Prices already set");
      } else {
        console.warn("  Warning: could not set test prices:", JSON.stringify(priceError));
      }
    } else {
      console.log("  Test store prices set");
    }

    // Entitlement
    const { data: existingEntitlements, error: listEntErr } = await listEntitlements({ client, path: { project_id: project.id }, query: { limit: 20 } });
    if (listEntErr) throw new Error("Failed to list entitlements");
    let entitlement: Entitlement;
    const existingEnt = existingEntitlements?.items?.find((e: Entitlement) => e.lookup_key === config.entitlementKey);
    if (existingEnt) {
      console.log("  Entitlement exists:", existingEnt.id);
      entitlement = existingEnt;
    } else {
      const { data, error } = await createEntitlement({ client, path: { project_id: project.id }, body: { lookup_key: config.entitlementKey, display_name: config.entitlementDisplayName } });
      if (error || !data) throw new Error("Failed to create entitlement");
      console.log("  Created entitlement:", data.id);
      entitlement = data;
    }

    const { error: attachEntErr } = await attachProductsToEntitlement({ client, path: { project_id: project.id, entitlement_id: entitlement.id }, body: { product_ids: [testProduct.id, appStoreProduct.id, playStoreProduct.id] } });
    if (attachEntErr && (attachEntErr as Record<string, string>).type !== "unprocessable_entity_error") {
      console.warn("  Warning attaching products to entitlement:", JSON.stringify(attachEntErr));
    } else {
      console.log("  Products attached to entitlement");
    }

    // Offering
    const { data: existingOfferings, error: listOffErr } = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
    if (listOffErr) throw new Error("Failed to list offerings");
    let offering: Offering;
    const existingOff = existingOfferings?.items?.find((o: Offering) => o.lookup_key === config.offeringKey);
    if (existingOff) {
      console.log("  Offering exists:", existingOff.id);
      offering = existingOff;
    } else {
      const { data, error } = await createOffering({ client, path: { project_id: project.id }, body: { lookup_key: config.offeringKey, display_name: config.offeringDisplayName } });
      if (error || !data) throw new Error("Failed to create offering");
      console.log("  Created offering:", data.id);
      offering = data;
    }

    // Package
    const { data: existingPkgs, error: listPkgErr } = await listPackages({ client, path: { project_id: project.id, offering_id: offering.id }, query: { limit: 20 } });
    if (listPkgErr) throw new Error("Failed to list packages");
    let pkg: Package;
    const existingPkg = existingPkgs?.items?.find((p: Package) => p.lookup_key === config.packageKey);
    if (existingPkg) {
      console.log("  Package exists:", existingPkg.id);
      pkg = existingPkg;
    } else {
      const { data, error } = await createPackages({ client, path: { project_id: project.id, offering_id: offering.id }, body: { lookup_key: config.packageKey, display_name: config.packageDisplayName } });
      if (error || !data) throw new Error("Failed to create package");
      console.log("  Created package:", data.id);
      pkg = data;
    }

    const { error: attachPkgErr } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: testProduct.id, eligibility_criteria: "all" },
          { product_id: appStoreProduct.id, eligibility_criteria: "all" },
          { product_id: playStoreProduct.id, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachPkgErr) {
      const err = attachPkgErr as Record<string, string>;
      if (err.type === "unprocessable_entity_error" && err.message?.includes("Cannot attach")) {
        console.log("  Products already attached to package");
      } else {
        console.warn("  Warning attaching products to package:", JSON.stringify(attachPkgErr));
      }
    } else {
      console.log("  Products attached to package");
    }
  }

  // ── API Keys ──────────────────────────────────────────────────────────────────
  const { data: testKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: testApp.id } });
  const { data: iosKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: appStoreApp.id } });
  const { data: androidKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: playStoreApp.id } });

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", testApp.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("\nEnvironment variables to set:");
  console.log("REVENUECAT_PROJECT_ID=" + project.id);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=" + (testKeys?.items?.map((k) => k.key).join(", ") ?? "N/A"));
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=" + (iosKeys?.items?.map((k) => k.key).join(", ") ?? "N/A"));
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=" + (androidKeys?.items?.map((k) => k.key).join(", ") ?? "N/A"));
  console.log("====================\n");
}

seedRevenueCat().catch(console.error);
