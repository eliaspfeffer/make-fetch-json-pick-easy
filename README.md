# fetch-json-pick
Minimal TS helper for **extracting specific fields*** from any JSON API. Input: URL + fields. Output: The value of that field – with path syntax, wildcards, defaults, transform, timeout and optional number parsing.

## Problem → Solution
APIs return huge JSON payloads; you need **just a few fields**.  
`fetchJsonPick(url, selectors)` fetches, parses, and returns **only what you asked for** — reusable, terse, robust.

## Quickstart

```ts
// src/fetchJsonPick.ts (copy file from this repo or adapt to your setup)
import { fetchJsonPick } from "./fetchJsonPick";

const url =
  "https://horizon-testnet.stellar.org/accounts/GBTAPBATU6D76Y6DAU7F7LP7VOU47AIXLDRR67LV5OQNZEDROS6QF3ZX";

(async () => {
  const res = await fetchJsonPick(
    url,
    [
      { key: "usd_balance", path: "balances[0].balance" },
      { key: "xlm_balance", path: "balances[1].balance" },
      { key: "all_balances", path: "balances[*].balance" },
      { key: "maybe_missing", path: "foo.bar", default: null },
    ],
    { parseNumbers: true, timeoutMs: 8000 }
  );
  console.log(res);
})();
```

## Example output

```json
{
  "usd_balance": 499999999845.621776,
  "xlm_balance": 19989.4792986,
  "all_balances": [499999999845.621776, 19989.4792986],
  "maybe_missing": null
}
```

## API

type Selector =
  | string // e.g. "balances[1].balance"
  | {
      key?: string;                     // result key (defaults to path)
      path: string;                     // path expression (see below)
      default?: any;                    // fallback when undefined
      transform?: (v: any) => any;      // per-selector post-processing
    };

function fetchJsonPick(
  url: string,
  selectors: Selector[],
  opts?: {
    parseNumbers?: boolean;             // "123.45" -> 123.45 (recursive)
    timeoutMs?: number;                 // default 15000
    headers?: Record<string, string>;   // e.g. Authorization
  }
): Promise<Record<string, any>>;

## PATH Syntax

Dot notation: ```a.b.c```

Array index: ```items[0].id```

Wildcard: ```items[*].id``` → returns an array

Composable: ```data.results[*].prices[0].value```

## Features

- Wildcard extraction across arrays
- Defaults when paths are missing
- Per-selector transforms, e.g. `(v) => Number(v).toFixed(2)`
- Timeout and headers control
- Optional number parsing that converts numeric strings

## Error Behavior

- Non-2xx HTTP responses throw an error with the status code
- Missing paths resolve to `undefined` unless a default is supplied
- Applying a wildcard to a non-array yields `undefined`

## Compatibility

- Runs in Node 18+ (native `fetch`) and modern browsers
- ESM/TypeScript first; bundle for CJS if needed

## More Examples

Stellar account balances (first, second, and all values):

```ts
await fetchJsonPick(url, [
  { key: "usd", path: "balances[0].balance" },
  { key: "xlm", path: "balances[1].balance" },
  { key: "all", path: "balances[*].balance" },
], { parseNumbers: true });
```

Transform with defaults:

```ts
await fetchJsonPick(url, [
  { key: "seq", path: "sequence", transform: (v) => Number(v) },
  { key: "memo", path: "memo", default: "" },
]);
```

String shorthand selectors:

```ts
await fetchJsonPick(url, ["id", "account_id", "thresholds.high_threshold"]);
```

## License

MIT