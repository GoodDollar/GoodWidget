import React, { useState } from 'react'
import { GoodWidgetProvider, useWallet, useHost } from '@goodwidget/core'
import { ClaimWidget } from '@goodwidget/claim-widget'
import {
  createGoodWidgetConfig,
  getThemeManifest,
  MiniAppShell,
  Card,
  Heading,
  Text,
  Button,
  ButtonText,
  Input,
  TokenAmount,
  WalletInfo,
  Alert,
  Badge,
  BadgeText,
  Spinner,
  Separator,
  Checkbox,
  Switch,
  Select,
  ActionSheet,
  XStack,
  YStack,
} from '@goodwidget/ui'

function OverrideShowcase() {
  const [activeTab, setActiveTab] = useState<
    'default' | 'tokens' | 'component' | 'host' | 'inline'
  >('default')
  const { address, chainId } = useWallet()
  const { host } = useHost()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [checked, setChecked] = useState(false)
  const [switchOn, setSwitchOn] = useState(false)
  const [selectVal, setSelectVal] = useState('')

  const manifest = getThemeManifest()

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'default', label: 'Default' },
    { key: 'tokens', label: 'Tokens' },
    { key: 'component', label: 'Component' },
    { key: 'host', label: 'Host' },
    { key: 'inline', label: 'Inline' },
  ]

  return (
    <MiniAppShell
      title="Style Override Demo"
      headerRight={
        <Badge type="info">
          <BadgeText>{host}</BadgeText>
        </Badge>
      }
    >
      {/* Tab bar */}
      <XStack gap="$1" flexWrap="wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={activeTab === tab.key ? 'primary' : 'secondary'}
            onPress={() => setActiveTab(tab.key)}
          >
            <ButtonText>{tab.label}</ButtonText>
          </Button>
        ))}
      </XStack>

      {/* ==============================================================
          DEFAULT — No overrides, framework defaults + ClaimWidget
          ============================================================== */}
      {activeTab === 'default' && (
        <YStack gap="$4">
          <Alert
            type="info"
            title="Level 0: Framework Defaults"
            message="No overrides applied. The ClaimWidget and all components use the GoodDollar blue (#00AEFF) theme."
          />

          <Card>
            <Heading level={4}>Wallet</Heading>
            <WalletInfo address={address} chainId={chainId} />
          </Card>

          {/* ClaimWidget from @goodwidget/claim-widget — default look */}
          <YStack gap="$2">
            <Text variant="label">ClaimWidget (default):</Text>
            <ClaimWidget />
          </YStack>

          <Card>
            <Heading level={4}>Form Controls</Heading>
            <Input label="Name" placeholder="Enter your name..." />
            <Select
              options={[
                { label: 'Celo', value: '42220' },
                { label: 'Ethereum', value: '1' },
                { label: 'Fuse', value: '122' },
              ]}
              value={selectVal}
              onValueChange={setSelectVal}
              placeholder="Select chain..."
            />
            <Checkbox
              checked={checked}
              onCheckedChange={setChecked}
              label="I agree to terms"
            />
            <Switch
              checked={switchOn}
              onCheckedChange={setSwitchOn}
              label="Auto-claim"
            />
            <Separator />
            <XStack gap="$2" alignItems="center">
              <Text variant="caption">Loading:</Text>
              <Spinner size="sm" />
            </XStack>
          </Card>

          <Card>
            <Heading level={5}>Theme Manifest</Heading>
            <Text variant="caption">
              {Object.keys(manifest.components).length} registered components:{' '}
              {Object.keys(manifest.components).join(', ')}
            </Text>
          </Card>
        </YStack>
      )}

      {/* ==============================================================
          TOKEN OVERRIDE — Change primary color globally
          ============================================================== */}
      {activeTab === 'tokens' && (
        <YStack gap="$4">
          <Alert
            type="warning"
            title="Level 1: Token Override"
            message="Primary color changed from #00AEFF (blue) to #7B61FF (purple) via config.tokens."
          />
          <Card>
            <Heading level={5}>How it works</Heading>
            <Text variant="caption">
              {`<ClaimWidget
  config={{
    tokens: { color: { primary: '#7B61FF', primaryDark: '#5A3FDB' } }
  }}
/>`}
            </Text>
            <Text secondary>
              The purple token propagates to every component inside the
              ClaimWidget — Button, Badge, etc.
            </Text>
          </Card>

          <YStack
            gap="$3"
            padding="$3"
            borderRadius="$3"
            borderWidth={2}
            borderColor="#7B61FF"
            borderStyle="dashed"
          >
            <Text variant="label" color="#7B61FF">
              ClaimWidget with purple tokens:
            </Text>
            <ClaimWidget
              config={{
                tokens: {
                  color: { primary: '#7B61FF', primaryDark: '#5A3FDB' },
                },
              }}
            />
          </YStack>
        </YStack>
      )}

      {/* ==============================================================
          COMPONENT THEME OVERRIDE — Target Card + Button specifically
          ============================================================== */}
      {activeTab === 'component' && (
        <YStack gap="$4">
          <Alert
            type="warning"
            title="Level 2: Component Theme Override"
            message="Card gets amber background, Button gets orange — via themes: { light_Card, light_Button }."
          />
          <Card>
            <Heading level={5}>How it works</Heading>
            <Text variant="caption">
              {`<ClaimWidget
  config={{
    themes: {
      light_Card: {
        background: '#FFF8E1',
        borderColor: '#FFB300',
      },
      light_Button: {
        background: '#FF6D00',
      },
    }
  }}
/>`}
            </Text>
            <Text secondary>
              Only Card and Button change. Heading, Text, Badge etc. keep
              defaults. ClaimCard extends Card so it inherits the override too.
            </Text>
          </Card>

          <YStack
            gap="$3"
            padding="$3"
            borderRadius="$3"
            borderWidth={2}
            borderColor="#FFB300"
            borderStyle="dashed"
          >
            <Text variant="label" color="#FF6D00">
              ClaimWidget with component theme overrides:
            </Text>
            <ClaimWidget
              config={{
                themes: {
                  light_Card: {
                    background: '#FFF8E1',
                    borderColor: '#FFB300',
                    shadowColor: 'rgba(255,179,0,0.15)',
                  },
                  light_Button: {
                    background: '#FF6D00',
                    backgroundHover: '#E65100',
                    backgroundPress: '#BF360C',
                    color: '#FFFFFF',
                  },
                },
              }}
            />
          </YStack>
        </YStack>
      )}

      {/* ==============================================================
          HOST OVERRIDE — themeOverrides on ClaimWidget
          ============================================================== */}
      {activeTab === 'host' && (
        <YStack gap="$4">
          <Alert
            type="error"
            title="Host Override (themeOverrides)"
            message="Simulates a host embedding the ClaimWidget and overriding its ClaimCard + Card + Button themes."
          />
          <Card>
            <Heading level={5}>The Scenario</Heading>
            <Text secondary>
              The ClaimWidget comes from @goodwidget/claim-widget (an npm
              package). You embed it in your wallet and pass themeOverrides to
              restyle it — targeting both the widget's custom ClaimCard component
              and the basic Card element.
            </Text>
            <Text variant="caption">
              {`<ClaimWidget
  themeOverrides={{
    tokens: { color: { primary: '#E91E63' } },
    themes: {
      light_ClaimCard: { background: 'rgba(233,30,99,0.08)' },
      light_Card: { borderColor: '#E91E63' },
      light_Button: { background: '#E91E63' },
    },
  }}
/>`}
            </Text>
          </Card>

          <YStack gap="$4">
            <Text variant="label">Original (no host overrides):</Text>
            <YStack
              padding="$3"
              borderRadius="$3"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <ClaimWidget />
            </YStack>

            <Separator />

            <Text variant="label" color="#E91E63">
              Host-overridden (pink brand):
            </Text>
            <YStack
              padding="$3"
              borderRadius="$3"
              borderWidth={2}
              borderColor="#E91E63"
              borderStyle="dashed"
            >
              <ClaimWidget
                themeOverrides={{
                  tokens: {
                    color: { primary: '#E91E63', primaryDark: '#AD1457' },
                  },
                  themes: {
                    light_ClaimCard: {
                      background: 'rgba(233,30,99,0.08)',
                      shadowColor: 'rgba(233,30,99,0.2)',
                    },
                    light_Card: {
                      borderColor: '#F48FB1',
                    },
                    light_Button: {
                      background: '#E91E63',
                      backgroundHover: '#AD1457',
                      backgroundPress: '#880E4F',
                    },
                  },
                }}
              />
            </YStack>

            <Separator />

            <Text variant="label" color="#00897B">
              Host-overridden (teal brand):
            </Text>
            <YStack
              padding="$3"
              borderRadius="$3"
              borderWidth={2}
              borderColor="#00897B"
              borderStyle="dashed"
            >
              <ClaimWidget
                themeOverrides={{
                  tokens: {
                    color: { primary: '#00897B', primaryDark: '#00695C' },
                  },
                  themes: {
                    light_ClaimCard: {
                      background: 'rgba(0,137,123,0.06)',
                      shadowColor: 'rgba(0,137,123,0.2)',
                    },
                    light_Card: {
                      borderColor: '#80CBC4',
                    },
                    light_Button: {
                      background: '#00897B',
                      backgroundHover: '#00695C',
                      backgroundPress: '#004D40',
                    },
                  },
                }}
              />
            </YStack>
          </YStack>

          <Card>
            <Heading level={5}>Why This Works</Heading>
            <Text secondary>
              ClaimWidget wraps itself in GoodWidgetProvider and accepts
              themeOverrides. The host always wins. The widget's ClaimCard (name:
              'ClaimCard') is targetable because createComponent() enforced a
              name, creating the light_ClaimCard theme segment. The basic Card
              element is targetable via light_Card.
            </Text>
          </Card>
        </YStack>
      )}

      {/* ==============================================================
          INLINE PROPS — One-off overrides directly on JSX
          ============================================================== */}
      {activeTab === 'inline' && (
        <YStack gap="$4">
          <Alert
            type="info"
            title="Level 3: Inline Style Props"
            message="Override styles directly on individual component instances — highest specificity."
          />

          <Card>
            <Heading level={5}>How it works</Heading>
            <Text variant="caption">
              {`<Card backgroundColor="#1A1A2E" borderColor="#7B61FF">
  <Heading color="#E0E0E0">...</Heading>
  <Button backgroundColor="#7B61FF">
    <ButtonText color="#FFFFFF">...</ButtonText>
  </Button>
</Card>`}
            </Text>
          </Card>

          <Card backgroundColor="#1A1A2E" borderColor="#7B61FF" borderWidth={2}>
            <Heading level={4} color="#E0E0FF">
              Dark Card via Inline Props
            </Heading>
            <Text color="#B0B0D0">
              This single Card instance is dark-styled via inline props. Other
              Cards on this page remain unaffected.
            </Text>
            <Button backgroundColor="#7B61FF" fullWidth>
              <ButtonText color="#FFFFFF">Purple Action</ButtonText>
            </Button>
          </Card>

          <Card
            backgroundColor="#F3E5F5"
            borderColor="#CE93D8"
            shadowColor="rgba(156,39,176,0.2)"
          >
            <Heading level={4} color="#6A1B9A">
              Lavender Card
            </Heading>
            <Text color="#4A148C">
              Inline props give each instance a unique look.
            </Text>
            <XStack gap="$2">
              <Button backgroundColor="#AB47BC" size="sm">
                <ButtonText color="#FFF">Option A</ButtonText>
              </Button>
              <Button backgroundColor="#7B1FA2" size="sm">
                <ButtonText color="#FFF">Option B</ButtonText>
              </Button>
            </XStack>
          </Card>

          <Card>
            <Heading level={5}>Override Precedence</Heading>
            <YStack gap="$2">
              <XStack gap="$2" alignItems="center">
                <Badge type="default">
                  <BadgeText>1</BadgeText>
                </Badge>
                <Text variant="caption">GoodWidget defaults (lowest)</Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Badge type="default">
                  <BadgeText>2</BadgeText>
                </Badge>
                <Text variant="caption">
                  Author's config (tokens + component themes)
                </Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Badge type="default">
                  <BadgeText>3</BadgeText>
                </Badge>
                <Text variant="caption">Host's themeOverrides prop</Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Badge type="default">
                  <BadgeText>4</BadgeText>
                </Badge>
                <Text variant="caption">
                  Host's CSS custom properties (web only)
                </Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Badge type="info">
                  <BadgeText>5</BadgeText>
                </Badge>
                <Text variant="caption" bold>
                  Inline style props (highest)
                </Text>
              </XStack>
            </YStack>
          </Card>
        </YStack>
      )}

      <ActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Theme Manifest"
      >
        <Text variant="caption">
          Registered components: {Object.keys(manifest.components).join(', ')}
        </Text>
        <Button fullWidth onPress={() => setSheetOpen(false)}>
          <ButtonText>Close</ButtonText>
        </Button>
      </ActionSheet>
    </MiniAppShell>
  )
}

export function App() {
  return (
    <GoodWidgetProvider defaultTheme="light">
      <OverrideShowcase />
    </GoodWidgetProvider>
  )
}
