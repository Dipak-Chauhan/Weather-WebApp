import { IP_LOCATION_ENDPOINT } from './config.js';

function getBrowserCoordinates() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
            reject,
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
    });
}

async function getIpCoordinates() {
    const response = await fetch(IP_LOCATION_ENDPOINT);

    if (!response.ok) {
        throw new Error('IP geolocation failed');
    }

    const { latitude, longitude } = await response.json();

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('IP geolocation did not return coordinates');
    }

    return { lat: latitude, lon: longitude };
}

export async function getSuggestedLocation() {
    try {
        return await getBrowserCoordinates();
    } catch {
        try {
            return await getIpCoordinates();
        } catch {
            return null;
        }
    }
}
