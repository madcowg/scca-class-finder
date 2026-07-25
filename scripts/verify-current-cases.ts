import { classifyVehicle } from "../src/lib/classifier";
import { DEFAULT_BUILD } from "../src/lib/rules";
import { CURRENT_APPENDIX_A_STOCK_CASES } from "../src/lib/verifiedCases";

let failures = 0;

for (const vehicleCase of CURRENT_APPENDIX_A_STOCK_CASES) {
  const result = classifyVehicle(vehicleCase.selection, DEFAULT_BUILD);
  const actual = result.selectedClass ?? "manual-review";
  const status = actual === vehicleCase.expectedClass ? "PASS" : "FAIL";
  console.log(`${status} | ${vehicleCase.label} | expected ${vehicleCase.expectedClass.toUpperCase()} | got ${actual.toUpperCase()}`);
  if (status === "FAIL") failures += 1;
}

if (failures > 0) {
  throw new Error(`${failures} current Appendix A verification case(s) failed.`);
}

console.log(`Verified ${CURRENT_APPENDIX_A_STOCK_CASES.length} current Appendix A stock cases.`);
