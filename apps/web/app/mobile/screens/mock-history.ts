// Fallback "demo" history shown when devnet has no transactions for the user yet.
// Real signatures + amounts come from `useTxHistory` (see ../use-tx-history.ts).

export type DemoHistoryEntry = {
  id: string
  direction: "out" | "in"
  counterparty: string
  amount: number
  status: "delivered" | "queued"
  when: string
}

export const DEMO_HISTORY: DemoHistoryEntry[] = [
  { id: "h1", direction: "out", counterparty: "alice",  amount: 1,    status: "delivered", when: "2 min ago" },
  { id: "h2", direction: "in",  counterparty: "bob",    amount: 5,    status: "delivered", when: "1 h ago" },
  { id: "h3", direction: "out", counterparty: "carol",  amount: 12.5, status: "queued",    when: "2 h ago" },
  { id: "h4", direction: "in",  counterparty: "elena",  amount: 8,    status: "delivered", when: "1 w ago" },
  { id: "h5", direction: "out", counterparty: "david",  amount: 4.2,  status: "delivered", when: "1 w ago" },
]

export const DEMO_CONTACTS = [
  { id: "alice",  name: "Alice Reyes", handle: "@alice",      bg: "#7FE8FF", initial: "A" },
  { id: "bob",    name: "Bob Kim",     handle: "@bob.kumo",   bg: "#C7B5FF", initial: "B" },
  { id: "carol",  name: "Carol Chen",  handle: "@carol",      bg: "#B7F1FF", initial: "C" },
  { id: "david",  name: "David Park",  handle: "@dpark",      bg: "#7FE8FF", initial: "D" },
  { id: "elena",  name: "Elena Cruz",  handle: "@elena",      bg: "#C7B5FF", initial: "E" },
] as const
