import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const messagesDir = path.join(__dirname, '../messages');
const srcDirs = [path.join(__dirname, '../app'), path.join(__dirname, '../components')];

function flattenObject(ob) {
  let toReturn = {};
  for (let i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    if (typeof ob[i] === 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
      let flatObject = flattenObject(ob[i]);
      for (let x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;
        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
}

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function checkTranslations() {
  try {
    const files = await fs.readdir(messagesDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      console.log('No JSON files found in messages directory.');
      return;
    }

    const locales = {};
    const flatLocales = {};
    const allJsonKeys = new Set();
    
    for (const file of jsonFiles) {
      const locale = path.basename(file, '.json');
      const content = await fs.readFile(path.join(messagesDir, file), 'utf8');
      const data = JSON.parse(content);
      
      locales[locale] = data;
      const flat = flattenObject(data);
      flatLocales[locale] = flat;
      Object.keys(flat).forEach(k => allJsonKeys.add(k));
    }
    
    let hasMissing = false;
    
    // 1. Check missing keys per locale
    console.log('--- Checking JSON file consistency ---');
    for (const locale of Object.keys(locales)) {
      const missingKeys = [];
      const flat = flatLocales[locale];
      
      for (const key of allJsonKeys) {
        if (flat[key] === undefined) {
          missingKeys.push(key);
        }
      }
      
      if (missingKeys.length > 0) {
        hasMissing = true;
        console.log(`❌ Locale '${locale}' is missing ${missingKeys.length} keys from other locales:`);
        missingKeys.forEach(k => console.log(`  - ${k}`));
      } else {
        console.log(`✅ Locale '${locale}' has all keys compared to other JSON files.`);
      }
    }

    console.log('\n--- Checking source code for missing translations ---');
    const sourceKeys = new Set();
    const sourceKeyLocations = new Map(); // key -> file[]
    
    const baseLocaleJson = flatLocales['en'] || Object.values(flatLocales)[0];

    for (const dir of srcDirs) {
      const allSrcFiles = await getFiles(dir);
      const tsxFiles = allSrcFiles.filter(f => f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js'));
      
      for (const file of tsxFiles) {
        const content = await fs.readFile(file, 'utf8');
        
        // Map variable names to namespaces
        // Example: const t = useTranslations('nav') -> { t: 'nav' }
        // Example: const t = await getTranslations({ locale, namespace: 'chat' }) -> { t: 'chat' }
        const nsMap = {};
        const nsRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:['"]([a-zA-Z0-9_.-]+)['"]|{\s*(?:locale\s*,\s*)?namespace\s*:\s*['"]([a-zA-Z0-9_.-]+)['"]\s*})\s*\)/g;

        let nsMatch;
        while ((nsMatch = nsRegex.exec(content)) !== null) {
          const varName = nsMatch[1];
          const ns = nsMatch[2] || nsMatch[3];
          nsMap[varName] = ns;
        }

        // Also check for props or other ways t might be passed
        // This is a bit harder, but we can assume 't' is the default if no namespace is found yet
        if (!nsMap['t'] && (content.includes('useTranslations()') || content.includes('getTranslations()'))) {
            // No namespace provided to the hook, so keys should be absolute or the file doesn't use namespaces
        }

        const tRegex = /([^a-zA-Z0-9_])([a-zA-Z0-9_]+)\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
        let match;
        while ((match = tRegex.exec(content)) !== null) {
          const fnName = match[2];
          let key = match[3];
          
          if (nsMap[fnName]) {
            const namespace = nsMap[fnName];
            // If the key doesn't already contain a dot, and we have a namespace, prepend the namespace
            if (!key.includes('.')) {
              key = `${namespace}.${key}`;
            }
            sourceKeys.add(key);
            if (!sourceKeyLocations.has(key)) {
              sourceKeyLocations.set(key, []);
            }
            sourceKeyLocations.get(key).push(file);
          } else if (fnName === 't') {
            // Default 't' if not explicitly defined in this file (might be passed as prop)
            // We'll try to guess if there's ONLY one namespace in the file
            const namespaces = Object.values(nsMap);
            if (namespaces.length === 1) {
                if (!key.includes('.')) {
                    key = `${namespaces[0]}.${key}`;
                }
            }
            // If multiple namespaces or none, we can't reliably know unless we analyze the full scope
            // For now, let's at least add it if it's likely a translation call
            sourceKeys.add(key);
            if (!sourceKeyLocations.has(key)) {
              sourceKeyLocations.set(key, []);
            }
            sourceKeyLocations.get(key).push(file);
          }
        }
      }
    }

    let missingInSource = 0;

    for (const key of sourceKeys) {
      if (baseLocaleJson[key] === undefined) {
        missingInSource++;
        hasMissing = true;
        console.log(`❌ Missing translation for key referenced in code: '${key}'`);
        console.log(`   Used in: ${[...new Set(sourceKeyLocations.get(key))].join(', ')}`);
      }
    }

    if (missingInSource === 0) {
      console.log('✅ All translation keys used in source code exist in JSON files!');
    } else {
      console.log(`\nFound ${missingInSource} missing translations used in the code.`);
    }

    if (hasMissing) {
      console.log(`\nRun \`node scripts/check-translations.mjs\` again after fixing the issues.`);
      process.exit(1);
    } else {
      console.log('\n🌟 All translations are up to date! Everything is in sync.');
    }
    
  } catch (err) {
    console.error('Error checking translations:', err);
    process.exit(1);
  }
}

checkTranslations();
