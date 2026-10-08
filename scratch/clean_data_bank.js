import fs from 'fs';
import path from 'path';

function stripHardcodedPaths(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    if (obj.includes("absolute_path") || obj.includes("Recovered_school_app")) {
      try {
        const parsed = JSON.parse(obj);
        return JSON.stringify(stripHardcodedPaths(parsed));
      } catch {
        return obj.replace(/D:[\\\/]Recovered_school_app[\\\/]PAPERGENERATOR[\\\/]/gi, '');
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripHardcodedPaths(item));
  }
  if (typeof obj === "object") {
    const cleanObj = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "absolute_path") continue;
      cleanObj[k] = stripHardcodedPaths(v);
    }
    return cleanObj;
  }
  return obj;
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(full);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        const raw = fs.readFileSync(full, 'utf8');
        if (raw.includes('Recovered_school_app') || raw.includes('absolute_path')) {
          const parsed = JSON.parse(raw);
          const cleaned = stripHardcodedPaths(parsed);
          fs.writeFileSync(full, JSON.stringify(cleaned, null, 2), 'utf8');
          console.log(`Cleaned: ${entry.name}`);
        }
      } catch (err) {
        console.error(`Error processing ${full}:`, err.message);
      }
    }
  }
}

const bankDir = path.resolve('./data/Bank');
console.log('Cleaning JSON files in:', bankDir);
processDirectory(bankDir);
console.log('Finished cleaning disk files.');
