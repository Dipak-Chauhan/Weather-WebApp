import { RECENT_SEARCHES_KEY } from './config.js';

function readSearches() {
    try {
        const searches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY));

        return Array.isArray(searches)
            ? searches.filter((city) => typeof city === 'string' && city.trim()).slice(0, 5)
            : [];
    } catch {
        return [];
    }
}

function writeSearches(searches) {
    try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    } catch {
        // The dashboard remains usable when storage is unavailable.
    }
}

export function getRecentSearches() {
    return readSearches();
}

export function addRecentSearch(city) {
    const searches = readSearches().filter((search) => search.toLowerCase() !== city.toLowerCase());
    searches.unshift(city);
    const updatedSearches = searches.slice(0, 5);
    writeSearches(updatedSearches);
    return updatedSearches;
}

export function removeRecentSearch(city) {
    const updatedSearches = readSearches().filter((search) => search.toLowerCase() !== city.toLowerCase());
    writeSearches(updatedSearches);
    return updatedSearches;
}
