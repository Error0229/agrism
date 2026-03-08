/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _helpers from "../_helpers.js";
import type * as briefingContext from "../briefingContext.js";
import type * as briefingGeneration from "../briefingGeneration.js";
import type * as cropEnrichment from "../cropEnrichment.js";
import type * as cropImport from "../cropImport.js";
import type * as crops from "../crops.js";
import type * as dataTransfer from "../dataTransfer.js";
import type * as farms from "../farms.js";
import type * as fields from "../fields.js";
import type * as finance from "../finance.js";
import type * as harvest from "../harvest.js";
import type * as irrigationAdvice from "../irrigationAdvice.js";
import type * as irrigationZones from "../irrigationZones.js";
import type * as pestObservations from "../pestObservations.js";
import type * as pestTriage from "../pestTriage.js";
import type * as plannedPlantings from "../plannedPlantings.js";
import type * as recommendations from "../recommendations.js";
import type * as soil from "../soil.js";
import type * as suitability from "../suitability.js";
import type * as tasks from "../tasks.js";
import type * as weather from "../weather.js";
import type * as weatherReplan from "../weatherReplan.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _helpers: typeof _helpers;
  briefingContext: typeof briefingContext;
  briefingGeneration: typeof briefingGeneration;
  cropEnrichment: typeof cropEnrichment;
  cropImport: typeof cropImport;
  crops: typeof crops;
  dataTransfer: typeof dataTransfer;
  farms: typeof farms;
  fields: typeof fields;
  finance: typeof finance;
  harvest: typeof harvest;
  irrigationAdvice: typeof irrigationAdvice;
  irrigationZones: typeof irrigationZones;
  pestObservations: typeof pestObservations;
  pestTriage: typeof pestTriage;
  plannedPlantings: typeof plannedPlantings;
  recommendations: typeof recommendations;
  soil: typeof soil;
  suitability: typeof suitability;
  tasks: typeof tasks;
  weather: typeof weather;
  weatherReplan: typeof weatherReplan;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
