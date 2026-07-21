import React, { useEffect, useRef, useState } from 'react'
import { AiCreditsWidget } from '@goodwidget/ai-credits-widget'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  DefaultAppKitProvider,
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from '@goodwidget/embed/appkit-provider'
import {
  Code2,
  ExternalLink,
  Gift,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Zap,
} from '@tamagui/lucide-icons'
import {
  Anchor,
  Button,
  ButtonText,
  Card,
  GlowCard,
  Heading,
  Text,
  XStack,
  YStack,
  defaultConfig,
} from '@goodwidget/ui'
import { TamaguiProvider } from '@tamagui/core'

const ANTSEED_API_DOCS = 'https://antseed.com/docs/guides/using-the-api/'
const ANTSEED_SECURITY_DOCS = 'https://antseed.com/docs/security/'
const ANTSEED_PI_SKILL = 'https://github.com/AntSeed/pi-antseed'
const ANTSEED_CLAUDE_SKILL = 'https://github.com/AntSeed/antseed/tree/main/skills/join-buyer'
const ANTSEED_OPENCLAW_SKILL =
  'https://github.com/AntSeed/antseed/tree/main/skills/openclaw-antseed'
const GOODWALLET_URL = 'https://goodwallet.xyz'
const GOODDAPP_URL = 'https://gooddapp.org'

const sharedSetupCommands = `npm install -g @antseed/cli
export ANTSEED_IDENTITY_HEX=<buyer-private-key-hex>
antseed buyer start
antseed network browse
antseed buyer connection set --peer <peer-id>
curl -s http://localhost:8377/v1/models`

function envAddress(value: string | undefined): `0x${string}` | undefined {
  return value ? (value as `0x${string}`) : undefined
}

function scrollToPurchase() {
  document.getElementById('purchase')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const DEFAULT_DEPOSIT_BONUS_PERCENT = 10
const DEFAULT_STREAM_BONUS_PERCENT = 20

interface DiscountConfig {
  depositBonusPercent: number
  streamBonusPercent: number
}

function useDiscountConfig(backendUrl: string | undefined): DiscountConfig {
  const [config, setConfig] = useState<DiscountConfig>({
    depositBonusPercent: DEFAULT_DEPOSIT_BONUS_PERCENT,
    streamBonusPercent: DEFAULT_STREAM_BONUS_PERCENT,
  })

  useEffect(() => {
    if (!backendUrl) return

    const url = backendUrl.replace(/\/$/, '')
    let cancelled = false

    fetch(`${url}/v1/discounts`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Discount config request failed: ${response.status}`)
        const data = (await response.json()) as Partial<DiscountConfig>
        if (cancelled) return
        setConfig({
          depositBonusPercent:
            typeof data.depositBonusPercent === 'number'
              ? data.depositBonusPercent
              : DEFAULT_DEPOSIT_BONUS_PERCENT,
          streamBonusPercent:
            typeof data.streamBonusPercent === 'number'
              ? data.streamBonusPercent
              : DEFAULT_STREAM_BONUS_PERCENT,
        })
      })
      .catch(() => {
        // Keep defaults on failure.
      })

    return () => {
      cancelled = true
    }
  }, [backendUrl])

  return config
}

function ReownAiCreditsWidget() {
  const { open } = useAppKit()
  const { address: appKitAddress } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<EIP1193Provider | undefined>('eip155')
  const appKitAddressRef = useRef(appKitAddress)
  appKitAddressRef.current = appKitAddress

  return (
    <AiCreditsWidget
      provider={walletProvider}
      connectOverride={async () => {
        await open({ view: 'Connect' })

        if (!appKitAddressRef.current) {
          throw new Error('wallet_connect_cancelled')
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

function StepCard({
  number,
  icon,
  title,
  children,
}: {
  number: string
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <Card flex={1} minWidth={0} padding="$5" gap="$5" outlined>
      <XStack alignItems="center" justifyContent="space-between">
        <IconFrame>{icon}</IconFrame>
        <Text variant="label" tone="dim">
          {number}
        </Text>
      </XStack>
      <YStack gap="$2">
        <Heading level={4} tag="h3">
          {title}
        </Heading>
        <Text tone="soft">{children}</Text>
      </YStack>
    </Card>
  )
}

function CodeBlock({ children, testId }: { children: string; testId?: string }) {
  return (
    <Card
      backgroundColor="$background"
      borderColor="$borderColor"
      padding="$4"
      outlined
      data-testid={testId}
    >
      <Text
        tag="code"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontSize="$2"
        lineHeight="$4"
        color="$colorSoft"
        whiteSpace="pre-wrap"
        wordBreak="break-word"
        userSelect="text"
      >
        {children}
      </Text>
    </Card>
  )
}

function SetupCard({
  icon,
  title,
  description,
  command,
}: {
  icon: React.ReactNode
  title: string
  description: string
  command: string
}) {
  return (
    <Card flex={1} minWidth={0} padding="$5" gap="$4" outlined>
      <IconFrame>{icon}</IconFrame>
      <YStack gap="$2" flex={1}>
        <Heading level={4} tag="h3">
          {title}
        </Heading>
        <Text tone="soft">{description}</Text>
      </YStack>
      <CodeBlock>{command}</CodeBlock>
    </Card>
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
        <DefaultAppKitProvider enableWallets enableInjected>
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
                This deployment needs a Reown project ID before it can connect a wallet. The setup
                guides below remain available without a wallet.
              </Text>
            </YStack>
          </YStack>
        </Card>
      )}
    </GlowCard>
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
        paddingBottom="$9"
        gap="$8"
        alignItems="center"
        $sm={{ paddingHorizontal: '$4', paddingTop: '$8', paddingBottom: '$7' }}
      >
        <YStack gap="$5" alignItems="center" maxWidth={850}>
          <XStack
            borderWidth={1}
            borderColor="$borderColorFocus"
            borderRadius="$full"
            paddingHorizontal="$4"
            paddingVertical="$2"
            backgroundColor="$infoMuted"
          >
            <Text
              variant="caption"
              color="$primaryLight"
              textTransform="uppercase"
              letterSpacing={1.4}
              bold
            >
              Early beta
            </Text>
          </XStack>

          <YStack gap="$4" alignItems="center">
            <Heading
              level={1}
              tag="h1"
              textAlign="center"
              fontSize={64}
              lineHeight={68}
              letterSpacing={-2.5}
              $md={{ fontSize: '$10', lineHeight: '$10', letterSpacing: -1.5 }}
              $sm={{ fontSize: '$8', lineHeight: '$8', letterSpacing: -1 }}
            >
              Get up to {maxBonusPercent}% more AI credits with GoodID
            </Heading>
            <Text
              variant="large"
              tone="soft"
              center
              maxWidth={720}
              fontSize="$5"
              lineHeight="$6"
              $sm={{ fontSize: '$3', lineHeight: '$4' }}
            >
              Pay with G$ and receive up to {maxBonusPercent}% more AI credits: {depositBonusPercent}% more on deposits and {streamBonusPercent}% more
              on streams. Use them in Claude Code, Codex, or compatible agent workflows.
            </Text>
          </YStack>

          <XStack gap="$4" alignItems="center" $sm={{ flexDirection: 'column', width: '100%' }}>
            <Button
              size="lg"
              onPress={scrollToPurchase}
              data-testid="hero-purchase-cta"
              $sm={{ width: '100%' }}
            >
              <ButtonText>Buy AI credits with G$</ButtonText>
            </Button>
            <XStack gap="$2" alignItems="center" padding="$2">
              <Anchor href={ANTSEED_API_DOCS}>Read the Antseed API docs</Anchor>
              <ExternalLink size={16} color="$primary" aria-hidden />
            </XStack>
          </XStack>
        </YStack>

        <Card width="100%" padding="$5" gap="$5" outlined data-testid="benefits-strip">
          <XStack gap="$3" alignItems="flex-start">
            <IconFrame>
              <Gift size={24} color="$primary" />
            </IconFrame>
            <YStack gap="$1" flex={1} minWidth={0}>
              <Heading level={3} tag="h2">
                Verified GoodDollar users get more AI credits
              </Heading>
              <Text tone="soft">
                Your verified GoodDollar wallet unlocks an automatic bonus whenever you fund AI
                credits with G$.
              </Text>
            </YStack>
          </XStack>

          <XStack gap="$4" $sm={{ flexDirection: 'column', gap: '$3' }}>
            <YStack flex={1} minWidth={0} gap="$1">
              <XStack gap="$2" alignItems="center">
                <Gift size={18} color="$primary" />
                <Text bold>{depositBonusPercent}% extra on deposits</Text>
              </XStack>
              <Text tone="soft">Receive {depositBonusPercent}% more credits with every eligible G$ deposit.</Text>
            </YStack>
            <YStack flex={1} minWidth={0} gap="$1">
              <XStack gap="$2" alignItems="center">
                <TrendingUp size={18} color="$primary" />
                <Text bold>{streamBonusPercent}% extra on streams</Text>
              </XStack>
              <Text tone="soft">Receive {streamBonusPercent}% more credits when you stream G$.</Text>
            </YStack>
          </XStack>

          <YStack gap="$2" paddingTop="$4" borderTopWidth={1} borderTopColor="$borderColor">
            <Text bold>Not a verified GoodDollar user yet?</Text>
            <Text tone="soft">
              Claim your first UBI with <Anchor href={GOODWALLET_URL}>GoodWallet</Anchor>, or use
              another wallet to claim it on <Anchor href={GOODDAPP_URL}>GoodDapp</Anchor>.
            </Text>
          </YStack>
        </Card>
      </YStack>

      <YStack
        tag="section"
        width="100%"
        maxWidth={1120}
        marginHorizontal="auto"
        paddingHorizontal="$6"
        paddingVertical="$9"
        gap="$7"
        $sm={{ paddingHorizontal: '$4', paddingVertical: '$8' }}
      >
        <SectionHeading
          eyebrow="How it works"
          title="How your AI credits work"
          description="Create a buyer identity, pay with G$, and use the resulting credits in your agent workflow."
        />
        <XStack gap="$4" alignItems="stretch" $md={{ flexDirection: 'column' }}>
          <StepCard
            number="01"
            icon={<KeyRound size={24} color="$primary" />}
            title="Create and authorize"
          >
            Create the buyer identity, then authorize the GoodDollar operator for Base-side credit
            actions.
          </StepCard>
          <StepCard
            number="02"
            icon={<ShoppingCart size={24} color="$primary" />}
            title="Pay or stream G$"
          >
            Fund the purchase with G$ on Celo Mainnet, chain ID 42220.
          </StepCard>
          <StepCard
            number="03"
            icon={<Zap size={24} color="$primary" />}
            title="Use settled credits"
          >
            Credits settle and are used through Antseed on Base Mainnet, chain ID 8453.
          </StepCard>
        </XStack>
      </YStack>

      <YStack
        tag="section"
        id="purchase"
        width="100%"
        paddingHorizontal="$6"
        paddingVertical="$10"
        backgroundColor="$backgroundSurfaceAlt"
        gap="$8"
        style={{ scrollMarginTop: 16 }}
        $sm={{ paddingHorizontal: '$3', paddingVertical: '$8' }}
      >
        <SectionHeading
          eyebrow="Purchase"
          title="Buy credits with your wallet"
          description="Connect on Celo to buy or manage your credits. The portrait flow stays focused at every screen size."
        />
        <PurchaseFrame />
      </YStack>

      <YStack
        tag="section"
        width="100%"
        maxWidth={1120}
        marginHorizontal="auto"
        paddingHorizontal="$6"
        paddingVertical="$10"
        gap="$8"
        $sm={{ paddingHorizontal: '$4', paddingVertical: '$8' }}
      >
        <SectionHeading
          eyebrow="Antseed setup"
          title="Connect your local agent workflow"
          description="Run a buyer proxy locally, choose the peer you want to use, then point your preferred tool at it."
        />

        <Card width="100%" padding="$5" gap="$4" outlined data-testid="agent-skills">
          <XStack gap="$4" alignItems="center">
            <IconFrame>
              <Code2 size={24} color="$primary" />
            </IconFrame>
            <YStack gap="$1" flex={1}>
              <Heading level={4} tag="h3">
                Let an agent guide your setup
              </Heading>
              <Text tone="soft">
                An Antseed skill can walk your agent through the buyer setup, peer selection, model
                discovery, and its own local integration.
              </Text>
            </YStack>
          </XStack>
          <CodeBlock>pi install git:github.com/AntSeed/pi-antseed</CodeBlock>
          <XStack
            gap="$4"
            flexWrap="wrap"
            $sm={{ flexDirection: 'column', alignItems: 'flex-start' }}
          >
            <XStack gap="$2" alignItems="center">
              <Anchor href={ANTSEED_PI_SKILL}>Pi setup skill</Anchor>
              <ExternalLink size={16} color="$primary" aria-hidden />
            </XStack>
            <XStack gap="$2" alignItems="center">
              <Anchor href={ANTSEED_CLAUDE_SKILL}>Claude Code setup skill</Anchor>
              <ExternalLink size={16} color="$primary" aria-hidden />
            </XStack>
            <XStack gap="$2" alignItems="center">
              <Anchor href={ANTSEED_OPENCLAW_SKILL}>OpenClaw setup skill</Anchor>
              <ExternalLink size={16} color="$primary" aria-hidden />
            </XStack>
          </XStack>
          <Text variant="caption" tone="dim">
            Skills are optional helpers. Review the commands they suggest and keep your buyer
            identity private.
          </Text>
        </Card>

        <GlowCard width="100%" padding="$6" gap="$5" $sm={{ padding: '$4' }}>
          <XStack gap="$4" alignItems="center">
            <IconFrame>
              <Network size={24} color="$primary" />
            </IconFrame>
            <YStack gap="$1" flex={1}>
              <Heading level={4} tag="h3">
                Shared setup
              </Heading>
              <Text tone="soft">
                Install the CLI, supply your buyer identity, start the proxy, browse peers, and
                explicitly pin one before sending requests.
              </Text>
            </YStack>
          </XStack>
          <CodeBlock testId="shared-setup-commands">{sharedSetupCommands}</CodeBlock>
          <Text tone="soft">
            Model IDs are the service IDs advertised by your pinned peer. Check{' '}
            <Text tag="span" color="$color" fontWeight="600">
              /v1/models
            </Text>{' '}
            after pinning; no fixed model list is guaranteed.
          </Text>
        </GlowCard>

        <XStack gap="$4" alignItems="stretch" $md={{ flexDirection: 'column' }}>
          <SetupCard
            icon={<Code2 size={24} color="$primary" />}
            title="Claude Code"
            description="Use the wrapper so Antseed supplies the local proxy settings for the session."
            command="antseed claude --model <service-id>"
          />
          <SetupCard
            icon={<Code2 size={24} color="$primary" />}
            title="Codex"
            description="Use the wrapper so recent Codex versions receive the required provider config."
            command="antseed codex --model <service-id>"
          />
          <SetupCard
            icon={<Network size={24} color="$primary" />}
            title="Custom agents"
            description="Use the local Anthropic Messages, OpenAI Chat Completions, or OpenAI Responses API."
            command={`http://localhost:8377/v1/messages
http://localhost:8377/v1/chat/completions
http://localhost:8377/v1/responses`}
          />
        </XStack>
      </YStack>

      <YStack
        tag="section"
        width="100%"
        backgroundColor="$backgroundSurfaceAlt"
        paddingHorizontal="$6"
        paddingVertical="$10"
        $sm={{ paddingHorizontal: '$4', paddingVertical: '$8' }}
      >
        <YStack width="100%" maxWidth={1080} marginHorizontal="auto" gap="$8">
          <SectionHeading
            eyebrow="Transparent by design"
            title="Know what runs, who can see it, and what is at risk"
            description="The local proxy and separated identities reduce exposure, but they do not remove the need to choose providers carefully and protect your keys."
          />

          <Card padding="$6" gap="$7" outlined $sm={{ padding: '$4' }}>
            <XStack gap="$7" alignItems="flex-start" $md={{ flexDirection: 'column' }}>
              <TrustItem
                icon={<Network size={24} color="$primary" />}
                title="Local, explicit routing"
              >
                The buyer proxy runs locally. It will not auto-select a peer: browse the network,
                inspect the services and pricing, then pin the peer you choose.
              </TrustItem>
              <TrustItem
                icon={<LockKeyhole size={24} color="$primary" />}
                title="Protected transport, visible to providers"
              >
                WebRTC transport protects requests in transit to the selected peer. The provider
                serving a request still receives its contents, so do not send secrets in prompts.
              </TrustItem>
            </XStack>

            <XStack gap="$7" alignItems="flex-start" $md={{ flexDirection: 'column' }}>
              <TrustItem icon={<KeyRound size={24} color="$primary" />} title="Separated identity">
                The buyer signing identity is separate from the funding wallet. A compromised buyer
                identity cannot access that wallet, and its exposure is bounded by deposited
                credits.
              </TrustItem>
              <TrustItem icon={<ShieldCheck size={24} color="$primary" />} title="Keys are secrets">
                Treat ANTSEED_IDENTITY_HEX as a private key. The CLI may store a plaintext
                identity.key in its Antseed data directory unless you supply the identity securely,
                such as through a secrets manager.
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
                    Your one-time consent lets the GoodDollar operator fund your credits and handle
                    Base-side credit actions, including moving credit funds, without requiring you
                    to pay Base gas. It cannot access your payer wallet or your G$ on Celo. This is
                    a trusted role for the Base credit account.
                  </Text>
                  <XStack gap="$2" alignItems="center" marginTop="$1">
                    <Anchor href={ANTSEED_SECURITY_DOCS}>
                      Read the Antseed security documentation
                    </Anchor>
                    <ExternalLink size={16} color="$primary" aria-hidden />
                  </XStack>
                </YStack>
              </XStack>
            </Card>
          </Card>
        </YStack>
      </YStack>

      <YStack
        tag="section"
        width="100%"
        maxWidth={900}
        marginHorizontal="auto"
        paddingHorizontal="$6"
        paddingVertical="$10"
        gap="$5"
        alignItems="center"
        $sm={{ paddingHorizontal: '$4', paddingVertical: '$8' }}
      >
        <Heading level={2} tag="h2" textAlign="center" $sm={{ fontSize: '$7', lineHeight: '$7' }}>
          Put your G$ to work in your agent stack
        </Heading>
        <Text tone="soft" variant="large" center maxWidth={620}>
          Start with the early beta purchase flow, then connect the resulting buyer identity to your
          local Antseed proxy.
        </Text>
        <Button size="lg" onPress={scrollToPurchase} data-testid="footer-purchase-cta">
          <ButtonText>Buy AI credits with G$</ButtonText>
        </Button>
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

export function App() {
  return (
    <TamaguiProvider config={defaultConfig} defaultTheme="dark">
      <LandingPage />
    </TamaguiProvider>
  )
}
