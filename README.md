# Weather Dashboard

A responsive, no-build weather dashboard powered by the [OpenWeather API](https://openweathermap.org/api). It provides current conditions, air quality, a five-day forecast, recent city searches, and browser or IP-based location lookup.

Live site: https://dipak-chauhan.github.io/Weather-WebApp/

## Project structure

```text
assets/
  css/             Application styles
  images/          Weather and error illustrations
  js/
    app.js         Application orchestration and event wiring
    config.js      API endpoints, key, and application constants
    weather-api.js OpenWeather requests and response handling
    location-service.js Browser and IP location lookup
    recent-searches.js Local storage access
    weather-ui.js  DOM rendering and interaction bindings
    weather-utils.js Formatting, forecast, icon, and AQI helpers
tests/             Node built-in test suite
index.html         Accessible application shell
```

The app uses native ES modules, so it can be deployed directly to GitHub Pages without a bundler or runtime dependencies.

## Run locally

Serve the repository root with any static HTTP server, then open the served address in a browser. ES modules and browser geolocation are not reliable when opening `index.html` directly from the file system.

## Configuration

Update the API key in `assets/js/config.js` when using your own OpenWeather account. Because this is a client-side static application, the key is visible in browser requests. Restrict it to the deployed domains in the OpenWeather dashboard and rotate it if it is exposed unexpectedly.

## Validation

Requires Node.js 18 or newer.

```sh
npm run check
npm test
```

## Deployment

Deploy the repository root to GitHub Pages. All asset paths are relative, so the site works from the repository subpath used by GitHub Pages.
