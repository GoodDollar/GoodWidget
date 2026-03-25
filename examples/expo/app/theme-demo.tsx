import React from 'react'
import { SafeAreaView, StyleSheet, ScrollView } from 'react-native'
import { ClaimWidget } from '@goodwidget/claim-widget'
import {
  Card,
  Heading,
  Text,
  Button,
  ButtonText,
  Separator,
  YStack,
} from '@goodwidget/ui'

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
 * Each section embeds the real ClaimWidget from @goodwidget/claim-widget
 * with different override strategies applied.
 */
export default function ThemeDemoScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Heading level={3}>Theme Override Comparison</Heading>
        <Text secondary>
          Same ClaimWidget from @goodwidget/claim-widget — four different looks.
        </Text>

        <YStack gap="$4" marginTop="$4">
          {/* Default */}
          <Section
            title="Default"
            description="No overrides — GoodDollar blue"
            borderColor="#00AEFF"
          >
            <ClaimWidget />
          </Section>

          {/* Token override */}
          <Section
            title="Token Override — Purple"
            description="config.tokens.color.primary = '#7B61FF'"
            borderColor="#7B61FF"
          >
            <ClaimWidget
              config={{
                tokens: {
                  color: { primary: '#7B61FF', primaryDark: '#5A3FDB' },
                },
              }}
            />
          </Section>

          {/* Component theme override (Card + Button) */}
          <Section
            title="Component Theme — Amber Card + Orange Button"
            description="themes: { light_Card: { background: '#FFF8E1' }, light_Button: { background: '#FF6D00' } }"
            borderColor="#FFB300"
          >
            <ClaimWidget
              config={{
                themes: {
                  light_Card: {
                    background: '#FFF8E1',
                    borderColor: '#FFB300',
                  },
                  light_Button: {
                    background: '#FF6D00',
                    backgroundHover: '#E65100',
                    color: '#FFFFFF',
                  },
                },
              }}
            />
          </Section>

          {/* Host override */}
          <Section
            title="Host Override — Pink"
            description="themeOverrides targets ClaimCard, Card, and Button"
            borderColor="#E91E63"
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
                  },
                },
              }}
            />
          </Section>

          <Separator />

          <Card>
            <Heading level={5}>Override Precedence</Heading>
            <YStack gap="$2">
              <Text variant="caption">1. GoodWidget defaults (lowest)</Text>
              <Text variant="caption">
                2. Author's config (tokens + component themes)
              </Text>
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
