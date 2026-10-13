import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Inspect UI messages without executing application modules or reading Quran source text.
const root = path.resolve(import.meta.dirname, '..');
const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const messages = new Set();
const unresolved = [];
const dynamicSources = [];

function resolve(node, seen = new Set()) {
  if (!node || seen.has(node)) return undefined;
  seen = new Set(seen).add(node);
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return resolve(node.expression, seen);
  if (ts.isObjectLiteralExpression(node)) {
    const value = {};
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property)) value[property.name.getText().replace(/^['"]|['"]$/g, '')] = resolve(property.initializer, seen);
      else if (ts.isShorthandPropertyAssignment(property)) value[property.name.text] = resolve(property.name, seen);
    }
    return value;
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(item => resolve(item, seen));
  if (ts.isIdentifier(node)) {
    let symbol = checker.getSymbolAtLocation(node);
    if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const declaration = symbol?.valueDeclaration;
    if (declaration && ts.isVariableDeclaration(declaration)) return resolve(declaration.initializer, seen);
    if (declaration && ts.isShorthandPropertyAssignment(declaration)) {
      const target = checker.getShorthandAssignmentValueSymbol(declaration)?.valueDeclaration;
      if (target && ts.isVariableDeclaration(target)) return resolve(target.initializer, seen);
    }
  }
  if (ts.isPropertyAccessExpression(node)) return resolve(node.expression, seen)?.[node.name.text];
  return undefined;
}

function addEnglish(node, source) {
  if (ts.isConditionalExpression(node)) {
    addEnglish(node.whenTrue, source);
    addEnglish(node.whenFalse, source);
    return;
  }
  if (ts.isParenthesizedExpression(node)) return addEnglish(node.expression, source);
  const value = resolve(node);
  if (typeof value === 'string') messages.add(value);
  else {
    const position = source.getLineAndCharacterOfPosition(node.getStart());
    const file = path.relative(root, source.fileName);
    const expression = node.getText(source);
    const location = `${file}:${position.line + 1}: ${expression}`;
    // Each of these selectors is enumerated below or at the helper's call sites.
    const covered = (file === 'src/domain/cities.ts' && expression === 'country.name')
      || (file === 'src/components/LanguagePicker.tsx' && expression === 'item.name')
      || (['src/components/QuranThemePicker.tsx', 'src/components/SettingsSheet.tsx'].includes(file) && expression === 'theme.name')
      || (file === 'src/components/DownloadManager.tsx' && expression === 'en');
    (covered ? dynamicSources : unresolved).push(location);
  }
}

for (const source of program.getSourceFiles()) {
  if (!source.fileName.startsWith(root + path.sep) || source.fileName.includes('/node_modules/') || source.fileName === path.join(root, 'src/localization.ts') || /\.test\.[cm]?[jt]sx?$/.test(source.fileName)) continue;
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source).split('.').at(-1);
      if (name === 'bilingual' && node.arguments[2]) addEnglish(node.arguments[2], source);
      // The download manager's local helper forwards its second argument to bilingual.
      if (name === 'say' && source.fileName.endsWith('/DownloadManager.tsx') && node.arguments[1]) addEnglish(node.arguments[1], source);
      if (name === 'message' && node.arguments[1]) addEnglish(node.arguments[1], source);
      if (name === 'localizeCopy' && node.arguments[1]) {
        const english = resolve(node.arguments[1])?.en;
        if (english) {
          for (const text of Object.values(english)) if (typeof text === 'string') messages.add(text);
        } else unresolved.push(`${path.relative(root, source.fileName)}: unresolved localizeCopy English object`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

// Theme labels are selected dynamically by the UI, so inspect their English name field.
const themeFile = path.join(root, 'src/domain/quran-theme.ts');
if (fs.existsSync(themeFile)) {
  const source = ts.createSourceFile(themeFile, fs.readFileSync(themeFile, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'name' && ts.isStringLiteralLike(node.initializer)) messages.add(node.initializer.text);
    ts.forEachChild(node, visit);
  }
  visit(source);
}

// Dynamic selectors use catalog entries for country and language names as well.
for (const country of JSON.parse(fs.readFileSync(path.join(root, 'src/data/countries.json'), 'utf8'))) messages.add(country.name);
const languageSource = program.getSourceFile(path.join(root, 'src/domain/languages.ts'));
function addLanguageNames(node) {
  if (ts.isPropertyAssignment(node) && node.name.getText(languageSource) === 'name' && ts.isStringLiteralLike(node.initializer)) messages.add(node.initializer.text);
  ts.forEachChild(node, addLanguageNames);
}
addLanguageNames(languageSource);

const localeDirectory = path.join(root, 'src/locales');
const englishPath = path.join(localeDirectory, 'en.json');
const english = JSON.parse(fs.readFileSync(englishPath, 'utf8'));
const known = new Set(Object.values(english));
const missing = [...messages].filter(text => !known.has(text));
if (process.argv.includes('--write-en')) {
  let next = Math.max(...Object.keys(english).map(id => Number(id.slice(1)))) + 1;
  for (const text of missing) english[`m${String(next++).padStart(3, '0')}`] = text;
  fs.writeFileSync(englishPath, JSON.stringify(english, null, 2) + '\n');
}
const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join(',');
const catalogs = fs.readdirSync(localeDirectory).filter(name => name.endsWith('.json') && name !== 'en.json').map(name => {
  const catalog = JSON.parse(fs.readFileSync(path.join(localeDirectory, name), 'utf8'));
  return {
    locale: name.slice(0, -5),
    missing: Object.keys(english).filter(id => typeof catalog[id] !== 'string' || !catalog[id].trim()),
    extra: Object.keys(catalog).filter(id => !Object.hasOwn(english, id)),
    invalidPlaceholders: Object.entries(english).filter(([id, text]) => catalog[id] !== undefined && placeholders(text) !== placeholders(catalog[id])).map(([id]) => id),
  };
});
console.log(JSON.stringify({ activeMessages: messages.size, catalogMessages: Object.keys(english).length, missing, unresolved, dynamicSources, catalogs }, null, 2));
if (missing.length && !process.argv.includes('--write-en') || unresolved.length || catalogs.some(catalog => catalog.missing.length || catalog.extra.length || catalog.invalidPlaceholders.length)) process.exitCode = 1;
