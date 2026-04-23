const BOOT = window.MERIDIAN_BOOT || { featuredRoutes: [], stats: {}, defaults: {} };

const state = {
  origin: null,
  destination: null,
  routeData: null,
  loading: false,
  speedKnots: BOOT.defaults.speedKnots || 18,
  theme: localStorage.getItem("meridian-theme") || "dark",
  map: null,
  tileLayer: null,
  routeLayer: null,
  originMarker: null,
  destinationMarker: null,
};

const elements = {
  body: document.body,
  controlRail: document.getElementById("control-rail"),
  mobileToggle: document.getElementById("mobile-toggle"),
  themeToggle: document.getElementById("theme-toggle"),
  swapButton: document.getElementById("swap-btn"),
  computeButton: document.getElementById("compute-btn"),
  shareButton: document.getElementById("share-btn"),
  speedSlider: document.getElementById("speed-slider"),
  speedValue: document.getElementById("speed-value"),
  helperCopy: document.getElementById("helper-copy"),
  presetRow: document.getElementById("preset-row"),
  calloutGrid: document.getElementById("callout-grid"),
  emptyState: document.getElementById("empty-state"),
  resultsStack: document.getElementById("results-stack"),
  errorCard: document.getElementById("error-card"),
  mapCallout: document.getElementById("map-callout"),
  routePill: document.getElementById("route-pill"),
  routePillLabel: document.getElementById("route-pill-label"),
  routePillDistance: document.getElementById("route-pill-distance"),
  floatingSummary: document.getElementById("floating-summary"),
  summaryTitle: document.getElementById("summary-title"),
  summaryDistance: document.getElementById("summary-distance"),
  summaryDuration: document.getElementById("summary-duration"),
  summaryGap: document.getElementById("summary-gap"),
  loaderBadge: document.getElementById("loader-badge"),
  metricDistance: document.getElementById("metric-distance"),
  metricDistanceNote: document.getElementById("metric-distance-note"),
  metricGap: document.getElementById("metric-gap"),
  metricGapNote: document.getElementById("metric-gap-note"),
  metricDuration: document.getElementById("metric-duration"),
  metricDurationNote: document.getElementById("metric-duration-note"),
  metricPassages: document.getElementById("metric-passages"),
  metricPassagesNote: document.getElementById("metric-passages-note"),
  briefHeading: document.getElementById("brief-heading"),
  briefCopy: document.getElementById("brief-copy"),
  passageCount: document.getElementById("passage-count"),
  passageTags: document.getElementById("passage-tags"),
  passageNote: document.getElementById("passage-note"),
};

const autocompleteControllers = {
  origin: createAutocompleteController({
    fieldName: "origin",
    input: document.getElementById("origin-input"),
    clearButton: document.getElementById("origin-clear"),
    dropdown: document.getElementById("origin-dropdown"),
  }),
  destination: createAutocompleteController({
    fieldName: "destination",
    input: document.getElementById("destination-input"),
    clearButton: document.getElementById("destination-clear"),
    dropdown: document.getElementById("destination-dropdown"),
  }),
};

init();

function init() {
  setTheme(state.theme);
  initMap();
  bindEvents();
  renderFeaturedRoutes();
  setSpeed(state.speedKnots);
  syncPlannerState();
  hydrateFromQuery();
}

function bindEvents() {
  elements.mobileToggle.addEventListener("click", togglePanel);
  elements.themeToggle.addEventListener("click", handleThemeToggle);
  elements.swapButton.addEventListener("click", swapPorts);
  elements.computeButton.addEventListener("click", computeRoute);
  elements.shareButton.addEventListener("click", shareRoute);
  elements.speedSlider.addEventListener("input", (event) => {
    setSpeed(Number(event.target.value));
  });

  window.addEventListener("resize", handleViewportChange);
}

function createAutocompleteController({ fieldName, input, clearButton, dropdown }) {
  const controller = {
    fieldName,
    input,
    clearButton,
    dropdown,
    suggestions: [],
    activeIndex: -1,
    timerId: null,
  };

  input.addEventListener("input", () => handleAutocompleteInput(controller));
  input.addEventListener("keydown", (event) => handleAutocompleteKeydown(event, controller));
  input.addEventListener("blur", () => {
    window.setTimeout(() => closeDropdown(controller), 120);
  });

  clearButton.addEventListener("click", () => {
    clearSelection(fieldName);
    input.focus();
  });

  return controller;
}

function handleAutocompleteInput(controller) {
  const query = controller.input.value.trim();

  if (!matchesSelectedLabel(controller.fieldName, query)) {
    clearSelection(controller.fieldName, { preserveInput: true });
  }

  updateFieldState(controller);

  window.clearTimeout(controller.timerId);
  if (query.length < 2) {
    closeDropdown(controller);
    return;
  }

  controller.timerId = window.setTimeout(async () => {
    const suggestions = await fetchPortSuggestions(query);
    controller.suggestions = suggestions;
    controller.activeIndex = suggestions.length ? 0 : -1;
    renderDropdown(controller);
  }, 180);
}

function handleAutocompleteKeydown(event, controller) {
  if (!controller.dropdown.children.length) {
    if (event.key === "Enter" && canCompute()) {
      event.preventDefault();
      computeRoute();
    }
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    controller.activeIndex = Math.min(controller.activeIndex + 1, controller.suggestions.length - 1);
    renderDropdown(controller);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    controller.activeIndex = Math.max(controller.activeIndex - 1, 0);
    renderDropdown(controller);
    return;
  }

  if (event.key === "Escape") {
    closeDropdown(controller);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (controller.suggestions[controller.activeIndex]) {
      selectPort(controller.fieldName, controller.suggestions[controller.activeIndex]);
      if (canCompute()) {
        computeRoute();
      }
    }
  }
}

async function fetchPortSuggestions(query) {
  try {
    const response = await fetch(`/api/ports?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch {
    return [];
  }
}

function renderDropdown(controller) {
  controller.dropdown.innerHTML = "";

  if (!controller.suggestions.length) {
    closeDropdown(controller);
    return;
  }

  controller.suggestions.forEach((port, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dropdown-item";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", index === controller.activeIndex ? "true" : "false");
    if (index === controller.activeIndex) {
      button.classList.add("is-active");
    }

    button.innerHTML = `<div><strong>${escapeHtml(port.name)}</strong><span>${escapeHtml(port.country)}</span></div>`;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectPort(controller.fieldName, port);
    });
    controller.dropdown.appendChild(button);
  });

  controller.dropdown.classList.remove("hidden");
}

function closeDropdown(controller) {
  controller.dropdown.classList.add("hidden");
  controller.dropdown.innerHTML = "";
  controller.suggestions = [];
  controller.activeIndex = -1;
}

function selectPort(fieldName, port) {
  const current = state[fieldName];
  if (!current || !samePort(current, port)) {
    resetComputedRoute();
  }

  state[fieldName] = port;
  autocompleteControllers[fieldName].input.value = portLabel(port);
  updateFieldState(autocompleteControllers[fieldName]);
  closeDropdown(autocompleteControllers[fieldName]);
  syncPlannerState();
}

function clearSelection(fieldName, options = {}) {
  const controller = autocompleteControllers[fieldName];
  const hadSelection = Boolean(state[fieldName]);
  state[fieldName] = null;

  if (!options.preserveInput) {
    controller.input.value = "";
  }

  updateFieldState(controller);
  closeDropdown(controller);

  if (hadSelection) {
    resetComputedRoute();
  }

  syncPlannerState();
}

function updateFieldState(controller) {
  const hasValue = controller.input.value.trim().length > 0;
  controller.input.closest(".planner-field").classList.toggle("has-value", hasValue);
}

function renderFeaturedRoutes() {
  const routes = BOOT.featuredRoutes || [];
  elements.presetRow.innerHTML = "";
  elements.calloutGrid.innerHTML = "";

  routes.forEach((route) => {
    const presetButton = document.createElement("button");
    presetButton.type = "button";
    presetButton.className = "preset-pill";
    presetButton.innerHTML = `
      <strong>${escapeHtml(route.label)}</strong>
      <span>${escapeHtml(route.origin.name)} to ${escapeHtml(route.destination.name)}</span>
    `;
    presetButton.addEventListener("click", () => applyFeaturedRoute(route));
    elements.presetRow.appendChild(presetButton);

    const calloutButton = document.createElement("button");
    calloutButton.type = "button";
    calloutButton.className = "callout-pill";
    calloutButton.innerHTML = `
      <strong>${escapeHtml(route.origin.name)} to ${escapeHtml(route.destination.name)}</strong>
      <span>${escapeHtml(route.label)}</span>
    `;
    calloutButton.addEventListener("click", () => applyFeaturedRoute(route));
    elements.calloutGrid.appendChild(calloutButton);
  });
}

function applyFeaturedRoute(route) {
  selectPort("origin", route.origin);
  selectPort("destination", route.destination);
  computeRoute();
}

function swapPorts() {
  if (!state.origin && !state.destination) {
    return;
  }

  resetComputedRoute();

  const previousOrigin = state.origin;
  state.origin = state.destination;
  state.destination = previousOrigin;

  autocompleteControllers.origin.input.value = state.origin ? portLabel(state.origin) : "";
  autocompleteControllers.destination.input.value = state.destination ? portLabel(state.destination) : "";
  updateFieldState(autocompleteControllers.origin);
  updateFieldState(autocompleteControllers.destination);
  syncPlannerState();
}

function canCompute() {
  return Boolean(state.origin && state.destination && !samePort(state.origin, state.destination));
}

async function computeRoute() {
  if (!canCompute() || state.loading) {
    return;
  }

  state.loading = true;
  syncPlannerState();
  hideError();
  elements.loaderBadge.classList.remove("hidden");

  try {
    const response = await fetch("/api/route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origin: state.origin,
        destination: state.destination,
      }),
    });

    const payload = await response.json();
    if (!response.ok || payload.error) {
      throw new Error(payload.error || "Route calculation failed.");
    }

    state.routeData = payload;
    renderReadout();
    renderMapRoute();
    writeStateToUrl();
    openPanel();
  } catch (error) {
    showError(error.message);
  } finally {
    state.loading = false;
    elements.loaderBadge.classList.add("hidden");
    syncPlannerState();
  }
}

function renderReadout() {
  if (!state.routeData) {
    return;
  }

  const route = state.routeData;
  const durationHours = route.distance_naut / state.speedKnots;
  const detourPercent = route.efficiency_ratio ? Math.max(Math.round((route.efficiency_ratio - 1) * 100), 0) : 0;
  const passages = route.passages || [];

  elements.metricDistance.textContent = `${formatNumber(route.distance_naut)} nmi`;
  elements.metricDistanceNote.textContent = `${formatNumber(route.distance_km)} km / ${formatNumber(route.distance_miles)} mi`;

  elements.metricGap.textContent = `${formatNumber(route.detour_naut)} nmi`;
  elements.metricGapNote.textContent = detourPercent
    ? `${detourPercent}% over the great-circle line`
    : `Great-circle line sits at ${formatNumber(route.great_circle_naut)} nmi`;

  elements.metricDuration.textContent = formatVoyage(durationHours);
  elements.metricDurationNote.textContent = `${Math.round(durationHours)} total hours at ${state.speedKnots} kn`;

  elements.metricPassages.textContent = String(passages.length);
  elements.metricPassagesNote.textContent = passages.length
    ? `Named checkpoints surfaced by the routing engine`
    : `No named checkpoints returned on this corridor`;

  elements.briefHeading.textContent = route.brief.headline;
  elements.briefCopy.textContent = `${route.brief.summary} Current ETA assumes ${state.speedKnots} kn.`;

  elements.passageCount.textContent = String(passages.length);
  renderPassageTags(passages);

  elements.summaryTitle.textContent = `${route.origin.name} to ${route.destination.name}`;
  elements.summaryDistance.textContent = `${formatNumber(route.distance_naut)} nmi`;
  elements.summaryDuration.textContent = formatVoyage(durationHours);
  elements.summaryGap.textContent = `${formatNumber(route.detour_naut)} nmi`;

  elements.routePillLabel.textContent = `${route.origin.name} to ${route.destination.name}`;
  elements.routePillDistance.textContent = `${formatNumber(route.distance_naut)} nmi`;

  elements.emptyState.classList.add("hidden");
  elements.resultsStack.classList.remove("hidden");
  elements.mapCallout.classList.add("hidden");
  elements.routePill.classList.remove("hidden");
  elements.floatingSummary.classList.remove("hidden");
  elements.shareButton.disabled = false;
}

function renderPassageTags(passages) {
  elements.passageTags.innerHTML = "";

  if (!passages.length) {
    const fallbackTag = document.createElement("span");
    fallbackTag.textContent = "Open-water corridor";
    elements.passageTags.appendChild(fallbackTag);
    elements.passageNote.textContent = "The engine did not return named chokepoints for this corridor, so the route reads as an open-water lane.";
    return;
  }

  passages.forEach((passage) => {
    const tag = document.createElement("span");
    tag.textContent = titleCase(passage.replace(/_/g, " "));
    elements.passageTags.appendChild(tag);
  });

  elements.passageNote.textContent = "Use these checkpoints as a planning shortcut when discussing route exposure or schedule sensitivity.";
}

function initMap() {
  state.map = L.map("map", {
    center: [20, 10],
    zoom: 2,
    minZoom: 2,
    maxZoom: 14,
    zoomControl: false,
    worldCopyJump: true,
    maxBounds: [
      [-85, -220],
      [85, 220],
    ],
    maxBoundsViscosity: 0.6,
  });

  L.control.zoom({ position: "topright" }).addTo(state.map);
  L.control.scale({ position: "bottomright", imperial: false, maxWidth: 140 }).addTo(state.map);
  setTileLayer();
}

function setTileLayer() {
  if (state.tileLayer) {
    state.map.removeLayer(state.tileLayer);
  }

  const url = state.theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  state.tileLayer = L.tileLayer(url, {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxZoom: 14,
  }).addTo(state.map);
}

function renderMapRoute() {
  clearMapLayers();

  state.routeLayer = L.polyline(state.routeData.coordinates, {
    color: "#9bd4ff",
    weight: 4,
    opacity: 0.92,
    className: "route-line",
  }).addTo(state.map);

  state.originMarker = L.marker([state.origin.lat, state.origin.lon], {
    icon: markerIcon("#3fd0b2"),
  }).bindPopup(`<strong>${escapeHtml(state.origin.name)}</strong><br>${escapeHtml(state.origin.country)}`).addTo(state.map);

  state.destinationMarker = L.marker([state.destination.lat, state.destination.lon], {
    icon: markerIcon("#f97352"),
  }).bindPopup(`<strong>${escapeHtml(state.destination.name)}</strong><br>${escapeHtml(state.destination.country)}`).addTo(state.map);

  state.map.fitBounds(state.routeLayer.getBounds(), {
    padding: [80, 80],
    maxZoom: 7,
  });
}

function markerIcon(color) {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:18px;height:18px;">
        <span style="position:absolute;inset:0;border-radius:50%;background:${color};box-shadow:0 0 0 5px rgba(255,255,255,0.12), 0 8px 20px rgba(0,0,0,0.35);"></span>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function clearMapLayers() {
  ["routeLayer", "originMarker", "destinationMarker"].forEach((key) => {
    if (state[key]) {
      state.map.removeLayer(state[key]);
      state[key] = null;
    }
  });
}

function resetComputedRoute() {
  if (!state.routeData) {
    return;
  }

  state.routeData = null;
  clearMapLayers();
  state.map.setView([20, 10], 2);
  elements.emptyState.classList.remove("hidden");
  elements.resultsStack.classList.add("hidden");
  elements.mapCallout.classList.remove("hidden");
  elements.routePill.classList.add("hidden");
  elements.floatingSummary.classList.add("hidden");
  elements.shareButton.disabled = true;
  hideError();
  clearUrlState();
}

function setSpeed(value) {
  state.speedKnots = value;
  localStorage.setItem("meridian-speed", String(value));
  elements.speedSlider.value = String(value);
  elements.speedValue.textContent = String(value);

  if (state.routeData) {
    renderReadout();
  }

  syncPlannerState();
}

function syncPlannerState() {
  const computeEnabled = canCompute() && !state.loading;
  elements.computeButton.disabled = !computeEnabled;
  elements.shareButton.disabled = !state.routeData || state.loading;

  if (state.loading) {
    elements.computeButton.textContent = "Computing...";
    updateHelper("Routing the maritime corridor and refreshing the map.");
    return;
  }

  elements.computeButton.textContent = "Compute route";

  if (state.origin && state.destination && samePort(state.origin, state.destination)) {
    updateHelper("Choose two different ports before computing the route.");
    return;
  }

  if (state.routeData) {
    updateHelper(`ETA is updating live at ${state.speedKnots} kn. Copy the live link to share this exact setup.`);
    return;
  }

  if (state.origin && state.destination) {
    updateHelper("Planner is ready. Compute the maritime corridor when you want the map and route metrics.");
    return;
  }

  updateHelper("Choose two different ports to unlock the route canvas.");
}

function updateHelper(message) {
  elements.helperCopy.textContent = message;
}

function handleThemeToggle() {
  setTheme(state.theme === "dark" ? "light" : "dark");
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("meridian-theme", theme);
  elements.themeToggle.textContent = theme === "dark" ? "Dark" : "Light";

  const themeColor = theme === "dark" ? "#07131f" : "#eff6fb";
  document.querySelector('meta[name="theme-color"]').setAttribute("content", themeColor);

  if (state.map) {
    setTileLayer();
  }
}

function togglePanel() {
  if (window.innerWidth > 920) {
    return;
  }

  elements.controlRail.classList.toggle("is-open");
  const expanded = elements.controlRail.classList.contains("is-open");
  elements.mobileToggle.setAttribute("aria-expanded", String(expanded));
}

function openPanel() {
  if (window.innerWidth <= 920) {
    elements.controlRail.classList.add("is-open");
    elements.mobileToggle.setAttribute("aria-expanded", "true");
  }
}

function handleViewportChange() {
  if (window.innerWidth > 920) {
    elements.controlRail.classList.add("is-open");
    elements.mobileToggle.setAttribute("aria-expanded", "true");
  }
}

async function hydrateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const savedSpeed = localStorage.getItem("meridian-speed");
  const speedParam = Number(params.get("s"));

  if (!Number.isNaN(speedParam) && speedParam >= 10 && speedParam <= 26) {
    setSpeed(speedParam);
  } else if (savedSpeed) {
    const parsedSavedSpeed = Number(savedSpeed);
    if (!Number.isNaN(parsedSavedSpeed)) {
      setSpeed(parsedSavedSpeed);
    }
  }

  const originToken = params.get("o");
  const destinationToken = params.get("d");
  if (!originToken || !destinationToken) {
    return;
  }

  const [origin, destination] = await Promise.all([
    resolvePortToken(originToken),
    resolvePortToken(destinationToken),
  ]);

  if (!origin || !destination) {
    return;
  }

  selectPort("origin", origin);
  selectPort("destination", destination);
  computeRoute();
}

async function resolvePortToken(token) {
  const [name, country] = token.split("||");
  if (!name) {
    return null;
  }

  try {
    const response = await fetch(
      `/api/resolve-port?name=${encodeURIComponent(name)}&country=${encodeURIComponent(country || "")}`
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

function writeStateToUrl() {
  if (!state.origin || !state.destination) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("o", buildPortToken(state.origin));
  url.searchParams.set("d", buildPortToken(state.destination));
  url.searchParams.set("s", String(state.speedKnots));
  window.history.replaceState({}, "", url);
}

function clearUrlState() {
  const url = new URL(window.location.href);
  url.searchParams.delete("o");
  url.searchParams.delete("d");
  url.searchParams.delete("s");
  window.history.replaceState({}, "", url);
}

async function shareRoute() {
  if (!state.routeData || !state.origin || !state.destination) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("o", buildPortToken(state.origin));
  url.searchParams.set("d", buildPortToken(state.destination));
  url.searchParams.set("s", String(state.speedKnots));

  try {
    await navigator.clipboard.writeText(url.toString());
    updateHelper("Live link copied. Anyone with the URL will load the same ports and speed.");
  } catch {
    updateHelper(`Copy this URL manually: ${url.toString()}`);
  }
}

function showError(message) {
  elements.errorCard.textContent = message;
  elements.errorCard.classList.remove("hidden");
}

function hideError() {
  elements.errorCard.textContent = "";
  elements.errorCard.classList.add("hidden");
}

function matchesSelectedLabel(fieldName, value) {
  const selection = state[fieldName];
  if (!selection) {
    return false;
  }
  return portLabel(selection).toLowerCase() === value.trim().toLowerCase();
}

function samePort(left, right) {
  return Boolean(left && right && left.name === right.name && left.country === right.country);
}

function portLabel(port) {
  return `${port.name}, ${port.country}`;
}

function buildPortToken(port) {
  return `${port.name}||${port.country}`;
}

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: value % 1 ? 1 : 0,
  });
}

function formatVoyage(totalHours) {
  const roundedHours = Math.max(Math.round(totalHours), 0);
  const days = Math.floor(roundedHours / 24);
  const hours = roundedHours % 24;

  if (!days) {
    return `${hours}h`;
  }

  if (!hours) {
    return `${days}d`;
  }

  return `${days}d ${hours}h`;
}

function titleCase(value) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
