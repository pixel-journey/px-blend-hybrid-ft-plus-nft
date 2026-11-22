# AI handoff — hybrid FT + NFT blend

## Agent tooling

```bash
git clone https://github.com/wharfkit/skill.git ~/.claude/skills/wharfkit
# https://github.com/atomicassets/atomic-knowledge — pin commit, AGENTS.md
```

| Tool | Role |
| --- | --- |
| [atomicassets-contract](https://github.com/pinknetworkx/atomicassets-contract) | mint / burn / transfer |
| [atomic-knowledge](https://github.com/atomicassets/atomic-knowledge) | Network before action |
| [token ledger](https://github.com/pixel-journey/px-token-balance-ledger) | Conservation under a token |
| [wharfkit/skill](https://github.com/wharfkit/skill) | SessionKit for a later host |

## Non-negotiables

1. **PXJ precision is always 8.** `1.00000000 PXJ` = `100_000_000` minor units. `1.0000 PXJ` is refused.
2. Action order: **burns**, then **sink transfer**, then **mint**. All `sent: false` here.
3. FT notify needs **two names**: token contract as first receiver, and `self` for the vault.
4. Chain asset rows are required at craft time. The vault book alone is not ownership proof.
5. `source: "chain"` is a test tag, not a table load.
6. Issued supply is **not** incremented in this pure lab.
7. Do not copy a one-string `shouldHandleNotify` from the contract template into FT notify.

## Prompt seeds

- "Debit 1.00000000 PXJ and two NFT ingredients — list returned action kinds in order."
- "Refuse precision-4 PXJ amount strings."
- "Explain why firstReceiver must be the token contract on the FT leg."
- "Point at simple blend and wildcard without merging their match rules."

## Do not

- Change PXJ precision to "fix" dust.
- Claim atomic on-chain blend from `sent: false` intents.
- Open a micro-repo for a renamed sink account.
