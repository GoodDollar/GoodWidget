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
    const preview = source.split(/\n  preview:\n/)[1].split(/\n  production:\n/)[0]
    const production = source.split(/\n  production:\n/)[1]

    assert.match(source, /branches:\s*\n\s+- main\s*\n\s+- next/)
    assert.match(source, /commit_sha:/)
    assert.match(source, /github\.ref != 'refs\/heads\/main'.*github\.ref != 'refs\/heads\/next'/)
    assert.match(preview, /always\(\)/)
    assert.match(preview, /needs\.authorize-preview\.result == 'success'/)
    assert.match(preview, /github\.ref == 'refs\/heads\/main'/)
    assert.match(preview, /vercel pull --yes --environment=preview/)
    assert.doesNotMatch(preview, /--prod(?:\s|$)/m)
    assert.match(production, /github\.ref == 'refs\/heads\/next'/)
    assert.match(production, /git merge-base --is-ancestor "\$DEPLOY_SHA" origin\/next/)
    assert.match(production, /vercel build --prod/)
    assert.match(production, /vercel deploy --prebuilt --prod/)
    assert.match(production, /ref: \$\{\{ inputs\.commit_sha \|\| github\.sha \}\}/)
  })
}

test('release dispatches all production deploys at the release commit', () => {
  const source = workflow('release-next.yml')

  assert.match(source, /release_sha: \$\{\{ steps\.release\.outputs\.release_sha \}\}/)
  assert.match(source, /echo "release_sha=\$\(git rev-parse HEAD\)"/)
  assert.match(source, /needs: release/)
  for (const name of deployments) assert.match(source, new RegExp(name.replaceAll('.', '\\.')))
  assert.match(source, /--field "commit_sha=\$RELEASE_SHA"/)
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
