import { Actor, log } from 'apify';
import { fetchPackages } from './homebrew.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { packages, packageType = 'formula' } = input;

if (!Array.isArray(packages) || packages.length === 0) {
    throw new Error('Input "packages" must be a non-empty array, e.g. ["wget", "curl"].');
}

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const PACKAGE_LOOKUP_EVENT = 'package-lookup';

const results = await fetchPackages({ packages, packageType });

for (const result of results) {
    await Actor.pushData(result);
}

await Actor.charge({ eventName: PACKAGE_LOOKUP_EVENT });

log.info(`Pushed ${results.length} package record(s)`);

await Actor.exit();
