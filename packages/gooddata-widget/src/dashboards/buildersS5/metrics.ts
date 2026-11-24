/**
 * Builders season 5 metric cards: which report key each card reads, and the plain-language text shown with it.
 * The wording is the approved dashboard preview text (Notion "GoodBuilders S5 - Metric Definitions", season 5 as
 * built): each card's name is the metric name on that page. A key that is not listed here never gets a card, so a new
 * or renamed gbmetrics key needs a definition added here first. Deliberately not listed: x_tweets, the older
 * project_tx_count / project_gd_volume duplicates, and the G$ in / G$ out keys, which come with the G$ volume card
 * once the page can draw them.
 */

export type MetricUnit = 'count' | 'gd' | 'pct'

export interface MetricDefinition {
  /** Report key this card reads, e.g. s5_project_tx_count. */
  key: string
  /** Short name used in captions and chart labels. */
  short: string
  /** Card title. */
  name: string
  /** Plain explanation of what is measured. */
  what: string
  /** The "Keep in mind" note. Empty when the card has none. */
  mind: string
  unit: MetricUnit
  /** True when the number is a snapshot or a rate rather than a total counted since the collection start. */
  asIs: boolean
  /** Text for a team with no registered account, shown instead of a number. */
  noneRegistered?: string
  /** ISO date of the first report that can hold a value for this metric. Reports dated before it show "First value in the <date> report". */
  firstValueDate?: string
}

export interface MetricSection {
  id: string
  title: string
  note: string
  metrics: MetricDefinition[]
}

export const METRIC_SECTIONS: MetricSection[] = [
  {
    id: "onchain-activity",
    title: "Onchain activity",
    note: "We see a project only through the addresses it registered for S5 and public Celo data. A wallet is not a person: one person can have several wallets.",
    metrics: [
      {
        key: "s5_project_tx_count",
        short: "Transactions",
        name: "Transactions",
        what: "Number of Celo transactions sent from or to one of the project's addresses. The other side can be any address, a user wallet or a smart contract.",
        mind: "One action in the app can create several transactions. Transactions with other contracts count too.",
        unit: "count",
        asIs: false,
      },
      {
        key: "s5_project_gd_transfer_count",
        short: "G$ transfers",
        name: "G$ transfers",
        what: "Number of G$ token transfers between the project's addresses and user wallets, in either direction. One transaction can contain several transfers.",
        mind: "It counts transfers. The amount is in the next metric.",
        unit: "count",
        asIs: false,
      },
      {
        key: "s5_project_gd_volume",
        short: "G$ volume",
        name: "G$ volume",
        what: "Total G$ in those transfers, G$ received and G$ sent added into one number. G$ moved to or from smart contracts (an exchange, for example) is left out.",
        mind: "The total doesn't show which way the G$ went: a project that pays out 10,000 G$ and one that takes in 10,000 G$ show the same total. It isn't revenue.",
        unit: "gd",
        asIs: false,
      },
      {
        key: "project_active_users",
        short: "Active wallets",
        name: "Active wallets",
        what: "Number of unique user wallets that sent a transaction to the project's addresses or received one from them since Nov 1. One transaction is enough. Each wallet counts once, verified or not.",
        mind: "Sending or receiving G$ alone doesn't count. A G$ transfer is a transaction with the G$ token contract, which isn't a project address.",
        unit: "count",
        asIs: false,
      },
      {
        key: "project_active_gd_users",
        short: "Verified active users",
        name: "Verified active users",
        what: "Of the active wallets, how many unique wallets are GoodDollar face-verified when the report runs.",
        mind: "It doesn't say whether they were verified when they used the app, or whether the project brought them to GoodDollar.",
        unit: "count",
        asIs: false,
      },
      {
        key: "project_onboarded_gd_users",
        short: "Onboarded wallets",
        name: "Onboarded wallets",
        what: "Number of unique wallets whose first transaction with the project came within 24 hours after their GoodDollar face verification.",
        mind: "A wallet can count for more than one project. A wallet that used the app before verifying doesn't count.",
        unit: "count",
        asIs: false,
      },
      {
        key: "s5_project_retention_week1",
        short: "Weekly retention",
        name: "Weekly retention",
        what: "A new active wallet is one with its first transaction with the project in a week from Nov 15 on. Week 1 is the share of those unique wallets, verified or not, with a transaction with the project again the next week. All weeks so far are pooled into one percentage. First value in the Nov 29 report.",
        mind: "It doesn't measure how often people come back. One transaction counts the same as fifty.",
        unit: "pct",
        asIs: true,
        firstValueDate: "2026-11-29",
      },
      {
        key: "s5_project_retention_epoch",
        short: "Epoch retention",
        name: "Epoch retention",
        what: "Epochs are two weeks long, counted from Nov 15. Of all unique active wallets in one epoch, new or returning, it's the share with a transaction with the project again in the next epoch. It appears once two full epochs are saved and the earlier one had at least 5 such wallets. First value in the Dec 13 report.",
        mind: "It doesn't measure how often people come back. One transaction counts the same as fifty.",
        unit: "pct",
        asIs: true,
        firstValueDate: "2026-12-13",
      },
      {
        key: "s5_project_retention_week4",
        short: "Monthly retention",
        name: "Monthly retention",
        what: "A new active wallet is one with its first transaction with the project in a week from Nov 15 on. Week 4 is the share of those unique wallets, verified or not, with a transaction with the project again in the fourth week after. All weeks so far are pooled into one percentage. First value in the Dec 20 report.",
        mind: "It doesn't measure how often people come back. One transaction counts the same as fifty.",
        unit: "pct",
        asIs: true,
        firstValueDate: "2026-12-20",
      },
    ],
  },
  {
    id: "builder-activity",
    title: "Builder activity",
    note: "",
    metrics: [
      {
        key: "github_commits",
        short: "GitHub commits",
        name: "GitHub commits in the project's registered repos",
        what: "Code activity in the repos the project registered.",
        mind: "",
        unit: "count",
        asIs: false,
        noneRegistered: "No GitHub repo registered",
      },
      {
        key: "github_prs_closed",
        short: "GitHub PRs closed",
        name: "GitHub pull requests closed in the project's registered repos",
        what: "Code activity in the repos the project registered.",
        mind: "",
        unit: "count",
        asIs: false,
        noneRegistered: "No GitHub repo registered",
      },
      {
        key: "github_score",
        short: "GitHub score",
        name: "GitHub repository score",
        what: "A single score for the registered repos.",
        mind: "",
        unit: "count",
        asIs: true,
        noneRegistered: "No GitHub repo registered",
      },
      {
        key: "x_followers",
        short: "X followers",
        name: "X followers",
        what: "Size of the project's audience on X.",
        mind: "",
        unit: "count",
        asIs: true,
        noneRegistered: "No X account registered",
      },
      {
        key: "farcaster_followers",
        short: "Farcaster followers",
        name: "Farcaster followers",
        what: "Size of the project's audience on Farcaster.",
        mind: "",
        unit: "count",
        asIs: true,
        noneRegistered: "No Farcaster account registered",
      },
    ],
  },
]
