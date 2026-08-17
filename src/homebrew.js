const BASE_URL = 'https://formulae.brew.sh/api';

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
    const res = await fetch(url, { headers: { Connection: 'close' } });

    if (res.status === 404) {
        return { name, packageType, found: false };
    }
    if (!res.ok) {
        throw new Error(`Homebrew API request for "${name}" failed: ${res.status} ${res.statusText}`);
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
        results.push(await fetchOne(name.trim(), packageType));
    }
    return results;
}
