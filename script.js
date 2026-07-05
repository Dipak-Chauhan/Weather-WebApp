const API_KEY = 'a84d55b8a92eb1454fd5accfed4c87cc';
const BASE_URL_WEATHER = 'https://api.openweathermap.org/data/2.5/weather';
const BASE_URL_FORECAST = 'https://api.openweathermap.org/data/2.5/forecast';

// DOM Elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const locationBtn = document.getElementById('locationBtn');
const recentSearchesContainer = document.getElementById('recentSearches');
const loader = document.getElementById('loader');
const errorState = document.getElementById('errorState');
const weatherContent = document.getElementById('weatherContent');
const bgOverlay = document.getElementById('bgOverlay');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadRecentSearches();
    initLocationSearch();
});

function initLocationSearch() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeather({ lat: latitude, lon: longitude });
            },
            (error) => {
                console.warn("Browser Geolocation failed/denied. Trying IP Geolocation fallback...");
                fetchIPLocation();
            }
        );
    } else {
        fetchIPLocation();
    }
}

async function fetchIPLocation() {
    try {
        const response = await fetch('https://freeipapi.com/api/json');
        if (!response.ok) throw new Error('IP Geolocation failed');
        const data = await response.json();
        if (data.latitude && data.longitude) {
            fetchWeather({ lat: data.latitude, lon: data.longitude });
        } else {
            fetchWeather({ city: 'London' }); // Default fallback
        }
    } catch (error) {
        console.error("IP Geolocation error:", error);
        fetchWeather({ city: 'London' }); // Default fallback
    }
}

// Event Listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = searchInput.value.trim();
    if (city) {
        fetchWeather({ city });
        searchInput.blur();
    }
});

locationBtn.addEventListener('click', () => {
    showLoader();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeather({ lat: latitude, lon: longitude });
            },
            (error) => {
                console.warn("Browser geolocation failed on click. Trying IP Geolocation...");
                fetchIPLocation();
            }
        );
    } else {
        fetchIPLocation();
    }
});

// Fetching Logic
async function fetchWeather(query) {
    showLoader();
    try {
        let weatherUrl;
        if (query.city) {
            weatherUrl = `${BASE_URL_WEATHER}?q=${query.city}&units=metric&appid=${API_KEY}`;
        } else {
            weatherUrl = `${BASE_URL_WEATHER}?lat=${query.lat}&lon=${query.lon}&units=metric&appid=${API_KEY}`;
        }

        const weatherRes = await fetch(weatherUrl);
        if (!weatherRes.ok) {
            throw new Error('Location not found');
        }
        const weatherData = await weatherRes.json();
        
        // Fetch forecast and AQI using resolved coordinates
        const { lat, lon } = weatherData.coord;
        const forecastUrl = `${BASE_URL_FORECAST}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
        const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

        const [forecastRes, aqiRes] = await Promise.all([
            fetch(forecastUrl),
            fetch(aqiUrl)
        ]);

        if (!forecastRes.ok || !aqiRes.ok) {
            throw new Error('Failed to fetch detailed weather data');
        }

        const forecastData = await forecastRes.json();
        const aqiData = await aqiRes.json();

        updateUI(weatherData, forecastData, aqiData);
        saveRecentSearch(weatherData.name);

    } catch (error) {
        showError(error.message);
    }
}

// UI Updaters
function updateUI(weatherData, forecastData, aqiData) {
    hideLoader();
    weatherContent.style.display = 'flex';
    errorState.style.display = 'none';

    // 1. Update Background Theme
    updateBackground(weatherData);

    // 2. Update Current Weather Hero
    document.getElementById('cityName').textContent = weatherData.name;
    document.getElementById('countryBadge').textContent = weatherData.sys.country;
    
    // Format Date
    const now = new Date(weatherData.dt * 1000);
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
    
    document.getElementById('currentTemp').innerHTML = `${Math.round(weatherData.main.temp)}&deg;`;
    document.getElementById('weatherDesc').textContent = weatherData.weather[0].description;
    
    // Set Main Icon
    document.getElementById('mainWeatherIcon').src = getWeatherIcon(weatherData.weather[0], weatherData.sys);

    // 3. Update Details Grid
    document.getElementById('feelsLike').innerHTML = `${Math.round(weatherData.main.feels_like)}&deg;`;
    document.getElementById('humidity').textContent = `${weatherData.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(weatherData.wind.speed * 3.6)} km/h`; // m/s to km/h
    document.getElementById('pressure').textContent = `${weatherData.main.pressure} hPa`;
    document.getElementById('visibility').textContent = `${(weatherData.visibility / 1000).toFixed(1)} km`;

    // Update AQI Card
    if (aqiData && aqiData.list && aqiData.list.length > 0) {
        const pm25 = aqiData.list[0].components.pm2_5;
        const usAqi = calculateUSAQI(pm25);
        const aqiValueEl = document.getElementById('aqiValue');
        const aqiStatusEl = document.getElementById('aqiStatus');
        
        let aqiStatus = '';
        let aqiClass = '';
        
        if (usAqi <= 50) {
            aqiStatus = 'Good';
            aqiClass = 'aqi-good';
        } else if (usAqi <= 100) {
            aqiStatus = 'Moderate';
            aqiClass = 'aqi-fair';
        } else if (usAqi <= 150) {
            aqiStatus = 'Unhealthy for Sensitive Groups';
            aqiClass = 'aqi-mod';
        } else if (usAqi <= 200) {
            aqiStatus = 'Unhealthy';
            aqiClass = 'aqi-poor';
        } else {
            aqiStatus = 'Very Unhealthy';
            aqiClass = 'aqi-vpoor';
        }
        
        aqiValueEl.textContent = usAqi;
        aqiStatusEl.textContent = aqiStatus;
        aqiStatusEl.className = `aqi-badge ${aqiClass}`;
    }

    // Sunrise & Sunset (accounting for timezone offset)
    const timezoneOffset = weatherData.timezone; // in seconds
    const sunriseDate = new Date((weatherData.sys.sunrise + timezoneOffset) * 1000);
    const sunsetDate = new Date((weatherData.sys.sunset + timezoneOffset) * 1000);
    
    // We use UTC methods because we manually added the timezone offset above
    document.getElementById('sunriseTime').textContent = formatTimeUTC(sunriseDate);
    document.getElementById('sunsetTime').textContent = formatTimeUTC(sunsetDate);

    // 4. Update Forecast
    updateForecast(forecastData);
}

function updateBackground(weatherData) {
    const main = weatherData.weather[0].main.toLowerCase();
    const isDay = weatherData.dt > weatherData.sys.sunrise && weatherData.dt < weatherData.sys.sunset;
    
    bgOverlay.className = 'bg-overlay'; // Reset
    
    if (main.includes('clear')) {
        bgOverlay.classList.add(isDay ? 'clear-day' : 'clear-night');
    } else if (main.includes('cloud')) {
        bgOverlay.classList.add('cloudy');
    } else if (main.includes('rain') || main.includes('drizzle')) {
        bgOverlay.classList.add('rainy');
    } else if (main.includes('snow')) {
        bgOverlay.classList.add('snow');
    } else if (main.includes('thunderstorm')) {
        bgOverlay.classList.add('storm');
    } else {
        bgOverlay.classList.add('cloudy'); // default for haze/mist
    }
}

function getWeatherIcon(weatherItem, sys = null) {
    const id = weatherItem.id;
    const main = weatherItem.main.toLowerCase();
    let isDay = true;
    
    // Determine if day/night if sys object with sunrise/sunset is provided
    if (sys && sys.sunrise && sys.sunset) {
        const now = Math.floor(Date.now() / 1000);
        isDay = now > sys.sunrise && now < sys.sunset;
    } else if (weatherItem.icon) {
        // Fallback for forecast items using OWM icon code (ends with 'd' or 'n')
        isDay = weatherItem.icon.endsWith('d');
    }

    if (id >= 200 && id < 300) return isDay ? 'images/stormatday.png' : 'images/stormatnight.png';
    if (id >= 300 && id < 600) return isDay ? 'images/rainatday.png' : 'images/rainatnight.png';
    if (id >= 600 && id < 700) return isDay ? 'images/snowfallatday.png' : 'images/snowfallatnight.png';
    if (id >= 700 && id < 800) return 'images/haze.png'; // Mist, Smoke, Haze
    if (id === 800) return isDay ? 'images/clearatday.png' : 'images/clearatnight.png';
    if (id > 800) return isDay ? 'images/cloudyatday.png' : 'images/cloudyatnight.png';
    
    return 'images/clearatday.png'; // Fallback
}

function updateForecast(forecastData) {
    const container = document.getElementById('forecastContainer');
    container.innerHTML = '';

    // Filter to get roughly 1 forecast per day (around 12:00 PM local time)
    // The API returns 3-hour intervals. We'll pick items whose txt contains '12:00:00'
    const dailyData = forecastData.list.filter(item => {
        return item.dt_txt.includes('12:00:00');
    });

    // If we missed a day (e.g., today is past 12pm), just slice first 5 distinct days
    let finalForecast = dailyData;
    if (dailyData.length < 5) {
         // Fallback to taking every 8th item (24 hours) starting from index 0
         finalForecast = forecastData.list.filter((_, index) => index % 8 === 0).slice(0, 5);
    } else {
        finalForecast = dailyData.slice(0, 5);
    }

    finalForecast.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const temp = Math.round(item.main.temp);
        const iconSrc = getWeatherIcon(item.weather[0]);

        const card = document.createElement('div');
        card.className = 'forecast-item';
        card.innerHTML = `
            <span class="fc-day">${dayName}</span>
            <span class="fc-date">${dateString}</span>
            <img src="${iconSrc}" class="fc-icon" alt="${item.weather[0].main}">
            <span class="fc-temp">${temp}&deg;</span>
        `;
        container.appendChild(card);
    });
}

// Local Storage for Recent Searches
function saveRecentSearch(city) {
    let searches = JSON.parse(localStorage.getItem('recentSearches')) || [];
    
    // Remove if already exists to move to front
    searches = searches.filter(s => s.toLowerCase() !== city.toLowerCase());
    
    // Add to front
    searches.unshift(city);
    
    // Keep only last 5
    if (searches.length > 5) searches.pop();
    
    localStorage.setItem('recentSearches', JSON.stringify(searches));
    loadRecentSearches();
}

function loadRecentSearches() {
    const searches = JSON.parse(localStorage.getItem('recentSearches')) || [];
    recentSearchesContainer.innerHTML = '';
    
    searches.forEach(city => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerHTML = `
            <i class="ri-history-line chip-icon"></i>
            <span class="chip-text">${city}</span>
            <i class="ri-close-line chip-delete"></i>
        `;
        
        // Search when clicking the label or icon
        const handleSearch = () => {
            searchInput.value = city;
            fetchWeather({ city });
        };
        
        chip.querySelector('.chip-text').addEventListener('click', handleSearch);
        chip.querySelector('.chip-icon').addEventListener('click', handleSearch);
        
        // Remove search when clicking the cross
        chip.querySelector('.chip-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            removeRecentSearch(city);
        });
        
        recentSearchesContainer.appendChild(chip);
    });
}

function removeRecentSearch(city) {
    let searches = JSON.parse(localStorage.getItem('recentSearches')) || [];
    searches = searches.filter(s => s.toLowerCase() !== city.toLowerCase());
    localStorage.setItem('recentSearches', JSON.stringify(searches));
    loadRecentSearches();
}

// Helpers
function showLoader() {
    weatherContent.style.display = 'none';
    errorState.style.display = 'none';
    loader.style.display = 'flex';
}

function hideLoader() {
    loader.style.display = 'none';
}

function showError(msg) {
    hideLoader();
    weatherContent.style.display = 'none';
    errorState.style.display = 'flex';
    if(msg === 'Location not found') {
        document.getElementById('errorMessage').textContent = "City not found";
    } else {
        document.getElementById('errorMessage').textContent = "Oops!";
    }
}

function formatTimeUTC(date) {
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${minutes} ${ampm}`;
}

function calculateUSAQI(pm25) {
    if (pm25 < 0) return 0;
    
    const breakpoints = [
        { bpL: 0.0, bpH: 12.0, iL: 0, iH: 50 },
        { bpL: 12.1, bpH: 35.4, iL: 51, iH: 100 },
        { bpL: 35.5, bpH: 55.4, iL: 101, iH: 150 },
        { bpL: 55.5, bpH: 150.4, iL: 151, iH: 200 },
        { bpL: 150.5, bpH: 250.4, iL: 201, iH: 300 },
        { bpL: 250.5, bpH: 350.4, iL: 301, iH: 400 },
        { bpL: 350.5, bpH: 500.4, iL: 401, iH: 500 }
    ];

    for (const range of breakpoints) {
        if (pm25 >= range.bpL && pm25 <= range.bpH) {
            return Math.round(
                ((range.iH - range.iL) / (range.bpH - range.bpL)) * (pm25 - range.bpL) + range.iL
            );
        }
    }
    return 500;
}