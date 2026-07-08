import type { TestRunnerConfig } from '@storybook/test-runner'

const config: TestRunnerConfig = {
  setup() {
    // Increase Jest timeout from the default 15000ms to 60000ms
    // to prevent cold-start compilation timeouts in CI/test runner.
    jest.setTimeout(60000)
  },
}

export default config
