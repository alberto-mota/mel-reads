// Lists everything Sparkle can say, as JSON [{ id, text }], for generate.py.
// Usage: node tools/voice/texts.mjs > texts.json
import fs from 'node:fs';
import vm from 'node:vm';

const read = f => fs.readFileSync(new URL(`../../src/${f}`, import.meta.url), 'utf8');
const src = `${read('content.js')}\n${read('math.js')}\n;({ texts: [...new Set([...allSpokenTexts(), ...mathSpokenTexts().map(clipText)])], clipId })`;
const { texts, clipId } = vm.runInNewContext(src, {});
const items = texts.map(text => ({ id: clipId(text), text }));
const ids = new Set(items.map(x => x.id));
if (ids.size !== items.length) throw new Error('clip id collision');
process.stdout.write(JSON.stringify(items, null, 1) + '\n');
