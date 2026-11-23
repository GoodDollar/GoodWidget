import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const workflow = (name) =>
  readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8')

const deployments = [
  'deploy-storybook.yml',
  'deploy-ai-credits-web.yml',
  'deploy-superfluid-campaign-web.yml',
  'deploy-gooddata-analytics-web.yml',
]

for (const name of deployments) {
  test(`${name} deploys main to Preview and next to Production`, () => {
    const source = workflow(name)
    const push = source.split(/\n  push:\n/)[1].split(/\n  pull_request_target:\n/)[0]
    const preview = source.split(/\n  preview:\n/)[1].split(/\n  production:\n/)[0]
    const production = source.split(/\n  production:\n/)[1]

    assert.match(push, /branches:\s*\n\s+- main/)
    assert.doesNotMatch(push, /-\s+next/)
    assert.match(source, /commit_sha:/)
    assert.match(source, /github\.ref != 'refs\/heads\/main'.*github\.ref != 'refs\/heads\/next'/)
    assert.match(preview, /always\(\)/)
    assert.match(preview, /needs\.authorize-preview\.result == 'success'/)
    assert.match(preview, /github\.ref == 'refs\/heads\/main'/)
    assert.match(preview, /vercel pull --yes --environment=preview/)
    assert.doesNotMatch(preview, /--prod(?:\s|$)/m)
    assert.match(production, /github\.ref == 'refs\/heads\/next'/)
    assert.match(production, /github\.event_name == 'workflow_dispatch'/)
    assert.match(production, /git merge-base --is-ancestor "\$DEPLOY_SHA" origin\/next/)
    assert.match(production, /vercel build --prod/)
    assert.match(production, /vercel deploy --prebuilt --prod/)
    assert.match(production, /ref: \$\{\{ inputs\.commit_sha \|\| github\.sha \}\}/)
  })
}

test('release dispatches only selected production apps at the release commit', () => {
  const source = workflow('release-next.yml')
  const dispatch = source.split(/\n  deploy-production:\n/)[1]

  assert.match(source, /release_sha: \$\{\{ steps\.release\.outputs\.release_sha \}\}/)
  assert.match(source, /echo "release_sha=\$\(git rev-parse HEAD\)"/)
  assert.match(source, /needs: release/)
  for (const name of deployments) assert.match(source, new RegExp(name.replaceAll('.', '\\.')))
  assert.match(dispatch, /needs: release/)
  assert.doesNotMatch(dispatch, /if: always\(\)/)
  assert.match(dispatch, /GH_REPO: \$\{\{ github\.repository \}\}/)
  assert.match(dispatch, /--repo "\$GH_REPO"/)
  assert.match(dispatch, /--ref next/)
  assert.match(dispatch, /--field "commit_sha=\$RELEASE_SHA"/)
  assert.match(dispatch, /\[ "\$\{!variable\}" = "true" \]/)
  assert.match(dispatch, /status=1/)
  assert.match(dispatch, /exit "\$status"/)
  assert.match(dispatch, /No production apps selected; skipping app deployments/)
  assert.match(dispatch, /"DEPLOY_STORYBOOK:deploy-storybook\.yml"/)
  assert.match(dispatch, /"DEPLOY_AI_CREDITS:deploy-ai-credits-web\.yml"/)
  assert.match(dispatch, /"DEPLOY_SUPERFLUID_CAMPAIGN:deploy-superfluid-campaign-web\.yml"/)
  assert.match(dispatch, /"DEPLOY_GOODDATA:deploy-gooddata-analytics-web\.yml"/)
})

test('promotion opts into each app independently and forwards safe defaults', () => {
  const source = workflow('promote-next.yml')

  for (const name of [
    'deploy_storybook',
    'deploy_ai_credits',
    'deploy_superfluid_campaign',
    'deploy_gooddata',
  ]) {
    const input = source.split(new RegExp(`\\n      ${name}:\\n`))[1]
    assert.match(input, /type: boolean/)
    assert.match(input, /default: false/)
    assert.match(source, new RegExp(`--field "${name}=\\$DEPLOY_[A-Z_]+"`))
  }
  assert.match(source, /git switch --create next origin\/main/)
  const trigger = source.split(/\n      - name: Start the release\n/)[1]
  assert.match(trigger, /GH_REPO: \$\{\{ github\.repository \}\}/)
  assert.match(trigger, /--repo "\$GH_REPO"/)
  assert.match(trigger, /--ref next/)
})

test('push and omitted release selections do not start production deployments', () => {
  const source = workflow('release-next.yml')
  const push = source.split(/\n  push:\n/)[1].split(/\n  # A push made/)[0]

  assert.match(push, /branches: \[next\]/)
  for (const name of [
    'deploy_storybook',
    'deploy_ai_credits',
    'deploy_superfluid_campaign',
    'deploy_gooddata',
  ]) {
    const input = source.split(new RegExp(`\\n      ${name}:\\n`))[1]
    assert.match(input, /type: boolean/)
    assert.match(input, /default: false/)
  }
})

test('npm release and recovery use OIDC without registry token fallbacks', () => {
  for (const name of ['release-next.yml', 'recover-release.yml']) {
    const source = workflow(name)

    assert.match(source, /id-token:\s*write/)
    assert.doesNotMatch(source, /NPM_TOKEN|NODE_AUTH_TOKEN/)
    assert.match(source, /refs\/heads\/next/)
  }
  assert.equal(existsSync(new URL('../../.github/workflows/npm-publish.yml', import.meta.url)), false)
})
