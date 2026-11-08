(() => {
  if (publicView) return;

  const cityKey = "urdesk.weather-city.v1";
  const form = $("homeWeatherForm");
  const cityInput = $("homeWeatherCity");
  const results = $("homeWeatherResults");
  const weatherStatus = $("homeWeatherStatus");
  let city, choices = [], weatherTime = 0, cloudTime = 0, weatherRequest = 0, searchRequest = 0;
  try {
    const saved = JSON.parse(workspaceStorage.getItem(cityKey));
    if (typeof saved?.name === "string" && Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude)) city = saved;
  } catch { /* Weather is optional when browser storage is unavailable. */ }

  const bytes = data => new TextEncoder().encode(data).length;
  const size = count => count >= 1048576 ? (count / 1048576).toFixed(2) + " MB" :
    count >= 1024 ? (count / 1024).toFixed(1) + " KB" : count + " B";

  async function getJSON(url, options) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("request failed");
    return response.json();
  }

  function updateStorage() {
    try {
      const assets = bytes(workspaceStorage.getItem(storageKey) ?? "");
      const work = bytes(workspaceStorage.getItem(workspaceKey) ?? "");
      const locationSize = bytes(workspaceStorage.getItem(cityKey) ?? "");
      $("homeStorageTotal").textContent = size(assets + work + locationSize);
      $("homeStorageAssets").textContent = size(assets) + " · " + (personal?.length ?? 0) + " 台";
      $("homeStorageWorkspace").textContent = size(work + locationSize) + " · " + workspace.tasks.length + " 项待办 / " + workspace.notes.length + " 条笔记";
    } catch {
      $("homeStorageTotal").textContent = "无法读取";
    }

    const config = window.urdeskLedgerConfig;
    if (!config || Date.now() - cloudTime < 60000) return;
    cloudTime = Date.now();
    getJSON(config.url + "/rest/v1/public_device_ledger?id=eq.1&select=devices,ledger,published_at", {
      cache: "no-store", headers: { apikey: config.publishableKey }
    }).then(([entry]) => {
      $("homeStorageCloud").textContent = entry?.published_at
        ? size(bytes(JSON.stringify({ devices: entry.devices, ledger: entry.ledger }))) + " · 已发布"
        : "尚未发布";
    }).catch(() => { $("homeStorageCloud").textContent = "暂时无法读取"; });
  }

  function condition(code) {
    if (code === 0) return "晴";
    if (code === 1 || code === 2) return "多云";
    if (code === 3) return "阴";
    if (code === 45 || code === 48) return "有雾";
    if (code >= 95) return "雷雨";
    if ([71,73,75,77,85,86].includes(code)) return "降雪";
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return "有雨";
    return "天气状况未知";
  }

  async function updateWeather() {
    if (!city || Date.now() - weatherTime < 15 * 60000) return;
    weatherTime = Date.now();
    const requestId = ++weatherRequest;
    const selected = city;
    weatherStatus.textContent = "正在获取 " + selected.name + " 的天气…";
    const query = new URLSearchParams({
      latitude: selected.latitude, longitude: selected.longitude, timezone: "auto", forecast_days: "1",
      current: "temperature_2m,weather_code",
      daily: "temperature_2m_min,temperature_2m_max,precipitation_probability_max"
    });
    try {
      const data = await getJSON("https://api.open-meteo.com/v1/forecast?" + query);
      if (requestId !== weatherRequest) return;
      const current = data.current?.temperature_2m;
      if (!Number.isFinite(current)) throw new Error("weather missing");
      const low = data.daily?.temperature_2m_min?.[0], high = data.daily?.temperature_2m_max?.[0];
      const rain = data.daily?.precipitation_probability_max?.[0];
      weatherStatus.textContent = [selected.name, condition(data.current.weather_code) + " " + Math.round(current) + "°C",
        Number.isFinite(low) && Number.isFinite(high) ? "今日 " + Math.round(low) + "–" + Math.round(high) + "°C" : "",
        Number.isFinite(rain) ? "降水概率最高 " + rain + "%" : ""].filter(Boolean).join(" · ");
    } catch {
      if (requestId !== weatherRequest) return;
      weatherTime = Date.now() - 14 * 60000;
      weatherStatus.textContent = selected.name + "的天气暂时无法读取，请稍后再试。";
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const name = cityInput.value.trim();
    if (!name) return;
    const requestId = ++searchRequest;
    results.hidden = true;
    try {
      const query = new URLSearchParams({ name, language: "zh", count: "8" });
      const data = await getJSON("https://geocoding-api.open-meteo.com/v1/search?" + query);
      if (requestId !== searchRequest) return;
      choices = (data.results ?? []).filter(place =>
        typeof place.name === "string" && Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
      results.replaceChildren(new Option(choices.length ? "选择匹配的城市" : "没有找到城市，可试试拼音", ""),
        ...choices.map((place, index) => new Option([...new Set([place.name, place.admin1, place.country].filter(Boolean))].join(" · "), index)));
    } catch {
      if (requestId !== searchRequest) return;
      results.replaceChildren(new Option("城市搜索暂不可用，请稍后再试", ""));
    }
    results.hidden = false;
  });

  results.addEventListener("change", () => {
    if (results.value === "") return;
    const choice = choices[Number(results.value)];
    if (!choice) return;
    city = { name: choice.name, latitude: choice.latitude, longitude: choice.longitude };
    try { workspaceStorage.setItem(cityKey, JSON.stringify(city)); } catch { /* Use it for this visit. */ }
    results.hidden = true;
    cityInput.value = city.name;
    weatherTime = 0;
    window.urdeskHomeInfo();
  });

  window.urdeskHomeInfo = () => { updateStorage(); updateWeather(); };
  if (city) cityInput.value = city.name;
  if (currentPage() === "home") window.urdeskHomeInfo();
  window.addEventListener("focus", () => { if (currentPage() === "home") window.urdeskHomeInfo(); });
})();
