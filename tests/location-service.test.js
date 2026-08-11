import assert from 'node:assert/strict';
import test from 'node:test';

import { getSuggestedLocation } from '../assets/js/location-service.js';

function replaceGlobal(testContext, name, value) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    testContext.after(() => {
        if (descriptor) {
            Object.defineProperty(globalThis, name, descriptor);
        } else {
            delete globalThis[name];
        }
    });
}

test('uses a fresh high-accuracy browser position by default', async (testContext) => {
    let options;
    replaceGlobal(testContext, 'navigator', {
        geolocation: {
            getCurrentPosition(resolve, reject, requestedOptions) {
                options = requestedOptions;
                resolve({ coords: { latitude: 21.17, longitude: 72.83 } });
            }
        }
    });

    assert.deepEqual(await getSuggestedLocation(), { lat: 21.17, lon: 72.83 });
    assert.deepEqual(options, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
});

test('retries browser positioning without high accuracy after a timeout', async (testContext) => {
    const options = [];
    replaceGlobal(testContext, 'navigator', {
        geolocation: {
            getCurrentPosition(resolve, reject, requestedOptions) {
                options.push(requestedOptions);

                if (options.length === 1) {
                    reject({ code: 3 });
                    return;
                }

                resolve({ coords: { latitude: 21.2, longitude: 72.8 } });
            }
        }
    });

    assert.deepEqual(await getSuggestedLocation(), { lat: 21.2, lon: 72.8 });
    assert.deepEqual(options, [
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    ]);
});

test('uses the secondary IP provider when both browser positioning attempts fail', async (testContext) => {
    const endpoints = [];
    let browserAttempts = 0;
    replaceGlobal(testContext, 'navigator', {
        geolocation: {
            getCurrentPosition(resolve, reject) {
                browserAttempts += 1;
                reject({ code: 3 });
            }
        }
    });
    replaceGlobal(testContext, 'fetch', async (endpoint) => {
        endpoints.push(endpoint);

        if (endpoints.length === 1) {
            return { ok: false };
        }

        return {
            ok: true,
            json: async () => ({ latitude: 21.61, longitude: 71.23 })
        };
    });

    assert.deepEqual(await getSuggestedLocation(), { lat: 21.61, lon: 71.23 });
    assert.equal(browserAttempts, 2);
    assert.deepEqual(endpoints, ['https://freeipapi.com/api/json', 'https://ipwho.is/']);
});

test('does not replace denied browser location access with an imprecise IP city', async (testContext) => {
    let fetched = false;
    replaceGlobal(testContext, 'navigator', {
        geolocation: {
            getCurrentPosition(resolve, reject) {
                reject({ code: 1 });
            }
        }
    });
    replaceGlobal(testContext, 'fetch', async () => {
        fetched = true;
        throw new Error('IP lookup should not run');
    });

    assert.equal(await getSuggestedLocation(), null);
    assert.equal(fetched, false);
});
