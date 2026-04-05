import React from 'react'
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native'
import { ClaimWidget } from '@goodwidget/claim-widget'
import { Card, Heading, Text, Alert, Separator, YStack } from '@goodwidget/ui'

/**
 * Home screen — embeds the ClaimWidget from @goodwidget/claim-widget
 * and demonstrates overriding its theme in several ways.
 */
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <YStack gap="$4">
          <Heading level={3}>GoodWidget Expo Example</Heading>
          <Text secondary>
            This app imports ClaimWidget from @goodwidget/claim-widget and shows how to override its
            theme at different levels.
          </Text>

          {/* ---- 1. Default widget — no overrides ---- */}
          <Alert
            type="info"
            title="Default ClaimWidget"
            message="No overrides — uses the GoodDollar blue (#00AEFF) theme."
          />
          <ClaimWidget />

          {/* <Separator /> */}

          {/* ---- 2. Token override — purple brand ---- */}
          <Alert
            type="warning"
            title="Token Override (purple)"
            message="config.tokens.color.primary = '#7B61FF'"
          />
          <ClaimWidget
            config={{
              tokens: {
                color: { primary: '#7B61FF', primaryDark: '#5A3FDB' },
              },
            }}
          />

          <Separator />

          {/* ---- 3. Component theme override — amber Card + orange Button ---- */}
          <Alert
            type="warning"
            title="Component Theme Override"
            message="light_Card → amber, light_Button → orange"
          />
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

          <Separator />

          {/* ---- 4. Host override — pink brand ---- */}
          <Alert
            type="error"
            title="Host Override (themeOverrides)"
            message="Simulates a host wallet rebranding the embedded ClaimWidget."
          />
          <Card padding="$2" borderWidth={2} borderColor="#E91E63" borderStyle="dashed">
            <Text variant="label" color="#E91E63">
              Host passes themeOverrides targeting ClaimCard + Card + Button:
            </Text>
          </Card>
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
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    padding: 12,
    paddingBottom: 48,
  },
})
