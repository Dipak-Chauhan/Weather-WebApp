import {
    formatDate,
    formatTime,
    getAqi,
    getBackgroundClass,
    getDailyForecast,
    getWeatherIcon
} from './weather-utils.js';

function getElements() {
    return {
        searchForm: document.getElementById('searchForm'),
        searchInput: document.getElementById('searchInput'),
        locationButton: document.getElementById('locationBtn'),
        recentSearches: document.getElementById('recentSearches'),
        loader: document.getElementById('loader'),
        errorState: document.getElementById('errorState'),
        errorMessage: document.getElementById('errorMessage'),
        errorDetail: document.getElementById('errorDetail'),
        weatherContent: document.getElementById('weatherContent'),
        background: document.getElementById('bgOverlay'),
        cityName: document.getElementById('cityName'),
        countryBadge: document.getElementById('countryBadge'),
        currentDate: document.getElementById('currentDate'),
        currentTemp: document.getElementById('currentTemp'),
        weatherDescription: document.getElementById('weatherDesc'),
        mainWeatherIcon: document.getElementById('mainWeatherIcon'),
        feelsLike: document.getElementById('feelsLike'),
        humidity: document.getElementById('humidity'),
        windSpeed: document.getElementById('windSpeed'),
        pressure: document.getElementById('pressure'),
        visibility: document.getElementById('visibility'),
        aqiValue: document.getElementById('aqiValue'),
        aqiStatus: document.getElementById('aqiStatus'),
        sunriseTime: document.getElementById('sunriseTime'),
        sunsetTime: document.getElementById('sunsetTime'),
        forecastContainer: document.getElementById('forecastContainer')
    };
}

function createIcon(className) {
    const icon = document.createElement('i');
    icon.className = className;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
}

function createForecastItem(entry, timezoneOffset) {
    const item = document.createElement('article');
    item.className = 'forecast-item';

    const date = formatDate(entry.dt, timezoneOffset).split(',');
    const day = document.createElement('span');
    day.className = 'fc-day';
    day.textContent = date[0];

    const dateText = document.createElement('span');
    dateText.className = 'fc-date';
    dateText.textContent = date[1]?.trim() ?? '';

    const icon = document.createElement('img');
    icon.className = 'fc-icon';
    icon.src = getWeatherIcon(entry.weather[0]);
    icon.alt = entry.weather[0].main;

    const temperature = document.createElement('span');
    temperature.className = 'fc-temp';
    temperature.textContent = `${Math.round(entry.main.temp)}°`;

    item.append(day, dateText, icon, temperature);
    return item;
}

function createRecentSearch(city) {
    const chip = document.createElement('div');
    chip.className = 'chip';

    const searchButton = document.createElement('button');
    searchButton.className = 'chip-search';
    searchButton.type = 'button';
    searchButton.dataset.recentAction = 'search';
    searchButton.dataset.city = city;
    searchButton.setAttribute('aria-label', `Search for ${city}`);
    searchButton.append(createIcon('ri-history-line chip-icon'), document.createTextNode(city));

    const deleteButton = document.createElement('button');
    deleteButton.className = 'chip-delete';
    deleteButton.type = 'button';
    deleteButton.dataset.recentAction = 'remove';
    deleteButton.dataset.city = city;
    deleteButton.setAttribute('aria-label', `Remove ${city} from recent searches`);
    deleteButton.append(createIcon('ri-close-line'));

    chip.append(searchButton, deleteButton);
    return chip;
}

export function createWeatherView() {
    const elements = getElements();

    function setVisibleState(state) {
        elements.loader.hidden = state !== 'loading';
        elements.errorState.hidden = state !== 'error';
        elements.weatherContent.hidden = state !== 'weather';
    }

    return {
        bind({ onSearch, onLocation, onRemoveRecent }) {
            elements.searchForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const city = elements.searchInput.value.trim();

                if (city) {
                    onSearch(city);
                    elements.searchInput.blur();
                }
            });

            elements.locationButton.addEventListener('click', onLocation);

            elements.recentSearches.addEventListener('click', (event) => {
                const button = event.target.closest('[data-recent-action]');

                if (!button) return;

                const { city, recentAction } = button.dataset;

                if (recentAction === 'remove') {
                    onRemoveRecent(city);
                    return;
                }

                elements.searchInput.value = city;
                onSearch(city);
            });
        },

        showLoading() {
            setVisibleState('loading');
        },

        showError(message) {
            const isMissingLocation = message === 'Location not found';
            const isLocationUnavailable = message === 'Location unavailable';
            elements.errorMessage.textContent = isMissingLocation
                ? 'City not found'
                : isLocationUnavailable ? 'Location unavailable' : 'Unable to load weather';
            elements.errorDetail.textContent = isMissingLocation
                ? 'Please try a different city or spelling.'
                : isLocationUnavailable ? 'Allow location access or search for a city.' : 'Check your connection and try again.';
            setVisibleState('error');
        },

        renderRecentSearches(cities) {
            elements.recentSearches.replaceChildren(...cities.map(createRecentSearch));
        },

        renderWeather({ weather, forecast, airQuality }) {
            const condition = weather.weather[0];
            const { sunrise, sunset } = weather.sys;
            const { timezone } = weather;

            elements.background.className = `bg-overlay ${getBackgroundClass(condition, weather.dt, sunrise, sunset)}`;
            elements.cityName.textContent = weather.name;
            elements.countryBadge.textContent = weather.sys.country;
            elements.currentDate.textContent = formatDate(weather.dt, timezone);
            elements.currentTemp.textContent = `${Math.round(weather.main.temp)}°`;
            elements.weatherDescription.textContent = condition.description;
            elements.mainWeatherIcon.src = getWeatherIcon(condition, weather.dt, sunrise, sunset);
            elements.mainWeatherIcon.alt = condition.description;
            elements.feelsLike.textContent = `${Math.round(weather.main.feels_like)}°`;
            elements.humidity.textContent = `${weather.main.humidity}%`;
            elements.windSpeed.textContent = `${Math.round(weather.wind.speed * 3.6)} km/h`;
            elements.pressure.textContent = `${weather.main.pressure} hPa`;
            elements.visibility.textContent = weather.visibility ? `${(weather.visibility / 1000).toFixed(1)} km` : 'Unavailable';
            elements.sunriseTime.textContent = formatTime(sunrise, timezone);
            elements.sunsetTime.textContent = formatTime(sunset, timezone);

            const aqi = getAqi(airQuality?.list?.[0]?.components?.pm2_5);
            elements.aqiValue.textContent = aqi?.value ?? '--';
            elements.aqiStatus.textContent = aqi?.label ?? 'Unavailable';
            elements.aqiStatus.className = `aqi-badge ${aqi?.className ?? ''}`;

            const dailyForecast = getDailyForecast(forecast.list, forecast.city.timezone);
            elements.forecastContainer.replaceChildren(
                ...dailyForecast.map((entry) => createForecastItem(entry, forecast.city.timezone))
            );
            setVisibleState('weather');
        }
    };
}
