import { IP_LOCATION_ENDPOINTS } from './config.js';

const HIGH_ACCURACY_OPTIONS = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };
const STANDARD_ACCURACY_OPTIONS = { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 };

function getBrowserCoordinates(options) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
            reject,
            options
        );
    });
}

async function getIpCoordinates() {
    for (const endpoint of IP_LOCATION_ENDPOINTS) {
        try {
            const response = await fetch(endpoint);

            if (!response.ok) continue;

            const { latitude, longitude } = await response.json();

            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                return { lat: latitude, lon: longitude };
            }
        } catch {
            // Try the next provider when a network request or response fails.
        }
    }

    throw new Error('IP geolocation did not return coordinates');
}

export async function getSuggestedLocation() {
    try {
        return await getBrowserCoordinates(HIGH_ACCURACY_OPTIONS);
    } catch (error) {
        if (error?.code !== 1) {
            try {
                return await getBrowserCoordinates(STANDARD_ACCURACY_OPTIONS);
            } catch {
                // Use IP lookup when neither browser positioning mode succeeds.
            }
        }
    }

    try {
        return await getIpCoordinates();
    } catch {
        return null;
    }
}
