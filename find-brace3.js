const fs = require("fs");
const lines = fs
  .readFileSync(
    "./frontend/src/pages/Inbox/RefurbishmentResponseModal.jsx",
    "utf8",
  )
  .split("\n");

// Find where balance first reaches specific levels
let balance = 0;
const log = [];

for (let i = 0; i < lines.length; i++) {
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
    log.push([i + 1, diff, balance, line.trim().substring(0, 80)]);
  }
}

console.log(`Final balance: ${balance}`);
console.log("\n--- Lines 455-660 brace changes ---");
log
  .filter(([ln]) => ln >= 455 && ln <= 660)
  .forEach(([ln, diff, bal, text]) => {
    console.log(
      `L${ln} [diff:${diff > 0 ? "+" : ""}${diff}, bal:${bal}]: ${text}`,
    );
  });
