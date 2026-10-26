// Lists everything Sparkle can say, as JSON [{ id, text }], for generate.py.
// Usage: node tools/voice/texts.mjs > texts.json
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../../src/content.js', import.meta.url), 'utf8');
const { texts, clipId } = vm.runInNewContext(`${src}\n;({ texts: allSpokenTexts(), clipId })`, {});
const items = texts.map(text => ({ id: clipId(text), text }));
const ids = new Set(items.map(x => x.id));
if (ids.size !== items.length) throw new Error('clip id collision');
process.stdout.write(JSON.stringify(items, null, 1) + '\n');
