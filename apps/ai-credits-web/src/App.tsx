import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AiCreditsWidget,
  createBackendClient,
  DEFAULT_DISCOUNT_CONFIG,
  type DiscountConfig,
} from '@goodwidget/ai-credits-widget'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  DefaultAppKitProvider,
  DEFAULT_APPKIT_NETWORKS,
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
  useDisconnect,
} from '@goodwidget/embed/appkit-provider'
import {
  ExternalLink,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  ShoppingCart,
} from '@tamagui/lucide-icons'
import {
  Accordion,
  Anchor,
  Card,
  GlowCard,
  Heading,
  Text,
  XStack,
  YStack,
  defaultConfig,
} from '@goodwidget/ui'
import { TamaguiProvider } from '@tamagui/core'

const SWITCH_CHAIN_MANUAL_SELECTION_ERROR =
  'Select the network in the wallet dialog, then try again.'

const ANTSEED_API_DOCS = 'https://antseed.com/docs/guides/using-the-api/'
const ANTSEED_SECURITY_DOCS = 'https://antseed.com/docs/security/'

function envAddress(value: string | undefined): `0x${string}` | undefined {
  return value ? (value as `0x${string}`) : undefined
}

function useDiscountConfig(backendUrl: string | undefined): DiscountConfig {
  const [config, setConfig] = useState<DiscountConfig>(DEFAULT_DISCOUNT_CONFIG)

  useEffect(() => {
    if (!backendUrl) return

    let cancelled = false

    createBackendClient(backendUrl)
      .getDiscountConfig()
      .then((next) => {
        if (!cancelled) setConfig(next)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [backendUrl])

  return config
}

function ReownAiCreditsWidget() {
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const { address: appKitAddress, status: accountStatus } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<EIP1193Provider | undefined>('eip155')
  const { chainId, switchNetwork, approvedCaipNetworkIds } = useAppKitNetwork()
  const appKitAddressRef = useRef(appKitAddress)
  appKitAddressRef.current = appKitAddress

  // AppKit reports no address both while restoring a prior session and once it
  // has settled on "no wallet". Only the second is a real override, so during
  // the unresolved window these stay undefined and the core provider's own
  // EIP-1193 tracking covers the gap.
  //
  // A restored 'connected' also needs its provider before it counts. AppKit
  // rehydrates the last account from storage without checking the wallet behind
  // it, so that address alone can describe a locked wallet — and the widget can
  // only catch that by asking the provider for its accounts. Handing down an
  // address with no provider to verify it against is the one combination that
  // renders as a healthy session nothing can disprove.
  const isAccountResolved =
    (accountStatus === 'connected' && Boolean(walletProvider)) || accountStatus === 'disconnected'

  // switchNetwork takes a network descriptor, not a chain id.
  const appKitNetworksByChainId = useMemo(
    () => new Map(DEFAULT_APPKIT_NETWORKS.map((network) => [Number(network.id), network])),
    [],
  )

  // CAIP ids look like "eip155:42220"; undefined means AppKit has not reported
  // yet, which is "no restriction known" rather than "nothing available".
  const availableChainIds = useMemo(
    () =>
      approvedCaipNetworkIds
        ? approvedCaipNetworkIds
            .map((caipId) => Number(caipId.split(':')[1]))
            .filter((id) => Number.isFinite(id))
        : null,
    [approvedCaipNetworkIds],
  )

  return (
    <AiCreditsWidget
      provider={walletProvider}
      connectOverride={async () => {
        await open({ view: 'Connect' })

        if (!appKitAddressRef.current) {
          throw new Error('wallet_connect_cancelled')
        }
      }}
      showWalletControls
      disconnectOverride={async () => {
        await disconnect()
      }}
      addressOverride={isAccountResolved ? (appKitAddress ?? null) : undefined}
      chainIdOverride={isAccountResolved ? (chainId == null ? null : Number(chainId)) : undefined}
      availableChainIdsOverride={availableChainIds}
      switchChainOverride={async (targetChainId) => {
        const targetNetwork = appKitNetworksByChainId.get(targetChainId)
        // The modal only lets the user attempt the switch — it never confirms
        // one happened — so this throws rather than resolves. Resolving would
        // report success for a network the wallet may still not be on.
        if (!targetNetwork) {
          await open({ view: 'Networks' })
          throw new Error(SWITCH_CHAIN_MANUAL_SELECTION_ERROR)
        }
        try {
          await switchNetwork(targetNetwork)
        } catch {
          await open({ view: 'Networks' })
          throw new Error(SWITCH_CHAIN_MANUAL_SELECTION_ERROR)
        }
      }}
      backendUrl={import.meta.env.VITE_AI_CREDITS_BACKEND_URL}
      baseRpcUrl={import.meta.env.VITE_AI_CREDITS_BASE_RPC_URL}
      celoRpcUrl={import.meta.env.VITE_AI_CREDITS_CELO_RPC_URL}
      fundingVaultAddress={envAddress(import.meta.env.VITE_AI_CREDITS_FUNDING_VAULT_ADDRESS)}
      vaultAddress={envAddress(import.meta.env.VITE_AI_CREDITS_VAULT_ADDRESS)}
      goodIdAddress={envAddress(import.meta.env.VITE_AI_CREDITS_GOODID_ADDRESS)}
      testId="AiCreditsWidget-web"
    />
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <YStack gap="$3" alignItems="center" maxWidth={720} marginHorizontal="auto">
      <Text variant="label" color="$primary" textTransform="uppercase" letterSpacing={1.2} center>
        {eyebrow}
      </Text>
      <Heading level={2} tag="h2" textAlign="center" $sm={{ fontSize: '$7', lineHeight: '$7' }}>
        {title}
      </Heading>
      {description ? (
        <Text tone="soft" variant="large" center maxWidth={640} $sm={{ fontSize: '$3' }}>
          {description}
        </Text>
      ) : null}
    </YStack>
  )
}

function IconFrame({ children }: { children: React.ReactNode }) {
  return (
    <YStack
      width={48}
      height={48}
      borderRadius="$3"
      backgroundColor="$infoMuted"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
    >
      {children}
    </YStack>
  )
}

function TrustItem({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <XStack flex={1} minWidth={0} gap="$4" alignItems="flex-start">
      <IconFrame>{icon}</IconFrame>
      <YStack gap="$2" flex={1}>
        <Text bold variant="large">
          {title}
        </Text>
        <Text tone="soft">{children}</Text>
      </YStack>
    </XStack>
  )
}

function PurchaseFrame() {
  const projectId = import.meta.env.VITE_REOWN_PROJECT_ID

  return (
    <GlowCard
      width="100%"
      maxWidth={440}
      marginHorizontal="auto"
      padding="$2"
      overflow="hidden"
      data-testid="purchase-frame"
    >
      {projectId ? (
        <DefaultAppKitProvider
          enableWallets
          enableInjected
          metadata={{
            name: 'GoodDollar AI Credits',
            description: 'Buy AI credits with G$ and use them through Antseed.',
            // Absolute, and served from this deployment: the wallet fetches it
            // from the phone, so a relative path or localhost resolves to nothing.
            icons: [`${window.location.origin}/gooddollar-icon.png`],
          }}
        >
          <ReownAiCreditsWidget />
        </DefaultAppKitProvider>
      ) : (
        <Card
          minHeight={320}
          justifyContent="center"
          alignItems="center"
          padding="$6"
          data-testid="wallet-fallback"
        >
          <YStack gap="$5" alignItems="center" maxWidth={320}>
            <IconFrame>
              <ShoppingCart size={24} color="$primary" />
            </IconFrame>
            <YStack gap="$2" alignItems="center">
              <Heading level={4} tag="h3" textAlign="center">
                Wallet connection is not configured
              </Heading>
              <Text tone="soft" center>
                This deployment needs a Reown project ID before it can connect a wallet.
              </Text>
            </YStack>
          </YStack>
        </Card>
      )}
    </GlowCard>
  )
}

function SecurityDetails() {
  return (
    <YStack gap="$7" paddingTop="$3" $sm={{ gap: "$5" }}>
      <XStack gap="$7" alignItems="flex-start" $md={{ flexDirection: 'column' }}>
        <TrustItem icon={<Network size={24} color="$primary" />} title="Local, explicit routing">
          The signer proxy runs locally. It will not auto-select a peer: browse the network, inspect
          the services and pricing, then pin the peer you choose.
        </TrustItem>
        <TrustItem
          icon={<LockKeyhole size={24} color="$primary" />}
          title="Protected transport, visible to providers"
        >
          WebRTC transport protects requests in transit to the selected peer. The provider serving a
          request still receives its contents, so do not send secrets in prompts.
        </TrustItem>
      </XStack>

      <XStack gap="$7" alignItems="flex-start" $md={{ flexDirection: 'column' }}>
        <TrustItem icon={<KeyRound size={24} color="$primary" />} title="Separated identity">
          The signer signing identity is separate from the funding wallet. A compromised signer
          identity cannot access that wallet, and its exposure is bounded by deposited credits.
        </TrustItem>
        <TrustItem icon={<ShieldCheck size={24} color="$primary" />} title="Keys are secrets">
          Treat ANTSEED_IDENTITY_HEX as a private key. The CLI may store a plaintext identity.key in
          its Antseed data directory unless you supply the identity securely, such as through a
          secrets manager.
        </TrustItem>
      </XStack>

      <Card backgroundColor="$background" padding="$5" outlined>
        <XStack gap="$4" alignItems="flex-start" $sm={{ flexDirection: 'column' }}>
          <IconFrame>
            <ShieldCheck size={24} color="$primary" />
          </IconFrame>
          <YStack gap="$2" flex={1}>
            <Text bold variant="large">
              GoodDollar operator role on Base
            </Text>
            <Text tone="soft">
              Your one-time wallet authorization lets the GoodDollar operator fund your credits and
              handle Base-side credit actions, including moving credit funds, without requiring you
              to pay Base gas. It cannot access your payer wallet or your G$ on Celo. This is a
              trusted role for the Base credit account.
            </Text>
            <XStack gap="$2" alignItems="center" marginTop="$1">
              <Anchor href={ANTSEED_SECURITY_DOCS}>Read the Antseed security documentation</Anchor>
              <ExternalLink size={16} color="$primary" aria-hidden />
            </XStack>
          </YStack>
        </XStack>
      </Card>
    </YStack>
  )
}

function LandingPage() {
  const { depositBonusPercent, streamBonusPercent } = useDiscountConfig(
    import.meta.env.VITE_AI_CREDITS_BACKEND_URL,
  )
  const maxBonusPercent = Math.max(depositBonusPercent, streamBonusPercent)

  return (
    <YStack
      tag="main"
      width="100%"
      minHeight="100vh"
      backgroundColor="$background"
      overflow="hidden"
      data-testid="ai-credits-landing-page"
      style={{
        backgroundImage: [
          'radial-gradient(ellipse 70% 18% at 4% 4%, rgba(104, 117, 255, 0.16), transparent 72%)',
          'radial-gradient(ellipse 62% 17% at 96% 31%, rgba(37, 202, 180, 0.1), transparent 72%)',
          'radial-gradient(ellipse 65% 16% at 3% 61%, rgba(83, 112, 255, 0.11), transparent 72%)',
          'radial-gradient(ellipse 58% 14% at 94% 96%, rgba(37, 202, 180, 0.08), transparent 72%)',
          'radial-gradient(circle at 12px 12px, rgba(255, 255, 255, 0.09) 0 1px, transparent 1.35px)',
          'linear-gradient(to bottom, transparent 11.5px, rgba(126, 139, 255, 0.04) 11.5px 12.5px, transparent 12.5px)',
          'linear-gradient(to right, transparent 11.5px, rgba(126, 139, 255, 0.04) 11.5px 12.5px, transparent 12.5px)',
        ].join(', '),
        backgroundPosition: 'center, center, center, center, 0 0, 0 0, 0 0',
        backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat, repeat, repeat, repeat',
        backgroundSize: 'auto, auto, auto, auto, 24px 24px, 24px 24px, 24px 24px',
      }}
    >
      <YStack
        tag="section"
        width="100%"
        maxWidth={1120}
        marginHorizontal="auto"
        paddingHorizontal="$6"
        paddingTop="$10"
        paddingBottom="$7"
        gap="$5"
        alignItems="center"
        $sm={{ paddingHorizontal: '$4', paddingTop: '$8', paddingBottom: '$6' }}
      >
        <XStack gap="$2" alignItems="center" padding="$2">
          <Anchor href={ANTSEED_API_DOCS}>Read the Antseed API docs</Anchor>
          <ExternalLink size={16} color="$primary" aria-hidden />
        </XStack>
      </YStack>

      <YStack
        tag="section"
        id="purchase"
        width="100%"
        paddingHorizontal="$6"
        paddingBottom="$10"
        style={{ scrollMarginTop: 16 }}
        $sm={{ paddingHorizontal: '$3', paddingBottom: '$8' }}
      >
        <PurchaseFrame />
      </YStack>

      <YStack
        tag="section"
        width="100%"
        backgroundColor="$backgroundSurfaceAlt"
        paddingHorizontal="$6"
        paddingVertical="$10"
        $sm={{ paddingHorizontal: '$4', paddingVertical: '$8' }}
      >
        {/* Collapsed by default: the detail matters to the readers who go looking
            for it, but expanding it by default is what made the page too long. */}
        <YStack width="100%" maxWidth={1080} marginHorizontal="auto" gap="$6">
          <SectionHeading
            eyebrow="Transparent by design"
            title="Know what runs, who can see it, and what is at risk"
            description="The local proxy and separated identities reduce exposure, but they do not remove the need to choose providers carefully and protect your keys."
          />

          <Accordion
            items={[
              {
                id: 'security',
                title: 'How routing, identity, and the operator role work',
                content: <SecurityDetails />,
              },
            ]}
          />
        </YStack>
      </YStack>

      <XStack
        tag="footer"
        width="100%"
        maxWidth={1120}
        marginHorizontal="auto"
        paddingHorizontal="$6"
        paddingVertical="$6"
        borderTopWidth={1}
        borderColor="$borderColor"
        justifyContent="space-between"
        alignItems="center"
        gap="$4"
        $sm={{ paddingHorizontal: '$4', flexDirection: 'column', alignItems: 'flex-start' }}
      >
        <Text bold>GoodDollar × Antseed</Text>
        <Text variant="caption">Developer preview · AI credits early beta</Text>
      </XStack>
    </YStack>
  )
}

// Widget-only view for partner integrations (e.g. AntSeed) that embed the purchase flow
// directly without the hero and security sections around it.
function PurchaseOnlyView() {
  return (
    <YStack
      tag="main"
      width="100%"
      minHeight="100vh"
      backgroundColor="$background"
      justifyContent="center"
      alignItems="center"
      padding="$6"
      data-testid="ai-credits-purchase-only"
    >
      <PurchaseFrame />
    </YStack>
  )
}

function readSourceParam(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('source')
}

export function App() {
  const isWidgetOnlySource = readSourceParam() === 'antseed'

  return (
    <TamaguiProvider config={defaultConfig} defaultTheme="dark">
      {isWidgetOnlySource ? <PurchaseOnlyView /> : <LandingPage />}
    </TamaguiProvider>
  )
}
