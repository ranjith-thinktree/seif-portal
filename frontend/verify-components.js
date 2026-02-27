#!/usr/bin/env node
/**
 * Component Dependency Verification Script
 * Checks all UI component imports in the project
 */

const fs = require("fs");
const path = require("path");

const COMPONENTS_DIR = path.join(__dirname, "src", "components", "ui");
const PAGES_DIR = path.join(__dirname, "src", "pages");

console.log("🔍 Verifying UI Component Dependencies...\n");

// List all available UI components
const availableComponents = fs
  .readdirSync(COMPONENTS_DIR)
  .filter((file) => file.endsWith(".jsx"))
  .map((file) => file.replace(".jsx", ""));

console.log("✅ Available UI Components:");
availableComponents.forEach((comp) => {
  console.log(`   - ${comp}.jsx`);
});
console.log(`   Total: ${availableComponents.length} components\n`);

// Check RefurbishmentDashboard imports
const dashboardFile = path.join(
  PAGES_DIR,
  "Admin",
  "RefurbishmentDashboard.jsx",
);
const dashboardContent = fs.readFileSync(dashboardFile, "utf8");

const importRegex = /import.*from\s+["'].*\/components\/ui\/(\w+)["']/g;
const imports = [];
let match;

while ((match = importRegex.exec(dashboardContent)) !== null) {
  imports.push(match[1]);
}

console.log("📦 RefurbishmentDashboard UI Imports:");
const uniqueImports = [...new Set(imports)];
let allGood = true;

uniqueImports.forEach((imp) => {
  const exists = availableComponents.includes(imp);
  const status = exists ? "✅" : "❌";
  console.log(`   ${status} ${imp}`);
  if (!exists) {
    allGood = false;
    console.log(`      ⚠️  MISSING: src/components/ui/${imp}.jsx`);
  }
});

console.log(
  `\n${allGood ? "✅ All imports verified!" : "❌ Missing components detected!"}`,
);
console.log(`\n📊 Summary:`);
console.log(`   Available: ${availableComponents.length}`);
console.log(`   Required: ${uniqueImports.length}`);
console.log(`   Status: ${allGood ? "PASS" : "FAIL"}\n`);

process.exit(allGood ? 0 : 1);
