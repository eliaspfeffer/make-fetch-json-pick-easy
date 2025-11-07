// Zero-dep, universal (Node 18+ or browser). Supports indices [0] and wildcard [*].
// Example paths: "balances[0].balance", "balances[1].asset_type", "balances[*].balance"

export type Selector =
    | string
    | { key?: string; path: string; default?: any; transform?: (v: any) => any };

export async function fetchJsonPick(
    url: string,
    selectors: Selector[],
    opts?: { parseNumbers?: boolean; timeoutMs?: number; headers?: Record<string, string> }
): Promise<Record<string, any>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 15000);
    try {
        const res = await fetch(url, { signal: controller.signal, headers: opts?.headers });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const json = await res.json();

        const out: Record<string, any> = {};
        for (const sel of selectors) {
            const s = typeof sel === "string" ? { key: sel, path: sel } : sel;
            const raw = getByPath(json, tokenize(s.path));
            const val = s.transform ? s.transform(raw) : (raw ?? s.default);
            out[s.key ?? s.path] = opts?.parseNumbers ? numberify(val) : val;
        }
        return out;
    } finally {
        clearTimeout(timer);
    }
}

function tokenize(path: string): (string | number | "*")[] {
    const tokens: (string | number | "*")[] = [];
    const re = /[^.[\]]+|\[(\d+|\*)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(path))) {
        if (m[1] !== undefined) tokens.push(m[1] === "*" ? "*" : Number(m[1]));
        else tokens.push(m[0]);
    }
    return tokens;
}

function getByPath(obj: any, tokens: (string | number | "*")[]): any {
    if (!tokens.length) return obj;
    const [t, ...rest] = tokens;
    if (t === "*") {
        if (!Array.isArray(obj)) return undefined;
        return obj.map((item) => getByPath(item, rest));
    }
    if (obj == null) return undefined;
    return getByPath(obj[t as any], rest);
}

function numberify(v: any): any {
    if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) {
        const n = Number(v);
        return Number.isNaN(n) ? v : n;
    }
    if (Array.isArray(v)) return v.map(numberify);
    if (v && typeof v === "object") {
        const o: Record<string, any> = {};
        for (const k of Object.keys(v)) o[k] = numberify(v[k]);
        return o;
    }
    return v;
}

/* ---------- Beispiel ---------- */
(async () => {
    const url =
        "https://horizon-testnet.stellar.org/accounts/GBTAPBATU6D76Y6DAU7F7LP7VOU47AIXLDRR67LV5OQNZEDROS6QF3ZX";

    const picked = await fetchJsonPick(url, [
        { key: "usd_balance", path: "balances[0].balance" },
        { key: "xlm_balance", path: "balances[1].balance" },
        // Alle Balances als Array:
        { key: "all_balances", path: "balances[*].balance" },
        // Falls Feld fehlt:
        { key: "memo", path: "memo", default: null },
    ]);

    console.log(picked);
})();
