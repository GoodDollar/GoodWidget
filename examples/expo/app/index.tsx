import React, { useMemo, useState } from 'react'
import { SafeAreaView, StyleSheet, ScrollView } from 'react-native'
import { ClaimWidget } from '@goodwidget/claim-widget-theme-demo'
import { Card, Heading, Text, Button, ButtonText, Separator, XStack, YStack } from '@goodwidget/ui'

function Section({
  title,
  description,
  borderColor,
  children,
}: {
  title: string
  description: string
  borderColor: string
  children: React.ReactNode
}) {
  return (
    <YStack
      gap="$3"
      padding="$3"
      borderRadius="$3"
      borderWidth={2}
      borderColor={borderColor}
      borderStyle="dashed"
    >
      <Text variant="label" color={borderColor}>
        {title}
      </Text>
      <Text variant="caption">{description}</Text>
      {children}
    </YStack>
  )
}

/**
 * Side-by-side theme override demo.
 *
 * Each section embeds the real ClaimWidget from @goodwidget/claim-widget-theme-demo
 * with different override strategies applied.
 */
export default function ThemeDemoScreen() {
  const [variant, setVariant] = useState<'default' | 'tokens' | 'component' | 'host'>('default')

  const selection = useMemo(() => {
    //   Why web does seem to work for token overrides:
    // - web path is more CSS-variable/runtime friendly, so token changes can appear to propagate.
    // - native path is more pre-resolved/static for tokens.

    // Practical rule for demos/integrators:

    // - Use tokens for shipped design primitives/defaults.
    // - Use themes (base/component themes) for runtime overrides in Expo/native.
    if (variant === 'tokens') {
      return {
        title: 'Token Override — Purple (Does not work on native)',
        description:
          'Token overrides can work for web-components and react-web. for some unknown reason on native the token override is not applied as expected an for native-facing compatible widgets only theme and component-level overrides should be used.',
        borderColor: '#7B61FF',
        widgetProps: {
          config: {
            tokens: {
              color: {
                primary: '#7B61FF',
                primaryDark: '#5A3FDB',
                primaryLight: '#9B8CFF',
              },
            },
          },
        },
      }
    }

    if (variant === 'component') {
      return {
        title: 'Component Theme — Claim Action',
        description: 'config.themes targets light_ClaimAction* and light_ClaimCard',
        borderColor: '#FFB300',
        widgetProps: {
          config: {
            themes: {
              light_ClaimCard: {
                borderColor: '#FFB300',
              },
              light_ClaimActionGlow: {
                primary: '#FFB74D',
                primaryLight: '#FFD180',
              },
              light_ClaimActionRing: {
                primary: '#FF6D00',
                primaryLight: '#FFB74D',
              },
              light_ClaimActionInner: {
                backgroundDark: '#3A1F00',
              },
            },
          },
        },
      }
    }

    if (variant === 'host') {
      return {
        title: 'Host Override — Pink',
        description: 'themeOverrides targets tokens + claim-specific component themes',
        borderColor: '#E91E63',
        widgetProps: {
          themeOverrides: {
            tokens: {
              color: { primary: '#E91E63', primaryDark: '#AD1457', primaryLight: '#F06292' },
            },
            themes: {
              light_ClaimCard: {
                borderColor: '#F48FB1',
              },
              light_ClaimActionGlow: {
                primary: '#EC407A',
                primaryLight: '#F48FB1',
              },
              light_ClaimActionRing: {
                primary: '#E91E63',
                primaryLight: '#EC407A',
              },
              light_ClaimActionInner: {
                backgroundDark: '#3D1326',
              },
              light_TokenAmountText: {
                secondaryColor: '#F8BBD0',
              },
            },
          },
        },
      }
    }

    return {
      title: 'Default',
      description: 'No overrides — GoodWidget default preset',
      borderColor: '#00AEFF',
      widgetProps: {},
    }
  }, [variant])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Heading level={3}>Theme Override Comparison</Heading>
        <Text secondary>
          Single mounted ClaimWidget preview. Switch variants to avoid cross-instance config bleed
          in Expo.
        </Text>

        <YStack gap="$4" marginTop="$4">
          <XStack gap="$2" flexWrap="wrap">
            <Button
              size="sm"
              variant={variant === 'default' ? 'primary' : 'secondary'}
              onPress={() => setVariant('default')}
            >
              <ButtonText color={variant === 'default' ? 'white' : 'grey'}>Default</ButtonText>
            </Button>
            <Button
              size="sm"
              variant={variant === 'tokens' ? 'primary' : 'secondary'}
              onPress={() => setVariant('tokens')}
            >
              <ButtonText color={variant === 'tokens' ? 'white' : 'grey'}>Tokens</ButtonText>
            </Button>
            <Button
              size="sm"
              variant={variant === 'component' ? 'primary' : 'secondary'}
              onPress={() => setVariant('component')}
            >
              <ButtonText color={variant === 'component' ? 'white' : 'grey'}>Component</ButtonText>
            </Button>
            <Button
              size="sm"
              variant={variant === 'host' ? 'primary' : 'secondary'}
              onPress={() => setVariant('host')}
            >
              <ButtonText color={variant === 'host' ? 'white' : 'grey'}>Host</ButtonText>
            </Button>
          </XStack>

          <Section
            title={selection.title}
            description={selection.description}
            borderColor={selection.borderColor}
          >
            <ClaimWidget key={variant} {...selection.widgetProps} />
          </Section>

          <Separator />

          <Card>
            <Heading level={5}>Override Precedence</Heading>
            <YStack gap="$2">
              <Text variant="caption">1. GoodWidget defaults (lowest)</Text>
              <Text variant="caption">2. Author's config (tokens + component themes)</Text>
              <Text variant="caption">3. Host's themeOverrides (always wins)</Text>
              <Text variant="caption">
                4. Inline style props (highest, only if host owns the JSX)
              </Text>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    padding: 16,
    paddingBottom: 48,
  },
})
