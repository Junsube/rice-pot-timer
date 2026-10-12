const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../dist/index.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { style: {}, dataset: {}, classList: { toggle() {} }, addEventListener(type, fn) { this[type] = fn }, focus() {} });
  return elements.get(id);
}
let interval, alarms = 0;
const context = vm.createContext({
  document: { getElementById: element, documentElement: { dataset: {} }, querySelector: element, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem() {} },
  window: {}, structuredClone, setInterval: fn => (interval = fn, 1), clearInterval() {}
});
vm.runInContext(source, context);
context.alarm = () => alarms++;
vm.runInContext('sound = alarm', context);
const state = expression => vm.runInContext(expression, context);
for (const delay of [5, 10, 17, 0]) {
  state(`reset(); delayChoice='custom'; customDelay=${delay}`);
  element('startBtn').click();
  assert.equal(state('preparation'), delay);
  assert.equal(state('remaining'), 180);
  if (delay) {
    interval();
    element('startBtn').click();
    const paused = state('preparation');
    element('startBtn').click();
    assert.equal(state('preparation'), paused, 'resume must not restart preparation');
    for (let i = 1; i < delay; i++) interval();
    assert.equal(state('preparation'), 0);
    assert.equal(state('remaining'), 180, 'preparation must not consume cooking time');
  }
  interval();
  assert.equal(state('remaining'), 179);
}
state('reset(); preparation=0; current=0; remaining=11; warningSeconds=10; warningEnabled=true');
const before = alarms;
interval();
assert.equal(alarms, before + 1);
state('warningEnabled=false; remaining=11'); interval();
assert.equal(alarms, before + 1);
state('remaining=1'); interval();
assert.equal(state('current'), 1);
assert.equal(state('remaining'), 300);
element('themeBtn').click();
assert.equal(context.document.documentElement.dataset.theme, 'dark');
element('themeBtn').click();
assert.equal(context.document.documentElement.dataset.theme, 'light');
assert.equal(state('clampDelay(-3)'), 0);
assert.equal(state('clampDelay(999)'), 300);
assert.equal(state('clampDelay("invalid")'), 0);
console.log('PASS: preparation, pause/resume, warning, stage transition, theme, input bounds');
