"use strict";

const batch = [];
let batchProcessing = false;
let makingZip = false;

function renamedInvoice(entry) {
  const number = entry.number.trim();
  if (entry.blocked || !invoiceNumber.test(number)) return "";
  return number + entry.file.name.match(/\.[^.]+$/)[0].toLowerCase();
}

function batchData(records) {
  const existing = new Set(records.map(record => record.number));
  const counts = new Map();
  for (const entry of batch) {
    const number = entry.number.trim();
    if (!entry.saved && renamedInvoice(entry)) counts.set(number, (counts.get(number) ?? 0) + 1);
  }
  return batch.map(entry => {
    const name = renamedInvoice(entry);
    const number = entry.number.trim();
    const amount = amountInCents(entry.amount);
    let status = "可保存";
    if (entry.saved) status = "已保存";
    else if (entry.issue) status = entry.issue;
    else if (!name) status = entry.readFailed ? "读取失败，待补票号" : "待补票号";
    else if (existing.has(number)) status = "票号已登记";
    else if (counts.get(number) > 1) status = "本批票号重复";
    else if (amount === null || !categories.includes(entry.category)) status = "待核对金额或类别";
    return { entry, number, name, amount, status };
  });
}

function batchButton(text, name, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.setAttribute("aria-label", text + " " + name);
  button.onclick = action;
  return button;
}

function downloadInvoiceFile(blob, name) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function updateBatch() {
  let records;
  try { records = readRecords(); }
  catch { records = null; }
  const rows = batchData(records ?? []);
  const available = !batchProcessing && !makingZip;
  $("batchCount").textContent = rows.length + " 份 · " + rows.filter(row => row.status === "可保存").length + " 份可保存";
  $("clearBatch").disabled = !available || !rows.length;
  $("downloadZip").disabled = !available || !rows.some(row => row.name);
  $("saveBatch").disabled = !available || !records || !rows.some(row => row.status === "可保存");
  rows.forEach((row, index) => {
    const tr = $("batchRows").rows[index];
    tr.querySelector("[data-batch-state]").textContent = row.status;
    tr.querySelector("[data-renamed-file]").textContent = row.name ? "新文件名 " + row.name : "";
    tr.querySelector("[data-download-file]").disabled = !available || !row.name;
  });
}

function renderBatch() {
  const body = $("batchRows");
  body.replaceChildren();
  for (const entry of batch) {
    const row = body.insertRow();
    const fileCell = row.insertCell();
    fileCell.textContent = entry.file.name;
    const renamed = document.createElement("div");
    renamed.className = "muted";
    renamed.dataset.renamedFile = "";
    fileCell.append(renamed);

    const editable = !batchProcessing && !makingZip && !entry.saved && !entry.blocked;
    const addField = (cell, key, title, options) => {
      const input = document.createElement(options ? "select" : "input");
      if (options) {
        for (const value of ["", ...options]) input.add(new Option(value || "请选择", value));
      } else {
        input.maxLength = key === "number" ? 20 : key === "amount" ? 16 : 150;
        if (key === "number") input.inputMode = "numeric";
        if (key === "amount") input.inputMode = "decimal";
        if (key === "start" || key === "end") input.placeholder = title;
      }
      input.setAttribute("aria-label", title + " " + entry.file.name);
      input.value = entry[key];
      input.disabled = !editable;
      input.addEventListener("input", () => {
        entry[key] = input.value;
        if (key === "category") route.hidden = entry.category !== "打车";
        updateBatch();
      });
      cell.append(input);
    };

    addField(row.insertCell(), "number", "发票号码");
    addField(row.insertCell(), "amount", "价税合计");
    addField(row.insertCell(), "category", "发票类别", categories);
    const route = document.createElement("div");
    route.hidden = entry.category !== "打车";
    row.insertCell().append(route);
    addField(route, "start", "出发地");
    addField(route, "end", "终点");
    row.insertCell().dataset.batchState = "";
    const actions = row.insertCell();
    const buttons = document.createElement("div");
    buttons.className = "row-actions";
    const download = batchButton("下载", entry.file.name, () => {
      const name = renamedInvoice(entry);
      if (name) downloadInvoiceFile(entry.file, name);
    });
    download.dataset.downloadFile = "";
    const remove = batchButton("移除", entry.file.name, () => {
      batch.splice(batch.indexOf(entry), 1);
      renderBatch();
      setStatus("batchStatus", "已移出该文件。");
    });
    remove.disabled = batchProcessing || makingZip;
    buttons.append(download, remove);
    actions.append(buttons);
  }
  updateBatch();
}

async function scanBatch(event) {
  const input = event.currentTarget;
  const files = [...input.files];
  input.value = "";
  if (!files.length || busy || makingZip) return;
  $("batchPanel").hidden = false;
  if (batch.length + files.length > 20 ||
      [...batch.map(entry => entry.file), ...files].reduce((sum, file) => sum + file.size, 0) > 100 * 1024 * 1024) {
    setStatus("batchStatus", "清单最多 20 份且合计不超过 100 MB。请分批处理或先移除已有文件。", true);
    return;
  }

  const pending = files.map(file => ({
    file, number: "", amount: "", category: "", date: "", start: "", end: "",
    saved: false, blocked: false, issue: "排队中",
  }));
  batch.push(...pending);
  busy = batchProcessing = true;
  const controls = [...form.elements, $("invoiceFile"), $("itineraryFile"), input];
  controls.forEach(control => { control.disabled = true; });
  renderBatch();
  $("batchPanel").scrollIntoView({ block: "nearest" });
  let current = 0;
  const progress = message => setStatus("batchStatus", "第 " + current + " / " + pending.length + " 份 · " + message);
  const ocr = createOcrReader(progress);
  try {
    for (const entry of pending) {
      current++;
      progress("正在读取 " + entry.file.name + "…");
      if (!supportedFile(entry.file)) {
        entry.blocked = true;
        entry.issue = "文件格式不支持、为空或超过 20 MB";
      } else {
        try {
          const parsed = parseInvoice(await readFile(entry.file, false, progress, ocr));
          Object.assign(entry, parsed);
          entry.blocked = parsed.multipleInvoices;
          entry.issue = entry.blocked ? "含多个票号，请拆分文件" : "";
        } catch (error) {
          entry.blocked = error?.message === "too_many_pages";
          entry.issue = entry.blocked ? "PDF 超过 5 页，请拆分文件" : "";
          if (!entry.blocked) entry.readFailed = true;
        }
      }
      renderBatch();
    }
    const failed = pending.filter(entry => entry.blocked || entry.readFailed).length;
    setStatus("batchStatus", "已处理 " + pending.length + " 份。" +
      (failed ? "其中 " + failed + " 份未能自动读取，请核对清单。" : "请核对识别结果后保存或下载。"));
  } finally {
    await ocr.close();
    busy = batchProcessing = false;
    controls.forEach(control => { control.disabled = false; });
    renderBatch();
  }
}

function saveBatchRecords() {
  if (busy || makingZip) return;
  try {
    const records = readRecords();
    const ready = batchData(records).filter(row => row.status === "可保存");
    if (!ready.length) {
      updateBatch();
      setStatus("batchStatus", "没有可保存的记录。请检查缺失字段和重复票号。", true);
      return;
    }
    const entries = ready.map(({ entry, number, amount }) => ({
      id: crypto.randomUUID(), number, amount, category: entry.category, date: entry.date,
      start: entry.category === "打车" ? entry.start.trim() : "",
      end: entry.category === "打车" ? entry.end.trim() : "",
      status: states[0], note: "",
    }));
    localStorage.setItem(storageKey, JSON.stringify([...entries, ...records]));
    ready.forEach(({ entry }) => { entry.saved = true; });
    const remaining = batch.filter(entry => !entry.saved).length;
    setStatus("batchStatus", "已保存 " + entries.length + " 条报销记录。" +
      (remaining ? "还有 " + remaining + " 份待处理。" : ""));
    renderRecords();
    renderBatch();
  } catch {
    setStatus("batchStatus", "保存失败，请检查浏览器存储权限或可用空间。", true);
  }
}

async function downloadBatchZip() {
  if (busy || makingZip) return;
  const renamed = batch.map(entry => [renamedInvoice(entry), entry.file]).filter(([name]) => name);
  if (!renamed.length) return;
  makingZip = true;
  $("batchFiles").disabled = true;
  renderBatch();
  setStatus("batchStatus", "正在打包 " + renamed.length + " 份原件…");
  try {
    const { zip } = await import("https://cdn.jsdelivr.net/npm/fflate@0.8.3/esm/browser.js");
    const contents = Object.create(null);
    const counts = new Map();
    for (const [name, file] of renamed) {
      const count = (counts.get(name) ?? 0) + 1;
      counts.set(name, count);
      // Flat names for unique files, separate folders when two originals have the same new name.
      if (count === 1) contents[name] = new Uint8Array(await file.arrayBuffer());
      else (contents["重复文件-" + count] ??= Object.create(null))[name] = new Uint8Array(await file.arrayBuffer());
    }
    const bytes = await new Promise((resolve, reject) => {
      zip(contents, { level: 0 }, (error, result) => error ? reject(error) : resolve(result));
    });
    downloadInvoiceFile(new Blob([bytes], { type: "application/zip" }), "发票原件-按票号命名.zip");
    const skipped = batch.length - renamed.length;
    setStatus("batchStatus", "已下载 " + renamed.length + " 份重命名原件。" +
      (skipped ? "另有 " + skipped + " 份缺少有效票号或文件需处理。" : ""));
  } catch {
    setStatus("batchStatus", "ZIP 生成失败。可重试或逐份下载。", true);
  } finally {
    makingZip = false;
    $("batchFiles").disabled = busy;
    renderBatch();
  }
}

$("batchFiles").addEventListener("change", scanBatch);
$("saveBatch").onclick = saveBatchRecords;
$("downloadZip").onclick = downloadBatchZip;
$("clearBatch").onclick = () => {
  if (batch.some(entry => !entry.saved) && !confirm("清空未保存的识别清单？已保存的报销记录会保留。")) return;
  batch.length = 0;
  setStatus("batchStatus", "");
  renderBatch();
  $("batchPanel").hidden = true;
  $("batchFiles").focus();
};
addEventListener("storage", event => { if (event.key === storageKey || event.key === null) updateBatch(); });
addEventListener("reimbursement-records-changed", updateBatch);
