import '@goodwidget/ecosystem-widget/register'
import { createMockEip1193Provider } from '../../../../examples/storybook/src/fixtures/mockEip1193'

const fixtureWindow = window as unknown as { productionProvider: ReturnType<typeof createMockEip1193Provider> }
fixtureWindow.productionProvider = createMockEip1193Provider()
