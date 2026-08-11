const ICON_DIRECTORY = new URL('../images/', import.meta.url);
const OPENWEATHER_ICON_DIRECTORY = 'https://openweathermap.org/img/wn/';

const AQI_RANGES = [
    { pmLow: 0, pmHigh: 12, indexLow: 0, indexHigh: 50, label: 'Good', className: 'aqi-good' },
    { pmLow: 12.1, pmHigh: 35.4, indexLow: 51, indexHigh: 100, label: 'Moderate', className: 'aqi-fair' },
    { pmLow: 35.5, pmHigh: 55.4, indexLow: 101, indexHigh: 150, label: 'Unhealthy for sensitive groups', className: 'aqi-mod' },
    { pmLow: 55.5, pmHigh: 150.4, indexLow: 151, indexHigh: 200, label: 'Unhealthy', className: 'aqi-poor' },
    { pmLow: 150.5, pmHigh: 500.4, indexLow: 201, indexHigh: 500, label: 'Very unhealthy', className: 'aqi-vpoor' }
];

function getLocalDate(timestamp, timezoneOffset) {
    return new Date((timestamp + timezoneOffset) * 1000);
}

function getIconFile(condition, isDay) {
    const id = condition.id;

    if (id >= 200 && id < 300) return isDay ? 'stormatday.png' : 'stormatnight.png';
    if (id >= 300 && id < 600) return isDay ? 'rainatday.png' : 'rainatnight.png';
    if (id >= 600 && id < 700) return isDay ? 'snowfallatday.png' : 'snowfallatnight.png';
    if (id >= 700 && id < 800) return 'haze.png';
    if (id === 800) return isDay ? 'clearatday.png' : 'clearatnight.png';
    return isDay ? 'cloudyatday.png' : 'cloudyatnight.png';
}

export function getWeatherIcon(condition, timestamp, sunrise, sunset) {
    if (condition.icon) {
        return `${OPENWEATHER_ICON_DIRECTORY}${condition.icon}@2x.png`;
    }

    const isDay = sunrise && sunset
        ? timestamp > sunrise && timestamp < sunset
        : condition.icon?.endsWith('d');

    return new URL(getIconFile(condition, Boolean(isDay)), ICON_DIRECTORY).href;
}

export function getBackgroundClass(condition, timestamp, sunrise, sunset) {
    const main = condition.main.toLowerCase();
    const isDay = timestamp > sunrise && timestamp < sunset;

    if (main.includes('clear')) return isDay ? 'clear-day' : 'clear-night';
    if (main.includes('rain') || main.includes('drizzle')) return 'rainy';
    if (main.includes('snow')) return 'snow';
    if (main.includes('thunderstorm')) return 'storm';
    return 'cloudy';
}

export function formatDate(timestamp, timezoneOffset) {
    return getLocalDate(timestamp, timezoneOffset).toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC'
    });
}

export function formatTime(timestamp, timezoneOffset) {
    return getLocalDate(timestamp, timezoneOffset).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC'
    });
}

export function getDailyForecast(entries, timezoneOffset) {
    const days = new Map();

    for (const entry of entries) {
        const localDate = getLocalDate(entry.dt, timezoneOffset);
        const dayKey = localDate.toISOString().slice(0, 10);
        const distanceFromNoon = Math.abs(localDate.getUTCHours() - 12);
        const currentEntry = days.get(dayKey);

        if (!currentEntry || distanceFromNoon < currentEntry.distanceFromNoon) {
            days.set(dayKey, { entry, distanceFromNoon });
        }
    }

    return [...days.values()].map(({ entry }) => entry).slice(0, 5);
}

export function getAqi(pm25) {
    if (!Number.isFinite(pm25) || pm25 < 0) return null;

    const concentration = Math.floor(pm25 * 10) / 10;
    const range = AQI_RANGES.find(({ pmHigh }) => concentration <= pmHigh) ?? AQI_RANGES.at(-1);
    const value = ((range.indexHigh - range.indexLow) / (range.pmHigh - range.pmLow))
        * (concentration - range.pmLow) + range.indexLow;

    return {
        value: Math.min(500, Math.max(0, Math.round(value))),
        label: range.label,
        className: range.className
    };
}
