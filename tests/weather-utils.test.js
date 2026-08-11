import assert from 'node:assert/strict';
import test from 'node:test';

import { getAqi, getBackgroundClass, getDailyForecast, getWeatherIcon } from '../assets/js/weather-utils.js';

test('calculates US AQI from PM2.5 concentrations', () => {
    assert.deepEqual(getAqi(10), { value: 42, label: 'Good', className: 'aqi-good' });
    assert.deepEqual(getAqi(40), { value: 112, label: 'Unhealthy for sensitive groups', className: 'aqi-mod' });
    assert.equal(getAqi(-1), null);
});

test('chooses a weather theme from the reported conditions', () => {
    assert.equal(getBackgroundClass({ main: 'Clear' }, 500, 100, 900), 'clear-day');
    assert.equal(getBackgroundClass({ main: 'Clear' }, 950, 100, 900), 'clear-night');
    assert.equal(getBackgroundClass({ main: 'Thunderstorm' }, 500, 100, 900), 'storm');
});

test('returns module-relative paths for local weather images', () => {
    assert.match(getWeatherIcon({ id: 800, icon: '01d' }), /assets\/images\/clearatday\.png$/);
    assert.match(getWeatherIcon({ id: 500, icon: '10n' }), /assets\/images\/rainatnight\.png$/);
});

test('uses the forecast closest to local noon for each day', () => {
    const entries = [
        { dt: 1717221600, label: 'morning' },
        { dt: 1717232400, label: 'noon' },
        { dt: 1717318800, label: 'next-day-noon' }
    ];

    assert.deepEqual(
        getDailyForecast(entries, 0).map((entry) => entry.label),
        ['noon', 'next-day-noon']
    );
});
