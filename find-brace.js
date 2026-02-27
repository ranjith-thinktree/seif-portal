const fs = require("fs");
const lines = fs
  .readFileSync(
    "./frontend/src/pages/Inbox/RefurbishmentResponseModal.jsx",
    "utf8",
  )
  .split("\n");
let balance = 0;
let lastPositiveLine = 0;
const suspiciousLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Strip string literals
  const stripped = line
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .replace(/`[^`]*`/g, "``");

  const opens = (stripped.match(/\{/g) || []).length;
  const closes = (stripped.match(/\}/g) || []).length;
  const diff = opens - closes;

  if (diff !== 0) {
    suspiciousLines.push({
      line: i + 1,
      diff,
      balance: balance + diff,
      text: line.trim().substring(0, 80),
    });
  }

  balance += diff;
  if (balance > 0) lastPositiveLine = i + 1;
}

console.log("Final balance:", balance);
console.log("Last line with positive balance:", lastPositiveLine);
console.log("\nLines with brace imbalance (last 30):");
suspiciousLines.slice(-30).forEach((l) => {
  console.log(
    `L${l.line} [diff:${l.diff > 0 ? "+" : ""}${l.diff}, bal:${l.balance}]: ${l.text}`,
  );
});
