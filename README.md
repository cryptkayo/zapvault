# ZapVault — Starknet DeFi Command Center

A production-ready DeFi dashboard built on Starknet Mainnet, powered by the [Starkzap SDK](https://docs.starknet.io/build/starkzap).

**Live App:** [zapvault.vercel.app](https://zapvault.vercel.app)  
**GitHub:** [github.com/cryptkayo/zapvault](https://github.com/cryptkayo/zapvault)

---

## What is ZapVault?

ZapVault is a Starknet DeFi command center that lets users manage their entire on-chain portfolio in one place. Stake STRK to real validators, swap tokens via AVNU, bridge assets from Ethereum, and track all activity — without needing to understand the underlying blockchain complexity.

Built for the **Starkzap Developer Bounty Program** to demonstrate meaningful, production-ready SDK integration on Starknet Mainnet.

---

## Features

### Portfolio
- Real-time wallet balances for ETH, STRK, USDC, and USDT
- Live USD values with 24h price changes
- Send tokens directly from the dashboard with full wallet confirmation

### Earn (Staking)
- Stake STRK to real Starknet validators — Karnot, Nethermind, and Cartridge
- Live APY calculated from on-chain validator commission rates
- View staked positions and unclaimed rewards
- Unstake with 7-day unbonding period

### Trade (Swap)
- Real token swap quotes via AVNU aggregator
- Auto-refreshing quotes every 25 seconds
- Adjustable slippage tolerance
- Network fees under $0.01 on Starknet L2

### Bridge
- Supported bridge tokens fetched live from the Starkzap SDK
- Redirects to StarkGate pre-filled with token, amount, and recipient address

### Activity
- Tracks all transactions made through ZapVault — stakes, swaps, and transfers
- Real transaction hashes with direct Voyager explorer links
- Persists across page refreshes

---

## Starkzap SDK Integration

| Feature | SDK Usage |
|--------|-----------|
| Network config | `new StarkZap({ network: "mainnet", staking: { contract } })` |
| Validator presets | `mainnetValidators` — Karnot, Nethermind, Cartridge staker addresses |
| Pool resolution | `Staking.fromStaker()` — resolves live delegation pool contracts |
| Real APY | `stakingInstance.getCommission()` — fetches commission from chain |
| Staking calls | `populateEnter()` / `populateAdd()` — builds correct calldata |
| User positions | `stakingInstance.getPosition()` — fetches staked amount & rewards |
| Token amounts | `Amount.parse()` / `toUnit()` / `fromRaw()` — precise handling |
| Token presets | `mainnetTokens` — SDK token objects for swap resolution |
| Swap quotes | `AvnuSwapProvider.getQuote()` — real AVNU quotes |
| Swap execution | `AvnuSwapProvider.prepareSwap()` — builds swap calldata |
| Bridge tokens | `sdk.getBridgingTokens()` — supported bridge token list |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **SDK:** Starkzap SDK
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Network:** Starknet Mainnet
- **Swap:** AVNU Aggregator
- **Wallet:** Ready Wallet / Argent X / Braavos

---

## Project Structure

```
zapvault/
├── app/
│   ├── page.tsx
│   └── api/
│       ├── prices/route.ts         # CoinGecko price proxy
│       └── transactions/route.ts
├── components/
│   ├── features/
│   │   ├── PortfolioTab.tsx
│   │   ├── EarnTab.tsx
│   │   ├── TradeTab.tsx
│   │   ├── DepositTab.tsx
│   │   └── ActivityTab.tsx
│   └── layout/
│       ├── Navbar.tsx
│       └── TabNav.tsx
├── hooks/
│   ├── useTokenBalances.ts
│   ├── useStaking.ts               # Staking via Starkzap SDK
│   ├── useSwap.ts                  # Swaps via Starkzap SDK
│   ├── useBridge.ts                # Bridge tokens via Starkzap SDK
│   └── useTransactions.ts
└── lib/
    ├── sdk.ts                      # Starkzap SDK initialization
    ├── wallet-context.tsx
    └── utils.ts
```

---

## Built With

- [Starkzap SDK](https://docs.starknet.io/build/starkzap)
- [Starknet](https://starknet.io)
- [AVNU](https://avnu.fi)
- [Voyager](https://voyager.online)
- [StarkGate](https://starkgate.starknet.io)

---

## License

MIT