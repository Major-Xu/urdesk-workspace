"use strict";

const $ = id => document.getElementById(id);
const modes = {
  高铁: ["#02786c", null], 火车: ["#3971a8", "9 4"], 飞机: ["#7048a6", "4 8"],
  自驾: ["#b76624", "13 4 3 4"], 其他: ["#657687", "2 6"],
};
const statuses = ["计划中", "进行中", "已完成"];
const cityCenters = Object.fromEntries(
  ("北京 39.90 116.41|天津 39.13 117.20|上海 31.23 121.47|重庆 29.56 106.55|合肥 31.82 117.23|芜湖 31.33 118.38|蚌埠 32.92 117.39|阜阳 32.89 115.81|马鞍山 31.67 118.51|安庆 30.53 117.12|黄山 29.71 118.34|六安 31.74 116.51|淮南 32.63 117.00|滁州 32.30 118.32|宿州 33.65 116.96|宣城 30.94 118.76|铜陵 30.94 117.81|池州 30.66 117.49|亳州 33.85 115.78|淮北 33.96 116.80|" +
   "南京 32.06 118.80|苏州 31.30 120.59|无锡 31.49 120.31|常州 31.81 119.97|南通 31.98 120.89|扬州 32.39 119.41|镇江 32.19 119.42|徐州 34.21 117.28|盐城 33.35 120.16|泰州 32.46 119.92|淮安 33.61 119.02|连云港 34.60 119.22|宿迁 33.96 118.28|" +
   "杭州 30.27 120.15|宁波 29.87 121.55|温州 27.99 120.70|嘉兴 30.75 120.76|绍兴 30.03 120.58|金华 29.08 119.65|义乌 29.31 120.08|湖州 30.89 120.09|台州 28.66 121.42|舟山 29.99 122.20|衢州 28.97 118.87|丽水 28.47 119.92|" +
   "广州 23.13 113.26|深圳 22.54 114.06|珠海 22.27 113.58|佛山 23.02 113.12|东莞 23.02 113.75|中山 22.52 113.39|惠州 23.11 114.42|江门 22.58 113.08|汕头 23.35 116.68|湛江 21.27 110.36|" +
   "济南 36.65 117.12|青岛 36.07 120.38|烟台 37.46 121.45|威海 37.51 122.12|潍坊 36.71 119.16|淄博 36.81 118.05|临沂 35.10 118.36|济宁 35.41 116.59|泰安 36.20 117.09|" +
   "武汉 30.59 114.31|宜昌 30.69 111.29|襄阳 32.01 112.12|荆州 30.34 112.24|长沙 28.23 112.94|株洲 27.83 113.13|岳阳 29.36 113.13|衡阳 26.89 112.57|张家界 29.12 110.48|南昌 28.68 115.86|赣州 25.83 114.93|九江 29.71 116.00|上饶 28.46 117.94|景德镇 29.27 117.18|" +
   "福州 26.07 119.30|厦门 24.48 118.09|泉州 24.87 118.67|漳州 24.51 117.65|莆田 25.45 119.01|龙岩 25.08 117.02|郑州 34.75 113.62|洛阳 34.62 112.45|开封 34.80 114.31|南阳 33.00 112.53|新乡 35.30 113.93|许昌 34.04 113.85|" +
   "石家庄 38.04 114.51|保定 38.87 115.47|唐山 39.63 118.18|秦皇岛 39.94 119.60|廊坊 39.54 116.68|邯郸 36.63 114.54|张家口 40.77 114.89|太原 37.87 112.55|大同 40.08 113.30|运城 35.03 111.01|" +
   "成都 30.57 104.07|绵阳 31.47 104.68|德阳 31.13 104.40|乐山 29.55 103.77|宜宾 28.75 104.64|南充 30.84 106.11|西安 34.34 108.94|咸阳 34.33 108.71|宝鸡 34.36 107.24|延安 36.59 109.49|榆林 38.28 109.73|" +
   "沈阳 41.80 123.43|大连 38.91 121.61|鞍山 41.11 122.99|锦州 41.10 121.13|丹东 40.00 124.35|长春 43.82 125.32|吉林 43.84 126.55|延吉 42.89 129.51|哈尔滨 45.80 126.53|齐齐哈尔 47.35 123.92|牡丹江 44.55 129.63|大庆 46.59 125.10|" +
   "昆明 24.88 102.83|大理 25.59 100.23|丽江 26.86 100.23|曲靖 25.49 103.80|景洪 22.00 100.80|贵阳 26.65 106.63|遵义 27.73 106.93|安顺 26.25 105.95|南宁 22.82 108.37|桂林 25.27 110.29|柳州 24.33 109.42|北海 21.48 109.12|海口 20.04 110.20|三亚 18.25 109.51|" +
   "呼和浩特 40.84 111.75|包头 40.66 109.84|鄂尔多斯 39.61 109.78|赤峰 42.26 118.89|兰州 36.06 103.83|天水 34.58 105.73|敦煌 40.14 94.66|酒泉 39.73 98.49|西宁 36.62 101.78|银川 38.49 106.23|乌鲁木齐 43.83 87.62|克拉玛依 45.58 84.89|喀什 39.47 75.99|伊宁 43.91 81.28|拉萨 29.65 91.14|林芝 29.65 94.36|日喀则 29.27 88.88|香港 22.32 114.17|澳门 22.20 113.55|台北 25.03 121.56")
    .split("|").map(line => { const [city, lat, lng] = line.split(" "); return [city, [Number(lat), Number(lng)]]; })
);
const textFields = { title: 100, project: 80, purpose: 240, hotel: 180, places: 500, diary: 3000, reflection: 1600, note: 1600 };
const emptyState = () => ({ trips: [], coordinates: {} });
const datePattern = /^(?:19\d{2}|20\d{2}|2100)-\d{2}-\d{2}$/;
const dayMs = 86400000;
const displayNumber = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 });
const displayMoney = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" });
let state = emptyState();
let ready = false;
let editing = null;
let photoDraft = [];
let photoBusy = false;
let saving = false;
let importBusy = false;
let selectedTrip = null;
let map, lines, markers;
let playback = null;
let mapNotice = "";

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(text, action, className) {
  const node = el("button", text, className);
  node.type = "button";
  node.addEventListener("click", action);
  return node;
}

function feedback(id, message, error = false) {
  $(id).textContent = message;
  $(id).classList.toggle("error", error);
}

function checkedText(value, limit, required = false) {
  if (typeof value !== "string" || value.length > limit || (required && !value.trim())) throw Error("字段缺失或超长");
  return value.trim();
}

function cityName(value) {
  return checkedText(value, 30, true).replace(/(.{2,})市$/, "$1");
}

function isDate(value) {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const time = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function tripData(raw) {
  if (!raw || !isDate(raw.start) || !isDate(raw.end) || raw.end < raw.start) throw Error("请填写有效日期，返回日期不能早于出发日期");
  if (!statuses.includes(raw.status)) throw Error("出差状态无效");
  const origin = cityName(raw.origin);
  const destination = cityName(raw.destination);
  if (!Array.isArray(raw.via) || raw.via.length > 20 || !Array.isArray(raw.legs) || raw.legs.length > 30) throw Error("最多支持 20 个经过城市和 30 段交通");
  const legs = raw.legs.map((leg, index) => {
    const from = cityName(leg.from);
    const to = cityName(leg.to);
    if (!Object.hasOwn(modes, leg.mode)) throw Error("第 " + (index + 1) + " 段的交通方式无效");
    if (leg.date && (!isDate(leg.date) || leg.date < raw.start || leg.date > raw.end)) throw Error("第 " + (index + 1) + " 段的日期应在出差日期内");
    if (![leg.km, leg.cost].every(value => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000000))) throw Error("交通费用或里程超出范围");
    return { from, to, mode: leg.mode, date: leg.date || "", cost: leg.cost, km: leg.km, fromStation: checkedText(leg.fromStation, 80), toStation: checkedText(leg.toStation, 80) };
  });
  const legDates = legs.map(leg => leg.date).filter(Boolean);
  if (legDates.some((date, i) => i && date < legDates[i - 1])) throw Error("请按交通日期顺序排列行程段");
  if (!Array.isArray(raw.photos) || raw.photos.length > 6 || raw.photos.some(photo => typeof photo !== "string" || photo.length > 1300000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))) throw Error("照片数据格式无效");
  const text = Object.fromEntries(Object.entries(textFields).map(([key, limit]) => [key, checkedText(raw[key], limit, key === "title")]));
  return { id: checkedText(raw.id, 80, true), ...text, start: raw.start, end: raw.end, origin, destination, via: raw.via.map(cityName), status: raw.status, legs, photos: raw.photos };
}

function visited(trip) {
  return [...new Set([...trip.via, trip.destination, ...trip.legs.flatMap(leg => [leg.from, leg.to])])].filter(city => city !== trip.origin || city === trip.destination);
}

function allLegs(trip) {
  if (trip.legs.length) return trip.legs;
  const cities = [trip.origin, ...trip.via, trip.destination];
  return cities.slice(1).flatMap((to, i) => cities[i] === to ? [] : [{ from: cities[i], to, mode: "其他", date: "", km: null, fallback: true }]);
}

function coordinates(city) {
  return Object.hasOwn(state.coordinates, city) ? state.coordinates[city] : Object.hasOwn(cityCenters, city) ? cityCenters[city] : null;
}

function legDistance(leg) {
  if (leg.km !== null) return leg.km;
  const a = coordinates(leg.from), b = coordinates(leg.to);
  if (!a || !b || leg.from === leg.to) return null;
  const rad = value => value * Math.PI / 180;
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
}

function dateString(time) { return new Date(time).toISOString().slice(0, 10); }

function dateRanges(start, end, filters) {
  const a = filters.start && filters.start > start ? filters.start : start;
  const b = filters.end && filters.end < end ? filters.end : end;
  if (a > b) return [];
  if (!filters.year && !filters.month) return [[a, b]];
  const result = [];
  for (let year = Number(a.slice(0, 4)); year <= Number(b.slice(0, 4)); year++) {
    if (filters.year && Number(filters.year) !== year) continue;
    const first = filters.month ? year + "-" + filters.month + "-01" : year + "-01-01";
    const last = filters.month ? dateString(Date.UTC(year, Number(filters.month), 0)) : year + "-12-31";
    if (first <= b && last >= a) result.push([first > a ? first : a, last < b ? last : b]);
  }
  return result;
}

function daysIn(ranges) {
  const sorted = ranges.map(([start, end]) => [Date.parse(start), Date.parse(end)]).sort((a, b) => a[0] - b[0]);
  let total = 0, previousEnd = -Infinity;
  for (const [start, end] of sorted) {
    if (end > previousEnd) total += (end - Math.max(start, previousEnd + dayMs)) / dayMs + 1;
    previousEnd = Math.max(previousEnd, end);
  }
  return total;
}

function stays(trip) {
  const cities = visited(trip);
  const dated = trip.legs.length && trip.legs.every(leg => leg.date);
  if (!dated) return cities.length === 1 ? [[cities[0], trip.start, trip.end]] : [];
  return trip.legs.flatMap((leg, i) => {
    const next = trip.legs[i + 1];
    const end = next ? dateString(Date.parse(next.date) - dayMs) : trip.end;
    return cities.includes(leg.to) && end >= leg.date ? [[leg.to, leg.date, end]] : [];
  });
}

function analysis(filters) {
  const trips = [], legs = [], ranges = [], cities = new Map();
  for (const trip of state.trips) {
    if ((filters.project && trip.project !== filters.project) || (filters.city && !visited(trip).includes(filters.city))) continue;
    const windows = dateRanges(trip.start, trip.end, filters);
    if (!windows.length) continue;
    trips.push(trip);
    ranges.push(...windows);
    for (const city of visited(trip)) {
      if (!cities.has(city)) cities.set(city, { trips: [], ranges: [] });
      cities.get(city).trips.push(trip);
    }
    for (const [city, start, end] of stays(trip)) cities.get(city).ranges.push(...dateRanges(start, end, filters));
    allLegs(trip).forEach((leg, index) => {
      if (!leg.date || dateRanges(leg.date, leg.date, filters).length) legs.push({ trip, leg, index });
    });
  }
  trips.sort((a, b) => b.start.localeCompare(a.start) || a.title.localeCompare(b.title, "zh-CN"));
  return { trips, legs, cities, days: daysIn(ranges) };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("urdesk-travel-footprints", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("data");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onblocked = () => reject(Error("数据库升级受阻"));
  });
}

let db;
function database(update) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("data", update ? "readwrite" : "readonly");
    const store = transaction.objectStore("data");
    const request = store.get("workspace");
    let result, failure;
    request.onsuccess = () => {
      try {
        const current = request.result ?? emptyState();
        result = update ? update(current) : current;
        if (update) store.put(result, "workspace");
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(failure ?? transaction.error ?? Error("存储失败"));
    transaction.onerror = () => reject(transaction.error ?? Error("存储失败"));
  });
}

const bus = typeof BroadcastChannel === "function" ? new BroadcastChannel("urdesk-travel-changes") : null;
if (bus) bus.onmessage = async () => {
  if (!db) return;
  try { state = await database(); render(); }
  catch { feedback("importMessage", "读取更新失败，请刷新页面。", true); }
};

async function save(update) {
  if (!ready) throw Error("本地存储不可用");
  state = await database(update);
  bus?.postMessage("updated");
  render();
}

function options(id, values, label) {
  const select = $(id);
  const previous = select.value;
  select.replaceChildren(new Option(label, ""), ...values.map(([value, name]) => new Option(name, value)));
  select.value = values.some(([value]) => value === previous) ? previous : "";
}

const sortCities = values => [...new Set(values)].sort((a, b) => a.localeCompare(b, "zh-CN"));
const cityChoices = values => sortCities(values).map(city => [city, city]);

function filterValues() {
  const filters = { year: $("year").value, month: $("month").value, project: $("project").value, city: $("cityFilter").value, start: $("filterStart").value, end: $("filterEnd").value };
  const invalid = (filters.start && !isDate(filters.start)) || (filters.end && !isDate(filters.end)) ||
    (filters.start && filters.end && filters.start > filters.end);
  feedback("filterMessage", invalid ? "请填写有效的筛选日期，结束日期不能早于开始日期。" : "", !!invalid);
  return invalid ? null : filters;
}

function render() {
  const years = new Set();
  for (const trip of state.trips) for (let y = +trip.start.slice(0, 4); y <= +trip.end.slice(0, 4); y++) years.add(y);
  options("year", [...years].sort((a, b) => b - a).map(y => [String(y), y + " 年"]), "全部年度");
  options("project", cityChoices(state.trips.map(trip => trip.project).filter(Boolean)), "全部项目");
  options("cityFilter", cityChoices(state.trips.flatMap(visited)), "全部城市");
  $("cityOptions").replaceChildren(...sortCities([...Object.keys(cityCenters), ...Object.keys(state.coordinates), ...state.trips.flatMap(trip => [trip.origin, ...visited(trip)])]).map(city => new Option(city)));
  const filters = filterValues();
  view = filters ? analysis(filters) : { trips: [], legs: [], cities: new Map(), days: 0 };
  if (!view.trips.some(trip => trip.id === selectedTrip)) selectedTrip = null;
  const distances = view.legs.map(({ leg }) => legDistance(leg));
  const known = distances.filter(value => value !== null);
  const estimate = view.legs.some(({ leg }, i) => leg.km === null && distances[i] !== null);
  $("tripCount").textContent = view.trips.length;
  $("dayCount").textContent = view.days;
  $("cityCount").textContent = view.cities.size;
  $("distanceCount").textContent = view.legs.length && !known.length ? "—" : (estimate ? "约 " : "") + displayNumber.format(known.reduce((a, b) => a + b, 0));
  $("distanceNote").textContent = "公里" + (known.length < distances.length ? " · " + (distances.length - known.length) + " 段待补" : "");
  options("locateCity", cityChoices([...view.cities.keys()].filter(coordinates)), "定位已到访城市");
  renderTimeline();
  renderInsights();
  stopPlayback();
  drawMap();
}
let view = { trips: [], legs: [], cities: new Map(), days: 0 };

function renderTimeline() {
  const list = $("timeline");
  list.replaceChildren();
  if (!view.trips.length) list.append(el("p", state.trips.length ? "没有符合筛选条件的行程。" : "暂无差旅记录。添加第一段出差后，地图和时间轴会同步更新。", "empty"));
  let lastMonth = "";
  for (const trip of view.trips) {
    if (lastMonth !== trip.start.slice(0, 7)) {
      lastMonth = trip.start.slice(0, 7);
      const label = el("p", lastMonth.slice(0, 4) + " 年 " + Number(lastMonth.slice(5)) + " 月", "kicker");
      label.style.margin = "14px 0 7px";
      list.append(label);
    }
    const article = el("article", undefined, "trip");
    const title = el("h3", trip.title);
    title.append(el("span", trip.status, "pill"));
    const actions = el("div", undefined, "actions");
    actions.append(button("查看详情", () => showDetails(trip.title, [trip])),
      button("地图路线", () => showRoute(trip)), button("编辑", () => openEditor(trip)),
      button("删除", () => removeTrip(trip), "danger"));
    article.append(title, el("p", trip.start + " 至 " + trip.end + (trip.project ? " · " + trip.project : ""), "muted"),
      el("p", routeSummary(trip)), actions);
    list.append(article);
  }
}

function routeSummary(trip) {
  const legs = allLegs(trip);
  if (!legs.length) return trip.origin;
  return legs.reduce((route, leg, i) => route + (i && legs[i - 1].to !== leg.from ? " / " + leg.from : "") + " → " + leg.to, legs[0].from);
}

function renderInsights() {
  const transport = $("modeStats");
  transport.replaceChildren();
  const recorded = view.legs.filter(({ leg }) => !leg.fallback);
  if (!recorded.length) transport.append(el("p", "暂无已填写交通方式的行程段。", "empty"));
  for (const mode of Object.keys(modes)) {
    const count = recorded.filter(({ leg }) => leg.mode === mode).length;
    if (!count) continue;
    const row = el("div", undefined, "mode");
    const label = el("div");
    label.append(el("span", mode), el("strong", count + " 段"));
    const bar = el("progress");
    bar.max = recorded.length;
    bar.value = count;
    bar.setAttribute("aria-label", mode + " " + count + " 段");
    row.append(label, bar);
    transport.append(row);
  }
  const cities = $("cityStats");
  cities.replaceChildren();
  if (!view.cities.size) cities.append(el("p", "暂无到访城市。", "empty"));
  for (const [city, info] of [...view.cities].sort((a, b) => b[1].trips.length - a[1].trips.length || a[0].localeCompare(b[0], "zh-CN"))) {
    const row = el("div", undefined, "cityItem");
    const days = daysIn(info.ranges);
    row.append(button(city, () => openCity(city)), el("span", info.trips.length + " 次 · " + (days ? days + " 天" : "停留未计")));
    if (!coordinates(city)) row.append(button("设置坐标", () => editCoordinates(city)));
    cities.append(row);
  }
}

function initializeMap() {
  if (!window.L) {
    mapNotice = "地图组件未加载。行程、城市统计及时间轴仍可使用。";
    $("resetMap").disabled = true;
    $("locateCity").disabled = true;
    return;
  }
  map = L.map("map", { scrollWheelZoom: false, minZoom: 3, maxZoom: 15, worldCopyJump: true });
  map.zoomControl.setPosition("bottomright");
  if (typeof travelBasemap === "undefined") {
    mapNotice = "底图暂未载入，已定位的城市和路线仍会显示。";
  } else {
    const pane = map.createPane("travel-basemap");
    pane.style.zIndex = "250";
    pane.style.pointerEvents = "none";
    for (const [focus, rings] of travelBasemap) {
      L.polygon(rings, {
        pane: "travel-basemap", interactive: false, weight: focus ? 1.2 : .7,
        color: focus ? "#759e98" : "#a8b9c2", fillColor: focus ? "#cde4dc" : "#edf0ef", fillOpacity: 1,
      }).addTo(map);
    }
    map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/downloads/10m-cultural-vectors/">Natural Earth</a> · 区域示意');
  }
  lines = L.layerGroup().addTo(map);
  markers = L.layerGroup().addTo(map);
  resetMapView();
}

function updateMapNotice() {
  const selected = state.trips.find(trip => trip.id === selectedTrip);
  const visibleLegs = selected ? allLegs(selected).map(leg => ({ leg })) : view.legs;
  const missing = new Set([...visibleLegs.flatMap(({ leg }) => [leg.from, leg.to]), ...(selected ? visited(selected) : view.cities.keys())].filter(city => !coordinates(city)));
  feedback("mapMessage", [mapNotice, selected ? "单次路线 · " + selected.title : "", missing.size ? "有 " + missing.size + " 座城市待设置坐标" : "", !view.trips.length && !mapNotice ? "添加行程后显示路线" : ""].filter(Boolean).join(" · "));
}

function path(leg) {
  const start = coordinates(leg.from), end = coordinates(leg.to);
  if (!start || !end || leg.from === leg.to) return;
  const [color, dashArray] = modes[leg.mode];
  const tooltip = el("span", leg.from + " → " + leg.to + " · " + (leg.fallback ? "方式未填写" : leg.mode));
  L.polyline([start, end], { color, dashArray, weight: 3, opacity: .85 }).bindTooltip(tooltip).addTo(lines);
}

function drawMap() {
  updateMapNotice();
  const selected = state.trips.find(trip => trip.id === selectedTrip);
  const visibleLegs = selected ? allLegs(selected).map((leg, index) => ({ trip: selected, leg, index })) : view.legs;
  $("playRoutes").disabled = !map || !visibleLegs.some(({ leg }) => coordinates(leg.from) && coordinates(leg.to) && leg.from !== leg.to);
  if (!map) return;
  lines.clearLayers();
  markers.clearLayers();
  visibleLegs.forEach(({ leg }) => path(leg));
  const cities = new Set(selected ? visited(selected) : view.cities.keys());
  visibleLegs.forEach(({ leg }) => { cities.add(leg.from); cities.add(leg.to); });
  for (const city of ["北京", "上海", "广州", "成都", "西安", "武汉", "哈尔滨", "乌鲁木齐", "拉萨", "昆明", "海口", "台北"]) {
    if (cities.has(city)) continue;
    L.tooltip({ className: "referenceCity", direction: "top", interactive: false, permanent: true })
      .setLatLng(cityCenters[city]).setContent(el("span", city)).addTo(markers);
  }
  for (const city of cities) {
    const location = coordinates(city);
    if (!location) continue;
    const info = view.cities.get(city);
    const count = info?.trips.length ?? 0;
    const stay = info ? daysIn(info.ranges) : 0;
    const marker = L.circleMarker(location, { radius: 5 + Math.min(11, 2 * count), color: "#fff", weight: 2, fillColor: count ? "#087c71" : "#667e91", fillOpacity: .88 });
    marker.bindTooltip(el("span", city + " · " + count + " 次 · " + (stay ? stay + " 天" : "停留未计")), { className: "cityTag" });
    marker.on("click", () => openCity(city));
    marker.addTo(markers);
  }
}

function resetMapView() {
  map?.fitBounds([[18, 75], [53.5, 135]], { padding: [12, 12], maxZoom: 5 });
}

function showRoute(trip) {
  selectedTrip = trip.id;
  stopPlayback();
  drawMap();
  if (map) {
    const cities = [...new Set([trip.origin, ...visited(trip), ...allLegs(trip).flatMap(leg => [leg.from, leg.to])])];
    const points = cities.map(coordinates).filter(Boolean);
    if (points.length === 1) map.setView(points[0], 8);
    else if (points.length > 1) map.fitBounds(points, { padding: [42, 42], maxZoom: 9 });
  }
  $("mapTitle").scrollIntoView({ block: "start" });
}

function stopPlayback() {
  if (playback !== null) clearTimeout(playback);
  playback = null;
  $("playRoutes").textContent = "▷ 播放轨迹";
}

function playRoutes() {
  if (playback !== null) { stopPlayback(); drawMap(); return; }
  const selected = state.trips.find(trip => trip.id === selectedTrip);
  const legs = (selected ? allLegs(selected).map((leg, index) => ({ leg, trip: selected, index })) : [...view.legs])
    .filter(({ leg }) => coordinates(leg.from) && coordinates(leg.to) && leg.from !== leg.to)
    .sort((a, b) => (a.leg.date || a.trip.start).localeCompare(b.leg.date || b.trip.start) ||
      a.trip.start.localeCompare(b.trip.start) || a.trip.id.localeCompare(b.trip.id) || a.index - b.index);
  if (!map || !legs.length) return;
  lines.clearLayers();
  if (!selected) resetMapView();
  $("playRoutes").textContent = "■ 停止播放";
  let index = 0;
  const step = () => {
    const { leg, trip } = legs[index++];
    path(leg);
    feedback("mapMessage", index + " / " + legs.length + " · " + (leg.date || trip.start) + " · " + leg.from + " → " + leg.to);
    playback = setTimeout(index < legs.length ? step : () => { stopPlayback(); drawMap(); }, 700);
  };
  step();
}

function showDetails(title, trips) {
  $("detailsTitle").textContent = title;
  const body = $("detailsBody");
  body.replaceChildren();
  if (!trips.length) body.append(el("p", "此城市在当前视图中仅作为出发或返回地点。", "muted"));
  for (const trip of trips) {
    const article = el("article", undefined, "detailTrip");
    article.append(el("h3", trip.title), el("p", trip.start + " 至 " + trip.end + " · " + trip.status, "muted"), el("p", routeSummary(trip)));
    const labels = { project: "项目", purpose: "事由", hotel: "酒店", places: "美食及景点", diary: "日记", reflection: "感悟", note: "备注" };
    for (const [key, label] of Object.entries(labels)) if (trip[key]) article.append(el("p", label + " · " + trip[key]));
    const legs = allLegs(trip);
    if (legs.length) {
      const list = el("ol");
      for (const leg of legs) {
        const km = legDistance(leg);
        const description = [leg.date, leg.fallback ? "方式未填写" : leg.mode,
          leg.from + (leg.fromStation ? " · " + leg.fromStation : "") + " → " + leg.to + (leg.toStation ? " · " + leg.toStation : ""),
          km === null ? "里程待补" : (leg.km === null ? "约 " : "") + displayNumber.format(km) + " 公里",
          leg.cost != null ? displayMoney.format(leg.cost) : ""].filter(Boolean).join(" / ");
        list.append(el("li", description));
      }
      article.append(list);
    }
    if (trip.photos.length) {
      const photos = el("div", undefined, "photos");
      trip.photos.forEach((photo, index) => {
        const figure = el("figure");
        const img = el("img");
        img.src = photo;
        img.alt = "城市照片 " + (index + 1);
        img.loading = "lazy";
        figure.append(img);
        photos.append(figure);
      });
      article.append(photos);
    }
    article.append(button("在地图上查看", () => {
      $("details").close();
      showRoute(trip);
    }));
    body.append(article);
  }
  $("details").showModal();
}

function openCity(city) {
  const trips = state.trips.filter(trip => visited(trip).includes(city)).sort((a, b) => b.start.localeCompare(a.start));
  showDetails(city + " · 全部到访记录", trips);
}

function editCoordinates(city = "") {
  $("coordinateForm").reset();
  const fields = $("coordinateForm").elements;
  fields.city.value = city;
  const position = coordinates(city);
  if (position) [fields.lat.value, fields.lng.value] = position;
  feedback("coordinateMessage", "");
  $("coordinateDialog").showModal();
}

const legFields = [
  ["from", "出发城市", "text"], ["to", "到达城市", "text"], ["mode", "交通方式", "select"],
  ["fromStation", "出发站点", "text"], ["toStation", "到达站点", "text"], ["date", "交通日期", "date"],
  ["cost", "交通费用（元）", "number"], ["km", "里程（公里）", "number"],
];

function addLeg(data = {}) {
  const list = $("legs");
  if (list.children.length >= 30) { feedback("formMessage", "最多添加 30 段交通。", true); return; }
  const row = el("fieldset", undefined, "leg");
  row.append(el("legend", "交通段"));
  const fields = el("div", undefined, "formGrid");
  for (const [key, label, type] of legFields) {
    const wrap = el("label", label);
    const input = el(type === "select" ? "select" : "input");
    input.dataset.legField = key;
    if (type === "select") input.append(...Object.keys(modes).map(mode => new Option(mode)));
    else input.type = type;
    if (key === "from" || key === "to") {
      input.setAttribute("list", "cityOptions");
      input.required = true;
      input.maxLength = 30;
    } else if (type === "text") input.maxLength = 80;
    if (type === "number") {
      input.min = "0"; input.max = "1000000"; input.step = ".01";
      if (key === "km") input.placeholder = "自动估算";
    }
    if (data[key] != null) input.value = data[key];
    wrap.append(input);
    fields.append(wrap);
  }
  row.append(fields, button("移除此段", () => row.remove()));
  list.append(row);
}

const form = $("tripForm");
const fields = form.elements;
function viaList() { return fields.via.value.split(/[、,，;；\n]+/).map(city => city.trim()).filter(Boolean); }

function getLegs() {
  return [...$("legs").children].map(row => Object.fromEntries([...row.querySelectorAll("[data-leg-field]")].map(input => [
    input.dataset.legField, input.type === "number" ? (input.value === "" ? null : input.valueAsNumber) : input.value,
  ])));
}

function openEditor(trip) {
  if (!ready || saving || photoBusy) return;
  editing = trip ?? null;
  form.reset();
  $("legs").replaceChildren();
  photoDraft = trip ? [...trip.photos] : [];
  if (trip) {
    for (const name of [...Object.keys(textFields), "start", "end", "origin", "destination", "status"]) fields[name].value = trip[name];
    fields.via.value = trip.via.join("、");
    trip.legs.forEach(addLeg);
  } else {
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    fields.start.value = fields.end.value = today;
  }
  $("editorTitle").textContent = trip ? "编辑出差" : "新增出差";
  feedback("formMessage", "");
  renderPhotos();
  $("editor").showModal();
}

function renderPhotos() {
  const container = $("photoDraft");
  container.replaceChildren();
  photoDraft.forEach((photo, index) => {
    const figure = el("figure"), img = el("img");
    img.src = photo;
    img.alt = "城市照片 " + (index + 1);
    figure.append(img, button("移除照片 " + (index + 1), () => {
      photoDraft.splice(index, 1);
      renderPhotos();
    }));
    container.append(figure);
  });
}

async function compressPhoto(file) {
  if (file.size > 18 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw Error("请选择 18 MB 以内的 JPG、PNG 或 WebP 照片");
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1100 / Math.max(bitmap.width, bitmap.height));
    const canvas = el("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", .78);
  } finally { bitmap.close(); }
}

async function readPhotos(event) {
  const files = [...event.target.files];
  event.target.value = "";
  if (!files.length || photoBusy || saving) return;
  if (files.length + photoDraft.length > 6) { feedback("formMessage", "每次出差最多保留 6 张照片。", true); return; }
  photoBusy = true;
  $("tripPhotos").disabled = $("saveTrip").disabled = true;
  feedback("formMessage", "正在压缩照片…");
  try {
    const photos = [];
    for (const file of files) photos.push(await compressPhoto(file));
    photoDraft.push(...photos);
    renderPhotos();
    feedback("formMessage", "已添加 " + photos.length + " 张照片。");
  } catch (error) { feedback("formMessage", "照片读取失败。请确认格式和文件大小。", true); }
  finally {
    photoBusy = false;
    $("tripPhotos").disabled = $("saveTrip").disabled = false;
  }
}

async function saveTrip(event) {
  event.preventDefault();
  if (photoBusy || saving) return;
  const raw = Object.fromEntries(new FormData(form));
  saving = true;
  $("saveTrip").disabled = true;
  try {
    const trip = tripData({ ...raw, id: editing?.id ?? crypto.randomUUID(), via: viaList(), legs: getLegs(), photos: photoDraft });
    const original = editing;
    await save(current => {
      const index = current.trips.findIndex(item => item.id === trip.id);
      if (original && (index < 0 || JSON.stringify(current.trips[index]) !== JSON.stringify(original))) throw Error("此行程已在其他页面更新，请关闭后重新打开编辑");
      if (index < 0) current.trips.push(trip);
      else current.trips[index] = trip;
      return current;
    });
    $("editor").close();
  } catch (error) { feedback("formMessage", error.message || "保存失败，请检查浏览器存储。", true); }
  finally { saving = false; $("saveTrip").disabled = false; }
}

async function removeTrip(trip) {
  if (!ready || !confirm("删除「" + trip.title + "」及其照片？")) return;
  try {
    await save(current => {
      const record = current.trips.find(item => item.id === trip.id);
      if (record && JSON.stringify(record) !== JSON.stringify(trip)) throw Error("此行程刚刚更新，请核对后再删除");
      current.trips = current.trips.filter(item => item.id !== trip.id);
      return current;
    });
    feedback("importMessage", "已删除行程。");
  } catch (error) { feedback("importMessage", error.message || "删除失败。", true); }
}

function checkedCoordinates(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).length > 1500) throw Error("城市坐标格式无效");
  return Object.fromEntries(Object.entries(raw).map(([key, point]) => {
    if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite) || Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180) throw Error("城市坐标超出范围");
    return [cityName(key), point];
  }));
}

function parseBackup(raw) {
  const items = Array.isArray(raw) ? raw : raw?.format === "urdesk-travel" && raw.version === 1 ? raw.trips : null;
  if (!Array.isArray(items) || items.length > 5000) throw Error("请选择差旅足迹的 JSON 备份或行程数组");
  const trips = items.map(item => {
    const defaults = Object.fromEntries(Object.keys(textFields).map(key => [key, ""]));
    if (!item || typeof item !== "object" || Array.isArray(item)) throw Error("行程格式无效");
    const trip = { ...defaults, via: [], legs: [], photos: [], status: "已完成", ...item };
    if (!trip.id) trip.id = crypto.randomUUID();
    if (Array.isArray(trip.legs)) trip.legs = trip.legs.map(leg => ({ date: "", cost: null, km: null, fromStation: "", toStation: "", ...leg }));
    return tripData(trip);
  });
  return { trips, history: Array.isArray(raw), coordinates: checkedCoordinates(Array.isArray(raw) ? {} : raw.coordinates ?? {}) };
}

async function importTrips(event) {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file || !ready || importBusy) return;
  importBusy = true;
  event.target.disabled = true;
  try {
    if (file.size > 80 * 1024 * 1024) throw Error("单个备份最多支持 80 MB");
    const incoming = parseBackup(JSON.parse(await file.text()));
    let added = 0;
    await save(current => {
      const ids = new Set(current.trips.map(trip => trip.id));
      const signatures = new Set(current.trips.map(trip => JSON.stringify([trip.title, trip.start, trip.end, trip.origin, trip.destination])));
      for (const trip of incoming.trips) {
        const signature = JSON.stringify([trip.title, trip.start, trip.end, trip.origin, trip.destination]);
        if (ids.has(trip.id) || (incoming.history && signatures.has(signature))) continue;
        ids.add(trip.id);
        signatures.add(signature);
        current.trips.push(trip);
        added++;
      }
      current.coordinates = { ...incoming.coordinates, ...current.coordinates };
      return current;
    });
    feedback("importMessage", "已导入 " + added + " 条，跳过 " + (incoming.trips.length - added) + " 条重复行程。");
  } catch (error) { feedback("importMessage", "导入失败 · " + error.message, true); }
  finally { importBusy = false; event.target.disabled = false; }
}

async function exportTrips() {
  try {
    const data = await database();
    const blob = new Blob([JSON.stringify({ format: "urdesk-travel", version: 1, ...data })], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = el("a");
    link.href = url;
    link.download = "差旅足迹备份-" + dateString(Date.now()) + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch { feedback("importMessage", "导出失败，请检查浏览器存储。", true); }
}

$("newTrip").onclick = () => openEditor();
$("closeDetails").onclick = () => $("details").close();
$("closeCoordinates").onclick = () => $("coordinateDialog").close();
$("setCoordinates").onclick = () => editCoordinates();
$("coordinateForm").addEventListener("submit", async event => {
  event.preventDefault();
  const fields = event.currentTarget.elements;
  const submit = event.submitter;
  submit.disabled = true;
  try {
    const name = cityName(fields.city.value);
    const point = [fields.lat.valueAsNumber, fields.lng.valueAsNumber];
    checkedCoordinates({ [name]: point });
    await save(current => ({ ...current, coordinates: { ...current.coordinates, [name]: point } }));
    $("coordinateDialog").close();
  } catch (error) { feedback("coordinateMessage", error.message, true); }
  finally { submit.disabled = false; }
});
for (const button of $("editor").querySelectorAll("[data-close]")) button.onclick = () => {
  if (!saving && !photoBusy) $("editor").close();
};
$("editor").addEventListener("cancel", event => { if (saving || photoBusy) event.preventDefault(); });
$("editor").addEventListener("close", () => { photoDraft = []; $("photoDraft").replaceChildren(); });
$("tripPhotos").addEventListener("change", readPhotos);
form.addEventListener("submit", saveTrip);
$("addLeg").onclick = () => {
  const legs = getLegs();
  addLeg({ from: legs.at(-1)?.to || fields.origin.value, to: legs.length ? "" : fields.destination.value });
};
$("generateLegs").onclick = () => {
  try {
    const via = viaList();
    if (via.length > 20) throw Error("最多填写 20 个经过城市");
    const cities = [fields.origin.value, ...via, fields.destination.value].map(cityName);
    if (cities.length < 2 || cities.every(city => city === cities[0])) throw Error("至少填写两个不同的城市");
    if ($("legs").children.length && !confirm("重新生成交通段会替换已填交通信息，继续吗？")) return;
    $("legs").replaceChildren();
    cities.slice(1).forEach((to, index) => { if (cities[index] !== to) addLeg({ from: cities[index], to }); });
    feedback("formMessage", "已生成去程，可继续添加返程并补充交通日期。");
  } catch (error) { feedback("formMessage", "请核对城市 · " + error.message, true); }
};

options("month", Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, "0"), (i + 1) + " 月"]), "全部月份");
const filterIds = ["year", "month", "project", "cityFilter", "filterStart", "filterEnd"];
for (const id of filterIds) $(id).addEventListener("change", render);
$("clearFilters").onclick = () => { for (const id of filterIds) $(id).value = ""; render(); };
$("resetMap").onclick = () => { selectedTrip = null; stopPlayback(); resetMapView(); drawMap(); };
$("playRoutes").onclick = playRoutes;
$("locateCity").addEventListener("change", event => {
  const point = coordinates(event.target.value);
  if (map && point) {
    if (selectedTrip) { selectedTrip = null; stopPlayback(); drawMap(); }
    map.setView(point, 8);
  }
});
for (const [mode, [color, dash]] of Object.entries(modes)) {
  const key = el("span"), line = el("i");
  line.style.borderColor = color;
  if (dash) line.style.borderTopStyle = mode === "其他" || mode === "飞机" ? "dotted" : "dashed";
  key.append(line, el("span", mode));
  $("legend").append(key);
}
$("importTrips").addEventListener("change", importTrips);
$("exportTrips").onclick = exportTrips;
for (const id of ["newTrip", "importTrips", "exportTrips", "setCoordinates"]) $(id).disabled = true;
try { initializeMap(); }
catch { map = null; mapNotice = "地图加载失败，行程和统计仍可使用。"; }
render();
(async () => {
  try {
    db = await openDatabase();
    state = await database();
    ready = true;
    for (const id of ["newTrip", "importTrips", "exportTrips", "setCoordinates"]) $(id).disabled = false;
    render();
  } catch { feedback("importMessage", "浏览器存储不可用。请检查隐私模式或存储设置。", true); }
})();
