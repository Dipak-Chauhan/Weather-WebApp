import { getSuggestedLocation } from './location-service.js';
import { addRecentSearch, getRecentSearches, removeRecentSearch } from './recent-searches.js';
import { getWeatherData } from './weather-api.js';
import { createWeatherView } from './weather-ui.js';

const view = createWeatherView();

async function loadWeather(query) {
    view.showLoading();

    try {
        const weatherData = await getWeatherData(query);
        view.renderWeather(weatherData);

        if (query.city) {
            view.renderRecentSearches(addRecentSearch(weatherData.weather.name));
        }
    } catch (error) {
        view.showError(error.message);
    }
}

async function loadCurrentLocation() {
    view.showLoading();
    const location = await getSuggestedLocation();

    if (!location) {
        view.showError('Location unavailable');
        return;
    }

    loadWeather(location);
}

view.bind({
    onSearch: (city) => loadWeather({ city }),
    onLocation: loadCurrentLocation,
    onRemoveRecent: (city) => view.renderRecentSearches(removeRecentSearch(city))
});

view.renderRecentSearches(getRecentSearches());
loadCurrentLocation();
