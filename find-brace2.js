const fs = require("fs");
const lines = fs
  .readFileSync(
    "./frontend/src/pages/Inbox/RefurbishmentResponseModal.jsx",
    "utf8",
  )
  .split("\n");
let balance = 0;

console.log("First 50 lines with brace changes:");
let count = 0;
for (let i = 0; i < lines.length && count < 50; i++) {
  const line = lines[i];
  const stripped = line
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .replace(/`[^`]*`/g, "``");

  const opens = (stripped.match(/\{/g) || []).length;
  const closes = (stripped.match(/\}/g) || []).length;
  const diff = opens - closes;

  if (diff !== 0) {
    balance += diff;
    console.log(
      `L${i + 1} [diff:${diff > 0 ? "+" : ""}${diff}, bal:${balance}]: ${line.trim().substring(0, 80)}`,
    );
    count++;
  }
}
