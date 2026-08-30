// Map a staged test-cases.md into an ADO Test Plan: plan, suites, shared-step
// preconditions, tagged Test Cases, a test point per application, and a
// Tested By link per story. First-time push. Create-or-reuse at every level,
// so a mid-run failure resumes from a state file without duplicating.
//
//   node push-testplan.js <path-to-test-cases.md>
//
// Reads the Feature name and id from the file's first two content lines
// (`# <name>: test cases` and `Feature <id>.`), and takes Area/Iteration off
// that Feature. State lives in .scratch/tmp so a re-run resumes.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ORG = 'https://dev.azure.com/USASwimmingDevOps';
const PROJECT = 'USASApps';
const CONFIG = { 'Data Hub': 15, 'Mobile App': 16, 'SWIMS': 17 };

const FILE = process.argv[2];
if (!FILE || !fs.existsSync(FILE)) {
  console.error('Usage: node push-testplan.js <path-to-test-cases.md>');
  process.exit(1);
}
const SRC = path.relative(process.cwd(), FILE).replace(/\\/g, '/');

// repo root (nearest .git), for the throwaway state file under .scratch/tmp
function repoRoot(from) {
  let d = path.dirname(path.resolve(from));
  while (d !== path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.git'))) return d;
    d = path.dirname(d);
  }
  return path.dirname(path.resolve(from));
}
const ROOT = repoRoot(FILE);
const TMP = path.join(ROOT, '.scratch', 'tmp');
fs.mkdirSync(TMP, { recursive: true });

// ---------- az ----------
function az(args, { json = false } = {}) {
  const quoted = args.map((a) => (a === '' || /[^\w./:=-]/.test(a) ? `"${a}"` : a));
  const out = execFileSync('az.cmd', quoted, { shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return json ? JSON.parse(out || 'null') : out.trim();
}
function body(name, obj) {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, JSON.stringify(obj));
  return p;
}

// ---------- steps xml: Microsoft.VSTS.TCM.Steps, HTML escaped twice inside XML ----------
const h = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cell = (lines) => `<parameterizedString isformatted='true'>${h(lines.map((l) => `<P>${h(l)}</P>`).join(''))}</parameterizedString>`;
const stepsXml = (steps, sharedId) => {
  let id = 1;
  const ref = sharedId ? `<compref id='${++id}' ref='${sharedId}'><steps id='0' last='0'/></compref>` : '';
  const b = steps.map(([action, expected]) => {
    id += 1;
    const type = expected.length ? 'ValidateStep' : 'ActionStep';
    return `<step id='${id}' type='${type}'>${cell([action])}${cell(expected)}<description/></step>`;
  }).join('');
  return `<steps id='0' last='${id}'>${ref}${b}</steps>`.replace(/"/g, '&quot;');
};
const sharedStepsXml = (text) =>
  `<steps id='0' last='2'><step id='2' type='ActionStep'>${cell([text])}${cell([])}<description/></step></steps>`.replace(/"/g, '&quot;');

// ---------- parse ----------
function parse() {
  const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
  const titleM = lines.find((l) => /^#\s+/.test(l))?.match(/^#\s+(.*?):\s*test cases/i);
  const featureName = titleM ? titleM[1].trim() : null;
  const featM = lines.join('\n').match(/Feature\s+(\d+)\./);
  const featureId = featM ? featM[1] : null;
  if (!featureName || !featureId) throw new Error('Could not read Feature name/id from the file header');

  const pcs = {}; const suites = [];
  let section = null, curSuite = null, cur = null, inSteps = false;
  const push = () => { if (cur && cur.route) curSuite.cases.push(cur); cur = null; inSteps = false; };
  for (const line of lines) {
    if (line.startsWith('## ')) {
      push();
      const name = line.slice(3).trim();
      if (name === 'Preconditions') { section = 'pre'; curSuite = null; }
      else { section = 'suite'; curSuite = { name, cases: [] }; suites.push(curSuite); }
      continue;
    }
    if (section === 'pre') {
      const m = line.match(/^- `(PC-[A-Z]+)`\s+(.*)$/);
      if (m) pcs[m[1]] = m[2].trim();
      continue;
    }
    if (section === 'suite') {
      if (line.startsWith('### ')) { push(); cur = { title: line.slice(4).trim(), suite: curSuite.name, steps: [] }; continue; }
      if (!cur) continue;
      let m;
      if ((m = line.match(/^- route:\s*(.*)$/))) cur.route = m[1].trim();
      else if ((m = line.match(/^- tags:\s*(.*)$/))) cur.tags = m[1].trim();
      else if ((m = line.match(/^- ac:\s*(.*)$/))) cur.ac = m[1].trim();
      else if ((m = line.match(/^- story:\s*(.*)$/))) cur.story = m[1].trim();
      else if ((m = line.match(/^- apps:\s*(.*)$/))) cur.apps = m[1].trim();
      else if ((m = line.match(/^- pre:\s*(.*)$/))) cur.pre = m[1].trim();
      else if (/^- steps:\s*$/.test(line)) inSteps = true;
      else if (inSteps && (m = line.match(/^\s*\d+\.\s+(.*)$/))) {
        const p = m[1].split('=>');
        const expected = p.length > 1 ? p.slice(1).join('=>').trim() : '';
        cur.steps.push([p[0].trim(), expected ? [expected] : []]);
      }
    }
  }
  push();
  return { featureName, featureId, pcs, suites };
}

const desc = (c, pcText) => {
  const p = [`<p>Route: ${h(c.route)}</p>`, `<p>AC: ${h(c.ac || '')}</p>`, `<p>Stories: ${h(c.story || '')}</p>`];
  if (pcText) p.push(`<p>Precondition (${h(c.pre)}): ${h(pcText)}</p>`);
  p.push(`<p>Source: ${h(SRC)}</p>`);
  return p.join('');
};

// ---------- run ----------
const { featureName, featureId, pcs, suites } = parse();
const allCases = suites.flatMap((s) => s.cases);
const bad = allCases.filter((c) => !c.route || !c.tags || !c.apps || !c.pre || !c.steps.length);
if (bad.length) { console.error('Cases missing a required field:', bad.map((c) => c.title)); process.exit(1); }
console.log(`Feature ${featureId} "${featureName}": ${suites.length} suites, ${allCases.length} cases.`);

const STATE_PATH = path.join(TMP, `ado-testplan-${featureId}.json`);
const resuming = fs.existsSync(STATE_PATH);
let state = { planId: null, rootSuite: null, suites: {}, shared: {}, cases: {} };
if (resuming) state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
const save = () => fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

// First-time-or-resume only. Case reuse is state-file based, so a fresh run
// against an already-populated plan would duplicate every case. If a plan of
// this name already holds cases and there is no resume state, stop: updating an
// existing suite is a different job, out of this script's scope.
if (!resuming) {
  const existing = az(['devops', 'invoke', '--org', ORG, '--area', 'testplan', '--resource', 'plans', '--route-parameters', 'project=' + PROJECT,
    '--http-method', 'GET', '--api-version', '7.0', '--query', `value[?name=='${featureName}'].id`, '-o', 'tsv']);
  if (existing) {
    const rs = az(['devops', 'invoke', '--org', ORG, '--area', 'testplan', '--resource', 'suites', '--route-parameters', 'project=' + PROJECT, 'planId=' + existing.split(/\s+/)[0],
      '--http-method', 'GET', '--api-version', '7.0', '--query', 'value[0].id', '-o', 'tsv']);
    const n = rs ? az(['devops', 'invoke', '--org', ORG, '--area', 'testplan', '--resource', 'suites', '--route-parameters', 'project=' + PROJECT, 'planId=' + existing.split(/\s+/)[0],
      '--http-method', 'GET', '--api-version', '7.0', '--query', 'length(value[])', '-o', 'tsv']) : '0';
    if (Number(n) > 1) {
      console.error(`Plan "${featureName}" already exists with suites. This script only does a first-time push or resumes one (no resume state found for Feature ${featureId}). Updating an existing plan is a separate job outside this script.`);
      process.exit(2);
    }
  }
}

const [AREA, ITER] = az(['boards', 'work-item', 'show', '--id', featureId, '--org', ORG,
  '--query', '[fields."System.AreaPath", fields."System.IterationPath"]', '-o', 'tsv']).split(/\s+/);

// shared steps only for a manual/exploratory case's precondition
const sharedNeeded = new Set(allCases.filter((c) => c.route === 'manual' || c.route === 'exploratory').map((c) => c.pre).filter(Boolean));

// 1. plan (reuse by name)
if (!state.planId) {
  const found = az(['devops', 'invoke', '--org', ORG, '--area', 'testplan', '--resource', 'plans', '--route-parameters', 'project=' + PROJECT,
    '--http-method', 'GET', '--api-version', '7.0', '--query', `value[?name=='${featureName}'].{id:id,rootSuite:rootSuite.id}`, '-o', 'json'], { json: true });
  if (found && found.length) { state.planId = found[0].id; state.rootSuite = found[0].rootSuite; }
  else {
    const r = az(['devops', 'invoke', '--org', ORG, '--area', 'testplan', '--resource', 'plans', '--route-parameters', 'project=' + PROJECT,
      '--http-method', 'POST', '--in-file', body('plan.json', { name: featureName, description: 'Pushed from ' + SRC, area: { name: AREA }, iteration: ITER }),
      '--api-version', '7.0', '--query', '{id:id,rootSuite:rootSuite.id}', '-o', 'json'], { json: true });
    state.planId = r.id; state.rootSuite = r.rootSuite;
  }
  save();
  console.log(`Plan ${state.planId}`);
}

// 2. suites (reuse by name)
{
  const existing = az(['devops', 'invoke', '--org', ORG, '--area', 'testplan', '--resource', 'suites', '--route-parameters', 'project=' + PROJECT, 'planId=' + state.planId,
    '--http-method', 'GET', '--api-version', '7.0', '--query', 'value[].{id:id,name:name}', '-o', 'json'], { json: true }) || [];
  const byName = Object.fromEntries(existing.map((s) => [s.name, s.id]));
  for (const s of suites) {
    if (state.suites[s.name]) continue;
    if (byName[s.name]) { state.suites[s.name] = byName[s.name]; save(); continue; }
    const id = az(['devops', 'invoke', '--org', ORG, '--area', 'testplan', '--resource', 'suites', '--route-parameters', 'project=' + PROJECT, 'planId=' + state.planId,
      '--http-method', 'POST', '--in-file', body('suite.json', { suiteType: 'StaticTestSuite', name: s.name, parentSuite: { id: state.rootSuite } }), '--api-version', '7.0', '--query', 'id', '-o', 'tsv']);
    state.suites[s.name] = Number(id); save();
    console.log(`Suite '${s.name}' -> ${id}`);
  }
}

// 3. shared steps
for (const pc of sharedNeeded) {
  if (state.shared[pc]) continue;
  const id = az(['boards', 'work-item', 'create', '--org', ORG, '--project', PROJECT, '--type', 'Shared Steps', '--title', `${pc} precondition`,
    '--area', AREA, '--iteration', ITER, '--fields', `Microsoft.VSTS.TCM.Steps=${sharedStepsXml(pcs[pc])}`, '--query', 'id', '-o', 'tsv']);
  state.shared[pc] = Number(id); save();
  console.log(`Shared Steps ${pc} -> ${id}`);
}

// 4-7. cases: create, add to suite, one point per app, link stories
for (const c of allCases) {
  const st = (state.cases[c.title] = state.cases[c.title] || {});
  const suiteId = state.suites[c.suite];
  const useShared = (c.route === 'manual' || c.route === 'exploratory') && state.shared[c.pre];
  const pcText = useShared ? null : pcs[c.pre];
  const tags = c.tags.split(',').map((t) => t.trim()).join('; ') + '; ' + c.route;

  if (!st.id) {
    const id = az(['boards', 'work-item', 'create', '--org', ORG, '--project', PROJECT, '--type', 'Test Case', '--title', c.title, '--area', AREA, '--iteration', ITER,
      '--fields', `System.Tags=${tags}`, `System.Description=${desc(c, pcText)}`, `Microsoft.VSTS.TCM.Steps=${stepsXml(c.steps, useShared ? state.shared[c.pre] : null)}`, '--query', 'id', '-o', 'tsv']);
    st.id = Number(id); save();
    console.log(`Case ${st.id} '${c.title.slice(0, 48)}...'`);
  }
  if (!st.added) {
    az(['devops', 'invoke', '--org', ORG, '--area', 'testplan', '--resource', 'suitetestcase', '--route-parameters', 'project=' + PROJECT, 'planId=' + state.planId, 'suiteId=' + suiteId,
      '--http-method', 'POST', '--in-file', body('addcase.json', [{ workItem: { id: st.id } }]), '--api-version', '7.0']);
    st.added = true; save();
  }
  if (!st.pointed) {
    const pointAssignments = c.apps.split(',').map((a) => a.trim()).filter(Boolean).map((a) => ({ configurationId: CONFIG[a] }));
    az(['devops', 'invoke', '--org', ORG, '--area', 'testplan', '--resource', 'suitetestcase', '--route-parameters', 'project=' + PROJECT, 'planId=' + state.planId, 'suiteId=' + suiteId,
      '--http-method', 'PATCH', '--in-file', body('points.json', [{ workItem: { id: st.id }, pointAssignments }]), '--api-version', '7.0']);
    st.pointed = true; save();
  }
  if (!st.linked) {
    for (const sid of (c.story || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      try {
        az(['boards', 'work-item', 'relation', 'add', '--org', ORG, '--id', sid, '--relation-type', 'Tested By', '--target-id', String(st.id)]);
      } catch (e) {
        if (!/already|exist/i.test(String(e.stderr || e.message || ''))) throw e; // tolerate a resume re-add
      }
    }
    st.linked = true; save();
  }
}

// verify per suite
console.log('\nVerification (suite: cases / missing-point / points):');
let okAll = true;
for (const s of suites) {
  const id = state.suites[s.name];
  const q = (query) => az(['devops', 'invoke', '--org', ORG, '--area', 'testplan', '--resource', 'suitetestcase', '--route-parameters', 'project=' + PROJECT, 'planId=' + state.planId, 'suiteId=' + id,
    '--http-method', 'GET', '--api-version', '7.0', '--query', query, '-o', 'tsv']);
  const cases = q('count'), missing = q('length(value[?length(pointAssignments)==`0`])'), points = q('length(value[].pointAssignments[])');
  const ok = Number(missing) === 0 && Number(cases) === s.cases.length;
  okAll = okAll && ok;
  console.log(`  ${ok ? 'OK ' : 'XX '} ${s.name}: ${cases}/${missing}/${points}`);
}
console.log(`\n${okAll ? 'DONE. Plan ' + state.planId + ' verified.' : 'INCOMPLETE. Re-run to resume; see mismatches above.'}`);
