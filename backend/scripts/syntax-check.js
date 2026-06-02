const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', 'src');

function collectJsFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'coverage') {
        continue;
      }
      collectJsFiles(fullPath, fileList);
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

function main() {
  const files = collectJsFiles(rootDir);
  const failures = [];

  for (const filePath of files) {
    const result = spawnSync(process.execPath, ['--check', filePath], {
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      failures.push({
        filePath,
        stderr: result.stderr.trim(),
      });
    }
  }

  if (failures.length > 0) {
    console.error(`Syntax check failed for ${failures.length} file(s):`);
    for (const failure of failures) {
      console.error(`\n- ${failure.filePath}`);
      if (failure.stderr) {
        console.error(failure.stderr);
      }
    }
    process.exit(1);
  }

  console.log(`Syntax check passed for ${files.length} JavaScript file(s).`);
}

main();
