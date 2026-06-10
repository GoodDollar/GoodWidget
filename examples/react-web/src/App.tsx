import React, { useState } from 'react'
import { GoodWidgetProvider, useWallet, useHost } from '@goodwidget/core'
import { ClaimWidget } from '@goodwidget/claim-widget-theme-demo'
import { StakingMigrationWidget } from '@goodwidget/staking-migration-widget'
import {
  getThemeManifest,
  MiniAppShell,
  Card,
  GlowCard,
  Heading,
  Text,
  Button,
  ButtonText,
  Input,
  WalletInfo,
  Alert,
  Badge,
  BadgeText,
  Spinner,
  Separator,
  Checkbox,
  Switch,
  Select,
  XStack,
  YStack,
  Drawer,
} from '@goodwidget/ui'

function OverrideShowcase() {
  const [activeTab, setActiveTab] = useState<
    'default' | 'tokens' | 'component' | 'host' | 'inline'
  >('default')
  const [hostVariant, setHostVariant] = useState<'cobalt' | 'teal'>('cobalt')
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

  const hostThemeOverrides =
    hostVariant === 'cobalt'
      ? {
          tokens: {
            color: {
              primary: '#2E5DE8',
              primaryDark: '#1D3EB2',
              primaryLight: '#6E8DFF',
            },
          },
          themes: {
            light_ClaimCard: {
              borderColor: '#2E5DE8',
              shadowColor: 'rgba(46,93,232,0.7)',
            },
            light_Card: {
              borderColor: '#2E5DE8',
            },
            light_ClaimActionGlow: {
              primary: '#4F7DFF',
              primaryLight: '#9DB4FF',
            },
            light_ClaimActionRing: {
              primary: '#2E5DE8',
              primaryLight: '#6E8DFF',
            },
            light_ClaimActionInner: {
              backgroundDark: '#0E1A3A',
              backgroundDarkHover: '#172B60',
            },
            light_TokenAmountText: {
              color: '#BBD0FF',
              secondaryColor: '#7FA2FF',
            },
          },
        }
      : {
          tokens: {
            color: {
              primary: '#00A884',
              primaryDark: '#007A61',
              primaryLight: '#33C9AA',
            },
          },
          themes: {
            light_ClaimCard: {
              borderColor: '#00A884',
              shadowColor: 'rgba(0,168,132,0.65)',
            },
            light_Card: {
              borderColor: '#00A884',
            },
            light_ClaimActionGlow: {
              primary: '#33C9AA',
              primaryLight: '#78E0CB',
            },
            light_ClaimActionRing: {
              primary: '#00A884',
              primaryLight: '#33C9AA',
            },
            light_ClaimActionInner: {
              backgroundDark: '#062A23',
              backgroundDarkHover: '#0B3B31',
            },
            light_TokenAmountText: {
              color: '#BFF5E7',
              secondaryColor: '#66D5BB',
            },
          },
        }

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
            <ButtonText color={activeTab === tab.key ? 'white' : 'grey'}>{tab.label}</ButtonText>
          </Button>
        ))}
      </XStack>

      {/* ==============================================================
          DEFAULT — No overrides, preset baseline + ClaimWidget
          ============================================================== */}
      {activeTab === 'default' && (
        <YStack gap="$6">
          <Alert
            type="info"
            title="Preset Baseline"
            message="No runtime overrides. The GoodWalletV2 preset drives tokens, themes, and component sub-themes. "
          />

          <GlowCard>
            <Heading level={4}>Wallet</Heading>
            <WalletInfo address={address} chainId={chainId} />
          </GlowCard>

          <YStack gap="$2">
            <Text variant="label">ClaimWidget (preset only):</Text>
            <ClaimWidget />
          </YStack>

          <YStack gap="$2">
            <Text variant="label">StakingMigrationWidget:</Text>
            <StakingMigrationWidget
              migrationApiBaseUrl={import.meta.env.VITE_MIGRATION_API_BASE_URL}
            />
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
            <Checkbox checked={checked} onCheckedChange={setChecked} label="I agree to terms" />
            <Switch checked={switchOn} onCheckedChange={setSwitchOn} label="Auto-claim" />
            <Separator />
            <XStack gap="$2" alignItems="center">
              <Text variant="caption">Loading:</Text>
              <Spinner size="sm" />
            </XStack>
          </Card>

          <Button onPress={() => setSheetOpen(true)}>
            <ButtonText>View Theme Manifest</ButtonText>
          </Button>

          <Drawer open={sheetOpen} onClose={() => setSheetOpen(false)}>
            <Text variant="caption" style={{ marginBottom: 16 }}>
              Registered components: {Object.keys(manifest.components).join(', ')}
            </Text>
            <Button fullWidth onPress={() => setSheetOpen(false)}>
              <ButtonText>Close</ButtonText>
            </Button>
          </Drawer>
        </YStack>
      )}

      {/* ==============================================================
          TOKEN OVERRIDE — Broad token-layer changes
          ============================================================== */}
      {activeTab === 'tokens' && (
        <YStack gap="$6">
          <Alert
            type="warning"
            title="Token Override"
            message="Tokens are broad inputs. Updating primary colors cascades through derived theme values and components that consume those semantics. In our example below the changes are subtle but visible on the claim button and glow, which consume `primary` and `primaryLight`, as well as border colors (like the tab). primary semantic follows token principle and should be applied for branding and accent colors that cascade widely. For more targeted overrides, use component sub-themes or host overrides."
          />
          <Card>
            <Heading level={5}>How it works</Heading>
            <Text variant="caption">
              {`<ClaimWidget
                  config={{
                    tokens: {
                      color: {
                        primary: '#4F7DFF',
                        primaryDark: '#2E5DE8',
                        primaryLight: '#7FA4FF'
                      }
                    }
                  }}
                />`}
            </Text>
            <Text secondary>
              This changes action and focus semantics globally for that widget tree, not just one
              component.
            </Text>
          </Card>

          <YStack
            gap="$3"
            padding="$3"
            borderRadius="$3"
            borderWidth={2}
            borderColor="#4F7DFF"
            borderStyle="dashed"
          >
            <Text variant="label" color="#4F7DFF">
              ClaimWidget with token override:
            </Text>
            <ClaimWidget
              config={{
                tokens: {
                  color: {
                    primary: '#4F7DFF',
                    primaryDark: '#2E5DE8',
                    primaryLight: '#7FA4FF',
                  },
                },
              }}
            />
          </YStack>
        </YStack>
      )}

      {/* ==============================================================
          COMPONENT THEME OVERRIDE — Target specific component sub-themes
          ============================================================== */}
      {activeTab === 'component' && (
        <YStack gap="$6">
          <Alert
            type="warning"
            title="Component Theme Override"
            message="Targeted visual changes should use named component sub-themes (light_*/dark_*). We show this as example but should mainly be used by authors of widgets and not being exposed after publishing. To expose overriding theming of the widget to hosts/integrators themeOverrides should be used."
          />
          <Card>
            <Heading level={5}>How it works</Heading>
            <Text variant="caption">
              {`<ClaimWidget
                  config={{
                    themes: {
                      light_ClaimActionGlow: { primary: '#12cb31', primaryLight: '#9A4DFF' },
                      light_ClaimActionRing: { primary: '#ff3333', primaryLight: '#9A4DFF' },
                      light_ClaimActionInner: { backgroundDark: 'orange' },
                      light_TokenAmountText: { color: 'red', secondaryColor: '#3fbdf2' }
                    }
                  }}
                />`}
            </Text>
            <Text secondary>
              Hover the claim button to see `primaryLight` apply from component-level theme
              overrides.
            </Text>
          </Card>

          <YStack
            gap="$3"
            padding="$3"
            borderRadius="$3"
            borderWidth={2}
            borderColor="#52A6FF"
            borderStyle="dashed"
          >
            <Text variant="label" color="#52A6FF">
              ClaimWidget with component overrides:
            </Text>
            <ClaimWidget
              config={{
                themes: {
                  light_ClaimActionGlow: {
                    primary: '#12cb31',
                    primaryLight: '#9A4DFF',
                  },
                  light_ClaimActionRing: {
                    primary: '#ff3333',
                    primaryLight: '#9A4DFF',
                  },
                  light_ClaimActionButton: {
                    backgroundTransparent: 'transparent',
                  },
                  light_ClaimActionInner: {
                    backgroundDark: 'orange',
                    backgroundDarkHover: 'red',
                  },
                  light_TokenAmountText: {
                    color: 'red',
                    secondaryColor: '#3fbdf2',
                  },
                },
              }}
            />
          </YStack>
        </YStack>
      )}

      {/* ==============================================================
          HOST OVERRIDE — themeOverrides merged last
          ============================================================== */}
      {activeTab === 'host' && (
        <YStack gap="$6">
          <Alert
            type="warning"
            title="Host Override (themeOverrides)"
            message="Host `themeOverrides` are merged last and win over preset + author config. Mixing different widgets on the same page and using theme-overrides will conflict if trying to target high-level tokens or themes. mixing widgets can be done but should be focussed on component-level theming"
          />
          <Card>
            <Heading level={5}>The Scenario</Heading>
            <Text secondary>
              The host app embeds ClaimWidget and applies `themeOverrides` for runtime brand
              targeting.
            </Text>
            <Text variant="caption">
              {`<ClaimWidget
                  themeOverrides={{
                    tokens: {
                      color: {
                        primary: '#2E5DE8',
                        primaryDark: '#1D3EB2',
                        primaryLight: '#6E8DFF'
                      }
                    },
                    themes: {
                      light_ClaimCard: { borderColor: '#2E5DE8' },
                      light_ClaimActionGlow: { primary: '#4F7DFF', primaryLight: '#9DB4FF' },
                      light_ClaimActionRing: { primary: '#2E5DE8', primaryLight: '#6E8DFF' },
                      light_ClaimActionInner: { backgroundDark: '#0E1A3A' }
                    }
                  }}
                />`}
            </Text>
          </Card>

          <YStack gap="$4">
            <XStack gap="$2" flexWrap="wrap">
              <Button
                size="sm"
                variant={hostVariant === 'cobalt' ? 'primary' : 'secondary'}
                onPress={() => setHostVariant('cobalt')}
              >
                <ButtonText color={hostVariant === 'cobalt' ? 'white' : 'grey'}>Cobalt</ButtonText>
              </Button>
              <Button
                size="sm"
                variant={hostVariant === 'teal' ? 'primary' : 'secondary'}
                onPress={() => setHostVariant('teal')}
              >
                <ButtonText color={hostVariant === 'teal' ? 'white' : 'grey'}>Teal</ButtonText>
              </Button>
            </XStack>

            <Text variant="label" color={hostVariant === 'cobalt' ? '#2E5DE8' : '#00A884'}>
              Host-overridden ({hostVariant}):
            </Text>
            <YStack
              padding="$3"
              borderRadius="$3"
              borderWidth={2}
              borderColor={hostVariant === 'cobalt' ? '#2E5DE8' : '#00A884'}
              borderStyle="dashed"
            >
              <ClaimWidget key={hostVariant} themeOverrides={hostThemeOverrides} />
            </YStack>
          </YStack>

          <Card>
            <Heading level={5}>Why This Works</Heading>
            <Text secondary>
              `ClaimWidget` wraps with `GoodWidgetProvider`, and host `themeOverrides` merge last.
              Named components (`ClaimCard`, `GlowCard`, `ClaimActionButton`, `TokenAmountText`)
              make targeted overrides stable.
            </Text>
          </Card>
        </YStack>
      )}

      {/* ==============================================================
          INLINE PROPS — Instance-level styling with highest specificity
          ============================================================== */}
      {activeTab === 'inline' && (
        <YStack gap="$6">
          <Alert
            type="info"
            title="Inline Style Props"
            message="Per-instance styling has highest specificity and should be used sparingly."
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
            <Text secondary>
              Inline props are local instance styling. Use these for one-offs, not as your main
              theming API.
            </Text>
          </Card>

          <Card backgroundColor="#1A1A2E" borderColor="#7B61FF" borderWidth={2}>
            <Heading level={4} color="#E0E0FF">
              Dark Card via Inline Props
            </Heading>
            <Text color="#B0B0D0">
              This single Card instance is dark-styled via inline props. Other Cards on this page
              remain unaffected.
            </Text>
            <Button backgroundColor="#7B61FF" fullWidth>
              <ButtonText color="#FFFFFF">Purple Action</ButtonText>
            </Button>
          </Card>

          <Card backgroundColor="#F3E5F5" borderColor="#CE93D8" shadowColor="rgba(156,39,176,0.2)">
            <Heading level={4} color="#6A1B9A">
              Lavender Card
            </Heading>
            <Text color="#4A148C">Inline props give each instance a unique look.</Text>
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
                <Text variant="caption">GoodWidget defaults / preset</Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Badge type="default">
                  <BadgeText>2</BadgeText>
                </Badge>
                <Text variant="caption">Author config (`tokens` + `themes`)</Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Badge type="default">
                  <BadgeText>3</BadgeText>
                </Badge>
                <Text variant="caption">Host `themeOverrides`</Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Badge type="default">
                  <BadgeText>4</BadgeText>
                </Badge>
                <Text variant="caption">Host CSS custom properties (web only)</Text>
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
