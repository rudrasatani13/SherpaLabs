#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const actionPath = join(repoRoot, 'templates', 'aimcp-lint-action', 'action.yml');
const actionSource = await readFile(actionPath, 'utf8');
const action = parse(actionSource);

const checks = [];

check('action is a composite action', () => {
  assert(action.runs?.using === 'composite', 'runs.using must be composite.');
});

check('required public inputs are present', () => {
  const inputs = action.inputs ?? {};

  assert(inputs['server-command']?.required === true, 'server-command must be required.');
  assert(inputs['min-score']?.default === '80', 'min-score default must be 80.');
  assert(inputs.format?.default === 'terminal', 'format default must be terminal.');
  assert(
    String(inputs.format?.description ?? '').includes('summary/comment'),
    'format description must document summary/comment rendering.',
  );
});

check('outputs are wired to the lint step', () => {
  const outputs = action.outputs ?? {};

  assert(outputs.score?.value === '${{ steps.lint.outputs.score }}', 'score output is wrong.');
  assert(
    outputs['max-score']?.value === '${{ steps.lint.outputs.max_score }}',
    'max-score output is wrong.',
  );
  assert(outputs.passed?.value === '${{ steps.lint.outputs.passed }}', 'passed output is wrong.');
  assert(
    outputs['report-path']?.value === '${{ steps.lint.outputs.report_path }}',
    'report-path output is wrong.',
  );
});

check('lint step keeps CLI execution CI-safe and renders action format', () => {
  const lintStep = findStep((step) => step.id === 'lint');
  const run = String(lintStep.run ?? '');

  assert(run.includes('--format json --quiet'), 'lint command must use JSON quiet internally.');
  assert(run.includes('case "$AIMCP_ACTION_FORMAT" in'), 'format input must be validated.');
  assert(run.includes('terminal|json|markdown'), 'format validator must allow all formats.');
  assert(run.includes('AIMCP_SUMMARY_FILE'), 'lint step must create a summary render file.');
  assert(run.includes('AIMCP_COMMENT_FILE'), 'lint step must create a comment render file.');
  assert(
    run.includes('>> "$GITHUB_STEP_SUMMARY"'),
    'lint step must append rendered output to the step summary.',
  );
  assert(
    lintStep.env?.AIMCP_ACTION_FORMAT === '${{ inputs.format }}',
    'lint step must expose the format input as AIMCP_ACTION_FORMAT.',
  );
});

check('PR comment step posts or updates rendered action output', () => {
  const commentStep = findStep((step) => step.name === 'Post PR comment');
  const script = String(commentStep.with?.script ?? '');
  const condition = String(commentStep.if ?? '');

  assert(commentStep.uses === 'actions/github-script@v7', 'PR comments must use github-script v7.');
  assert(condition.includes('always()'), 'PR comment step must still run after lint failures.');
  assert(
    condition.includes("inputs.post-comment == 'true'"),
    'post-comment input must gate comments.',
  );
  assert(condition.includes("github.event_name == 'pull_request'"), 'comments must be PR-only.');
  assert(
    condition.includes("steps.lint.outputs.report_path != ''"),
    'comments must require a report path from the lint step.',
  );
  assert(script.includes('AIMCP_COMMENT_FILE'), 'comment step must read rendered comment output.');
  assert(script.includes('<!-- aimcp-lint-report -->'), 'comment step must use a stable marker.');
  assert(script.includes('listComments'), 'comment step must search existing comments.');
  assert(script.includes('updateComment'), 'comment step must update existing comments.');
  assert(script.includes('createComment'), 'comment step must create missing comments.');
});

for (const result of checks) {
  console.log(`ok - ${result}`);
}

console.log(`Phase 25 action template validation passed (${checks.length} checks).`);

function findStep(predicate) {
  const step = action.runs?.steps?.find(predicate);

  assert(step !== undefined, 'Expected action step was not found.');

  return step;
}

function check(name, callback) {
  callback();
  checks.push(name);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
