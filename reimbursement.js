"use strict";

const categories = ["打车", "其他交通", "餐饮", "住宿", "办公用品", "其他"];
const states = ["待报销", "已提交", "已报销"];
const storageKey = "urdesk.reimbursements.v1";
const invoiceNumber = /^(?:\d{8}|\d{20})$/;
const money = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" });
const startLabel = "(?:出发地(?:点)?|起点|始发地|上车(?:地[点址]|位置)|起始(?:地[点址]|位置))";
const endLabel = "(?:终点|目的地|到达(?:地[点址]|地)|下车(?:地[点址]|位置)|结束(?:地[点址]|位置))";
const routeLabel = new RegExp(startLabel + "|" + endLabel);

function amountInCents(value) {
  const cleaned = value.normalize("NFKC").trim().replace(/^[¥￥]\s*/, "");
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.replaceAll(",", "").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 9999999999 ? cents : null;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function normalizeText(raw) {
  return raw.normalize("NFKC").replace(/\r\n?/g, "\n")
    .replaceAll("⻋", "车").replaceAll("⻔", "门").replaceAll("⻓", "长")
    .replace(/(?<=[\u3400-\u9fff]) +(?=[\u3400-\u9fff])/g, "")
    .trim();
}

function readRoute(text) {
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  const stops = [new Set(), new Set()];
  for (const [index, line] of lines.entries()) {
    const labels = [...line.matchAll(new RegExp(routeLabel.source, "g"))];
    const values = labels.map((label, i) => {
      const tail = line.slice(label.index + label[0].length, labels[i + 1]?.index);
      return tail.trim().replace(/^[:：\s]+/, "").split(/(?:\t| {2,})|(?:车型|里程|金额|用车时间|上车时间|下车时间)\s*[:：]/)[0].trim();
    });

    // PDF text often has both headers on one row and their values directly below.
    if (labels.length === 2 && !values.some(Boolean)) {
      const next = lines[index + 1] ?? "";
      if (!routeLabel.test(next)) {
        const columns = next.split(/\t+| {2,}/).map(value => value.trim()).filter(Boolean);
        if (columns.length === 2) values.splice(0, 2, ...columns);
      }
    }
    if (labels.length === 1 && !values[0]) {
      const next = lines[index + 1] ?? "";
      if (!routeLabel.test(next) && !/[:：]|\t| {2,}/.test(next)) values[0] = next;
    }
    labels.forEach((label, i) => {
      const place = values[i]?.replace(/[;,，；|]+$/, "").trim();
      if (!place || place.length > 150 || !/[\p{L}]/u.test(place) ||
          /^(?:未提供|暂无|未知|无|请选择|日期|时间|金额|行程|订单|备注|合计|打车费|不详)/.test(place)) return;
      const side = new RegExp("^" + startLabel + "$").test(label[0]) ? 0 : 1;
      stops[side].add(place);
    });
  }
  if (stops.some(set => set.size > 1)) return { start: "", end: "", multipleRoutes: true };
  return { start: [...stops[0]][0] ?? "", end: [...stops[1]][0] ?? "", multipleRoutes: false };
}

function parseInvoice(raw) {
  const text = normalizeText(raw);
  const numbers = new Set();
  for (const match of text.matchAll(/发票号(?:码)?[ \t]*(?:[:：][ \t]*)?\n?[ \t]*([\d \t]{8,37})(?!\d)/g)) {
    const value = match[1].replace(/\s/g, "");
    if (invoiceNumber.test(value)) numbers.add(value);
  }
  const amounts = new Set();
  const totalLines = [...text.matchAll(/价税合计[^\n]*(?:\n[^\n]*)?/g)];
  const labeledMoney = /[¥￥]\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)(?![\d.,%])/g;
  for (const [line] of totalLines) {
    const total = line.split("\n")[0];
    const small = line.match(/小写\s*\)?[ \t:：]*(?:\n[ \t]*)?(?:[¥￥Y][ \t]*)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)(?![\d.,%])/);
    if (small) amounts.add(amountInCents(small[1]));
    else for (const match of total.matchAll(labeledMoney)) amounts.add(amountInCents(match[1]));
  }
  if (!amounts.size) {
    for (const match of text.matchAll(/(?:实收金额|实付金额|发票金额|应收金额|票价)[ \t:：]*(?:[¥￥][ \t]*)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)(?![\d.,%])/g)) {
      amounts.add(amountInCents(match[1]));
    }
  }
  amounts.delete(null);

  const route = readRoute(text);
  const category =
    /网约车|出租车|出租汽车|打车|滴滴出行|滴滴科技|高德打车|曹操出行|T3出行/i.test(text) ? "打车" :
    /(?:旅客运输|运输服务)\s*\*?\s*(?:客运服务|客运费)|高铁|铁路电子客票|航班|航空运输|机票|客运站|通行费|停车费|加油/.test(text) ? "其他交通" :
    /餐饮|餐费|餐厅|饮食服务/.test(text) ? "餐饮" :
    /住宿|房费|宾馆|酒店客房/.test(text) ? "住宿" :
    /办公用品|办公设备|办公文具|文具用品/.test(text) ? "办公用品" : "";
  const dateParts = text.match(/开票日期\s*[:：]?\s*(\d{4})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})/);
  const date = dateParts ? dateParts.slice(1).map(part => part.padStart(2, "0")).join("-") : "";
  return {
    number: numbers.size === 1 ? [...numbers][0] : "",
    multipleInvoices: numbers.size > 1,
    amount: amounts.size === 1 ? ([...amounts][0] / 100).toFixed(2) : "",
    category,
    date: validDate(date) ? date : "",
    ...route,
  };
}

const $ = id => document.getElementById(id);
const form = $("invoiceForm");
const fields = form.elements;
let editId = null;
let busy = false;

function setStatus(id, message, error = false) {
  const element = $(id);
  element.textContent = message;
  element.classList.toggle("error", error);
}

function updateRoute() {
  const taxi = fields.category.value === "打车";
  $("routeFields").hidden = $("itineraryPicker").hidden = !taxi;
}

function resetEditor() {
  form.reset();
  editId = null;
  $("editorTitle").textContent = "登记发票";
  $("saveInvoice").textContent = "保存发票";
  $("recognizedDetails").hidden = true;
  $("recognizedDetails").open = false;
  $("recognizedText").textContent = "";
  setStatus("recognitionStatus", "也可以直接手动填写。");
  setStatus("formStatus", "");
  updateRoute();
}

function readRecords() {
  const raw = localStorage.getItem(storageKey);
  const records = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(records) || records.some(record =>
    !record || typeof record.id !== "string" || !invoiceNumber.test(record.number) ||
    !Number.isSafeInteger(record.amount) || record.amount <= 0 || record.amount > 9999999999 ||
    !categories.includes(record.category) || !states.includes(record.status) ||
    !["date", "note", "start", "end"].every(key => typeof record[key] === "string")
  )) throw new Error("invalid records");
  return records;
}

function renderRecords() {
  let records;
  try { records = readRecords(); }
  catch {
    setStatus("recordsStatus", "无法读取本机报销记录。", true);
    return;
  }
  const query = $("recordSearch").value.trim().toLowerCase();
  const status = $("statusFilter").value;
  $("totalCount").textContent = records.length + " 张";
  const paid = records.reduce((sum, record) => sum + (record.status === "已报销" ? record.amount : 0), 0);
  const total = records.reduce((sum, record) => sum + record.amount, 0);
  $("paidAmount").textContent = money.format(paid / 100);
  $("pendingAmount").textContent = money.format((total - paid) / 100);

  const matching = records.filter(record => (!status || status === record.status) &&
    (!query || [record.number, record.start, record.end].some(value => value.toLowerCase().includes(query))));
  const fragment = document.createDocumentFragment();
  for (const record of matching) {
    const row = document.createElement("tr");
    const route = record.start || record.end ? (record.start || "待核对") + " → " + (record.end || "待核对") : "—";
    const values = [record.number, record.date || "—", record.category, money.format(record.amount / 100),
      record.category === "打车" ? route : "—", record.status, record.note || "—"];
    values.forEach((value, i) => {
      const cell = row.insertCell();
      cell.textContent = value;
      if ([0, 3].includes(i)) cell.className = "number";
    });
    const cell = row.insertCell();
    const actions = document.createElement("div");
    actions.className = "row-actions";
    for (const [label, action] of [["编辑", () => editRecord(record)], ["删除", () => removeRecord(record)]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-label", label + "发票 " + record.number);
      if (label === "删除") button.className = "danger";
      button.onclick = action;
      actions.append(button);
    }
    cell.append(actions);
    fragment.append(row);
  }
  $("invoiceRows").replaceChildren(fragment);
  $("recordsTable").hidden = !matching.length;
  $("recordsEmpty").hidden = !!matching.length;
  $("recordsEmpty").textContent = records.length ? "没有符合筛选条件的记录。" : "暂无报销记录。";
}

function editRecord(record) {
  if (busy) return;
  resetEditor();
  editId = record.id;
  for (const key of ["number", "category", "date", "status", "note", "start", "end"]) fields[key].value = record[key];
  fields.amount.value = (record.amount / 100).toFixed(2);
  $("editorTitle").textContent = "编辑发票";
  $("saveInvoice").textContent = "保存修改";
  updateRoute();
  fields.number.focus();
}

function removeRecord(record) {
  if (busy || !confirm("删除发票 " + record.number + " 的报销记录？")) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(readRecords().filter(item => item.id !== record.id)));
    if (editId === record.id) resetEditor();
    renderRecords();
    dispatchEvent(new Event("reimbursement-records-changed"));
    setStatus("recordsStatus", "已删除发票记录。");
  } catch {
    setStatus("recordsStatus", "删除失败，请检查浏览器存储权限。", true);
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  if (busy) return;
  const number = fields.number.value.trim();
  const amount = amountInCents(fields.amount.value);
  if (!invoiceNumber.test(number) || amount === null || !categories.includes(fields.category.value) ||
      !states.includes(fields.status.value) || (fields.date.value && !validDate(fields.date.value))) {
    setStatus("formStatus", "请核对发票号码、类别、日期和金额。金额最多两位小数。", true);
    return;
  }
  const isTaxi = fields.category.value === "打车";
  try {
    const records = readRecords();
    if (records.some(record => record.number === number && record.id !== editId)) {
      setStatus("formStatus", "这个发票号码已登记，请在列表中编辑已有记录。", true);
      return;
    }
    const record = {
      id: editId ?? crypto.randomUUID(), number, amount, category: fields.category.value,
      date: fields.date.value, status: fields.status.value, note: fields.note.value.trim(),
      start: isTaxi ? fields.start.value.trim() : "", end: isTaxi ? fields.end.value.trim() : "",
    };
    const index = records.findIndex(item => item.id === editId);
    if (editId && index === -1) {
      setStatus("formStatus", "这条记录已在另一个窗口删除。请清空表单后重新登记。", true);
      return;
    }
    if (index < 0) records.unshift(record);
    else records[index] = record;
    localStorage.setItem(storageKey, JSON.stringify(records));
    resetEditor();
    renderRecords();
    dispatchEvent(new Event("reimbursement-records-changed"));
    setStatus("formStatus", "发票 " + number + " 已保存。");
  } catch {
    setStatus("formStatus", "保存失败，请检查浏览器存储权限或可用空间。", true);
  }
});

const ocrBase = "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/";
const pdfBase = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/";
let ocrLibrary;
let pdfLibrary;

function loadOcr() {
  if (!ocrLibrary) {
    ocrLibrary = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = ocrBase + "tesseract.min.js";
      script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR"));
      script.onerror = () => reject(new Error("OCR"));
      document.head.append(script);
    }).catch(error => { ocrLibrary = null; throw error; });
  }
  return ocrLibrary;
}

function pdfText(items) {
  const rows = [];
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const [x, y] = item.transform.slice(4);
    let row = rows.find(candidate => Math.abs(candidate.y - y) <= 3);
    if (!row) rows.push(row = { y, items: [] });
    row.items.push({ x, width: item.width, text: item.str });
  }
  return rows.sort((a, b) => b.y - a.y).map(row => {
    const fragments = row.items.sort((a, b) => a.x - b.x);
    return fragments.map((item, i) => {
      const previous = fragments[i - 1];
      const gap = previous ? item.x - previous.x - previous.width : 0;
      return (gap > 13 ? "\t" : gap > 2 ? " " : "") + item.text;
    }).join("");
  }).join("\n");
}

function createOcrReader(progress) {
  let worker;
  async function recognizeImage(image) {
    if (!worker) {
      progress("正在加载中文识别模型…");
      const ocr = await loadOcr();
      worker = await ocr.createWorker(["chi_sim", "eng"], 1, {
        workerPath: ocrBase + "worker.min.js",
        corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0",
        errorHandler: () => {},
        logger: message => {
          if (message.status === "recognizing text") progress("正在识别文字… " + Math.round(message.progress * 100) + "%");
        },
      });
      try {
        await worker.setParameters({ tessedit_pageseg_mode: ocr.PSM.AUTO, preserve_interword_spaces: "1" });
      } catch (error) {
        await close();
        throw error;
      }
    }
    return (await worker.recognize(image)).data.text;
  }

  async function close() {
    const current = worker;
    worker = undefined;
    await current?.terminate().catch(() => {});
  }
  return { recognizeImage, close };
}

async function readFile(file, itinerary, progress, { recognizeImage }) {
  let task;
  try {
    if (!/\.pdf$/i.test(file.name)) {
      const bitmap = await createImageBitmap(file);
      try {
        const scale = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d", { alpha: false });
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return await recognizeImage(canvas);
      } finally {
        bitmap.close();
      }
    }

    if (!pdfLibrary) pdfLibrary = import(pdfBase + "legacy/build/pdf.min.mjs")
      .catch(error => { pdfLibrary = null; throw error; });
    const library = await pdfLibrary;
    library.GlobalWorkerOptions.workerSrc = pdfBase + "legacy/build/pdf.worker.min.mjs";
    task = library.getDocument({
      data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false,
      cMapUrl: pdfBase + "cmaps/", cMapPacked: true, standardFontDataUrl: pdfBase + "standard_fonts/",
    });
    const pdf = await task.promise;
    if (pdf.numPages > 5) throw new Error("too_many_pages");
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      progress("正在读取 PDF 第 " + i + " 页…");
      const page = await pdf.getPage(i);
      const text = pdfText((await page.getTextContent()).items);
      const parsed = parseInvoice(text);
      const hasUsefulText = itinerary ? parsed.start || parsed.end || parsed.multipleRoutes :
        parsed.number || parsed.amount || parsed.multipleInvoices;
      if (hasUsefulText || text.length > 75) {
        pages.push(text);
      } else {
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(3, 2400 / Math.max(base.width, base.height)) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        pages.push(await recognizeImage(canvas));
      }
      page.cleanup();
    }
    return pages.join("\n\n");
  } finally {
    await task?.destroy().catch(() => {});
  }
}

function supportedFile(file) {
  return /\.(pdf|png|jpe?g|webp)$/i.test(file.name) && file.size > 0 && file.size <= 20 * 1024 * 1024;
}

async function importFile(event, itinerary) {
  const input = event.currentTarget;
  const file = input.files[0];
  input.value = "";
  if (!file || busy) return;
  if (!supportedFile(file)) {
    setStatus("recognitionStatus", "请选择 20 MB 以内的 PDF、JPG、PNG 或 WebP。", true);
    return;
  }
  if (!itinerary && (editId || fields.number.value || fields.amount.value || fields.note.value ||
      fields.category.value || fields.date.value || fields.start.value || fields.end.value ||
      fields.status.value !== states[0]) && !confirm("读取新发票会替换当前未保存的表单内容，继续吗？")) return;
  if (!itinerary) resetEditor();
  busy = true;
  const controls = [...form.elements, $("invoiceFile"), $("itineraryFile"), $("batchFiles")];
  controls.forEach(control => { control.disabled = true; });
  setStatus("recognitionStatus", "正在读取 " + file.name + "…");
  const progress = message => setStatus("recognitionStatus", message);
  const ocr = createOcrReader(progress);
  try {
    const text = await readFile(file, itinerary, progress, ocr);
    $("recognizedText").textContent = text;
    $("recognizedDetails").hidden = !text.trim();
    const result = parseInvoice(text);
    if (result.multipleInvoices) {
      setStatus("recognitionStatus", "识别到多个发票号码，请拆成单张发票后再读取。", true);
      return;
    }
    if (!itinerary) {
      for (const key of ["number", "amount", "category", "date"]) fields[key].value = result[key];
    }
    if (fields.category.value === "打车") {
      if (result.start) fields.start.value = result.start;
      if (result.end) fields.end.value = result.end;
    }
    updateRoute();
    const routeIncomplete = fields.category.value === "打车" && (!fields.start.value || !fields.end.value);
    const coreIncomplete = !itinerary && (!result.number || !result.amount || !result.category);
    const feedback = result.multipleRoutes ? "识别到多个可能的路段，请按原行程单填写地点。" :
      itinerary && !result.start && !result.end ? "未读到明确的出发地或终点，请按行程单手动填写。" :
      routeIncomplete ? "打车地点尚未读全，可补充行程单或手动填写。" :
      "读取完成，请核对识别结果。";
    setStatus("recognitionStatus", (coreIncomplete ? "部分发票字段未能识别，请补填。 " : "") + feedback);
  } catch (error) {
    setStatus("recognitionStatus", error.message === "too_many_pages" ? "PDF 超过 5 页，请拆分后再试。" :
      "读取失败。请确认文件清晰、PDF 未加密且网络可用，也可以手动填写。", true);
  } finally {
    await ocr.close();
    busy = false;
    controls.forEach(control => { control.disabled = false; });
  }
}

$("invoiceFile").addEventListener("change", event => importFile(event, false));
$("itineraryFile").addEventListener("change", event => importFile(event, true));
$("resetInvoice").onclick = resetEditor;
fields.category.addEventListener("change", updateRoute);
$("recordSearch").addEventListener("input", renderRecords);
$("statusFilter").addEventListener("change", renderRecords);
addEventListener("storage", event => { if (event.key === storageKey || event.key === null) renderRecords(); });
renderRecords();
