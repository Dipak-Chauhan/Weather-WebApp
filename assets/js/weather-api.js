import {
    AIR_POLLUTION_ENDPOINT,
    FORECAST_ENDPOINT,
    WEATHER_API_KEY,
    WEATHER_ENDPOINT
} from './config.js';

function buildUrl(endpoint, parameters) {
    const url = new URL(endpoint);
    url.search = new URLSearchParams({
        ...parameters,
        appid: WEATHER_API_KEY
    });
    return url;
}

async function fetchJson(url, errorMessage) {
    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Location not found');
        }

        if (response.status === 401) {
            throw new Error('Weather service authentication failed');
        }

        throw new Error(errorMessage);
    }

    return response.json();
}

function getWeatherUrl(query) {
    const parameters = query.city
        ? { q: query.city, units: 'metric' }
        : { lat: query.lat, lon: query.lon, units: 'metric' };

    return buildUrl(WEATHER_ENDPOINT, parameters);
}

export async function getWeatherData(query) {
    const weather = await fetchJson(getWeatherUrl(query), 'Unable to load current weather');
    const { lat, lon } = weather.coord;

    const forecastUrl = buildUrl(FORECAST_ENDPOINT, { lat, lon, units: 'metric' });
    const airPollutionUrl = buildUrl(AIR_POLLUTION_ENDPOINT, { lat, lon });

    const [forecast, airQuality] = await Promise.all([
        fetchJson(forecastUrl, 'Unable to load the forecast'),
        fetchJson(airPollutionUrl, 'Unable to load air quality').catch(() => null)
    ]);

    return { weather, forecast, airQuality };
}
