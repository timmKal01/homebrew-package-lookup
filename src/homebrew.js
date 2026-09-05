const BASE_URL = 'https://formulae.brew.sh/api';
const REQUEST_TIMEOUT_MS = 30_000;

/** formulae.brew.sh is occasionally slow or 429s/5xxs under load — retry with backoff rather
 *  than ever treating a throttle or timeout as "no data." */
async function fetchWithRetry(url, { retries = 4, baseDelayMs = 1500 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const res = await fetch(url, { headers: { Connection: 'close' }, signal: controller.signal });
            if (res.status === 404) return res; // unknown formula/cask — not retryable, caller handles it
            if (res.ok) return res;
            if (![429, 500, 502, 503, 504].includes(res.status)) {
                throw new Error(`Homebrew API request failed: ${res.status} ${res.statusText}`);
            }
            lastErr = new Error(`Homebrew API returned ${res.status}`);
        } catch (err) {
            lastErr = err.name === 'AbortError' ? new Error('Homebrew API request timed out') : err;
        } finally {
            clearTimeout(timeout);
        }
        if (attempt < retries) {
            await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
        }
    }
    throw lastErr;
}

function installCounts(analytics) {
    const pick = (period) => {
        const bucket = analytics?.install?.[period];
        if (!bucket) return null;
        // The analytics object keys installs by the exact invocation string (e.g. "wget" or
        // "wget --HEAD"); sum every variant rather than assuming there's exactly one key.
        return Object.values(bucket).reduce((sum, n) => sum + n, 0);
    };
    return { installs30d: pick('30d'), installs90d: pick('90d'), installs365d: pick('365d') };
}

async function fetchOne(name, packageType) {
    const url = `${BASE_URL}/${packageType}/${encodeURIComponent(name)}.json`;
    const res = await fetchWithRetry(url);

    if (res.status === 404) {
        return { name, packageType, found: false };
    }
    const data = await res.json();
    const counts = installCounts(data.analytics);

    if (packageType === 'cask') {
        return {
            name,
            packageType,
            found: true,
            displayName: data.name?.[0] ?? name,
            version: data.version,
            description: data.desc ?? null,
            homepage: data.homepage,
            tap: data.tap,
            autoUpdates: data.auto_updates ?? null,
            deprecated: data.deprecated,
            deprecationReason: data.deprecation_reason ?? null,
            disabled: data.disabled,
            disableReason: data.disable_reason ?? null,
            ...counts,
        };
    }

    return {
        name,
        packageType,
        found: true,
        displayName: data.full_name ?? name,
        version: data.versions?.stable ?? null,
        description: data.desc ?? null,
        homepage: data.homepage,
        license: data.license ?? null,
        tap: data.tap,
        dependencies: data.dependencies ?? [],
        deprecated: data.deprecated,
        deprecationReason: data.deprecation_reason ?? null,
        disabled: data.disabled,
        disableReason: data.disable_reason ?? null,
        ...counts,
    };
}

export async function fetchPackages({ packages, packageType }) {
    const results = [];
    for (const name of packages) {
        try {
            results.push(await fetchOne(name.trim(), packageType));
        } catch (err) {
            // Don't let one bad/unreachable package sink the whole batch.
            results.push({ name: name.trim(), packageType, found: false, error: err.message });
        }
    }
    return results;
}
