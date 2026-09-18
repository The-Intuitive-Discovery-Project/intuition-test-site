import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'daily-hidden-target.html',
  'future-photo.html',
  'sealed-target-practice.html',
  'hidden-symbol-delay.html',
  'prediction-time-capsule.html',
];

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const staticButtons = [...html.matchAll(/<button\b[^>]*>/gi)].map(m => m[0]);
  assert.ok(staticButtons.length > 0, `${file}: expected buttons`);
  for (const tag of staticButtons) {
    assert.match(tag, /\btype=["']button["']/i, `${file}: every static button must explicitly use type="button": ${tag}`);
  }
}

const daily = fs.readFileSync('daily-hidden-target.html', 'utf8');
assert.match(daily, /id=["']lock["']/, 'Daily Hidden Target: lock button missing');
assert.match(daily, /id=["']nextDay["']/, 'Daily Hidden Target: next-day test button missing');
assert.match(daily, /id=["']rating["']/, 'Daily Hidden Target: rating group missing');
assert.match(daily, /\$\('lock'\)\.addEventListener\('click',lock\)/, 'Daily Hidden Target: lock click handler missing');
assert.match(daily, /\$\('nextDay'\)\.addEventListener\('click',nextTestDay\)/, 'Daily Hidden Target: next-day click handler missing');
assert.match(daily, /\$\('rating'\)\.addEventListener\('click'/, 'Daily Hidden Target: delegated rating handler missing');
assert.doesNotMatch(daily, /\$\('day'\)\.textContent/, 'Daily Hidden Target: stale #day render reference must not return');

const future = fs.readFileSync('future-photo.html', 'utf8');
for (const id of ['start','lock','new','rating']) assert.match(future, new RegExp(`id=["']${id}["']`), `Future Photo: ${id} control missing`);
assert.match(future, /function prepareFields\(\)/, 'Future Photo: field reset helper missing');
assert.match(future, /\$\('rating'\)\.addEventListener\('click'/, 'Future Photo: delegated rating handler missing');

const sealed = fs.readFileSync('sealed-target-practice.html', 'utf8');
for (const id of ['start','lock','again','ratings']) assert.match(sealed, new RegExp(`id=["']${id}["']`), `Sealed Target: ${id} control missing`);
assert.match(sealed, /\$\('ratings'\)\.addEventListener\('click'/, 'Sealed Target: delegated rating handler missing');

const symbol = fs.readFileSync('hidden-symbol-delay.html', 'utf8');
for (const id of ['start','again','symbols']) assert.match(symbol, new RegExp(`id=["']${id}["']`), `Hidden Symbol: ${id} control missing`);
assert.match(symbol, /b\.type=['"]button['"]/, 'Hidden Symbol: generated symbol buttons must use type="button"');
assert.match(symbol, /\$\('start'\)\.addEventListener\('click',start\)/, 'Hidden Symbol: start click handler missing');
assert.match(symbol, /\$\('again'\)\.addEventListener\('click',reset\)/, 'Hidden Symbol: reset click handler missing');

const capsule = fs.readFileSync('prediction-time-capsule.html', 'utf8');
assert.match(capsule, /id=["']seal["']/, 'Prediction Time Capsule: seal button missing');
assert.match(capsule, /id=["']capsules["']/, 'Prediction Time Capsule: capsule action container missing');
assert.match(capsule, /\$\('seal'\)\.addEventListener\('click',create\)/, 'Prediction Time Capsule: seal click handler missing');
assert.match(capsule, /\$\('capsules'\)\.addEventListener\('click'/, 'Prediction Time Capsule: delegated action handler missing');

console.log('Delayed Validation Lab button smoke checks passed for 5 tools.');
