// Unit conversions. The UI logs weight in pounds; set_logs.weight_kg is
// NUMERIC(6,2) in kilograms, so convert and round to 2 decimals before storage.

const LBS_TO_KG = 0.453_592_37;

/** Convert pounds to kilograms, rounded to 2 decimal places (DB precision). */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs * LBS_TO_KG * 100) / 100;
}
