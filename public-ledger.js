(() => {
  const config = window.urdeskLedgerConfig;
  const tablePath = "/rest/v1/public_device_ledger";
  const fields = "revision,devices,published_at";
  let token, revision, queued, running = false, enabled = false;

  async function request(path, { method = "GET", body, accessToken } = {}) {
    const response = await fetch(config.url + path, {
      method,
      cache: "no-store",
      headers: {
        apikey: config.publishableKey,
        ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
        ...(body ? { "Content-Type": "application/json", Prefer: "return=representation" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      const error = new Error("请求失败");
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  const read = async () => (await request(tablePath + "?id=eq.1&select=" + fields))[0];

  const rows = document.getElementById("publicDeviceRows");
  if (rows) {
    const message = document.getElementById("publicDeviceMessage");
    const table = document.getElementById("publicDeviceTable");
    const money = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" });
    async function refresh() {
      if (!config) return;
      try {
        const entry = await read();
        if (!entry?.published_at) {
          message.textContent = "站主还没有发布设备记录。";
          return;
        }
        const entries = entry.devices.map(device => {
          const row = document.createElement("tr");
          for (const value of [device.name, device.brand || "—", device.category, device.status,
            device.purchased_on, device.disposed_on || "—", money.format(device.value / 100)]) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
          }
          return row;
        });
        rows.replaceChildren(...entries);
        table.hidden = entries.length === 0;
        const time = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" })
          .format(new Date(entry.published_at));
        message.textContent = (entries.length ? entries.length + " 台设备" : "暂无设备") + " · 更新于 " + time + "（北京时间）";
      } catch {
        message.textContent = "暂时无法读取公开台账，请稍后刷新。";
      }
    }
    refresh();
    window.addEventListener("focus", refresh);
    return;
  }

  const form = document.getElementById("publicLedgerSignIn");
  const button = document.getElementById("publishLedger");
  const signOut = document.getElementById("publishSignOut");
  const status = document.getElementById("publishLedgerStatus");
  if (!form || !config) return;
  form.hidden = false;
  status.textContent = "登录后可发布本机设备台账。";

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const submit = form.querySelector("button");
    const password = document.getElementById("publishPassword");
    submit.disabled = true;
    try {
      const auth = await request("/auth/v1/token?grant_type=password", {
        method: "POST", body: { email: document.getElementById("publishEmail").value.trim(), password: password.value }
      });
      const current = await read();
      if (!Number.isSafeInteger(current?.revision)) throw new Error("未初始化");
      token = auth.access_token;
      revision = current.revision;
      form.hidden = true;
      button.hidden = signOut.hidden = false;
      status.textContent = "已登录。确认发布后，本次登录期间保存设备改动会同步到公开页。";
    } catch {
      status.textContent = "登录失败，或公开台账还未初始化。";
    } finally {
      password.value = "";
      submit.disabled = false;
    }
  });

  async function publish() {
    if (!token || !queued || running) return;
    running = true;
    button.disabled = signOut.disabled = true;
    try {
      while (queued) {
        const snapshot = queued;
        queued = null;
        status.textContent = "正在发布设备台账…";
        const updated = await request(tablePath + "?id=eq.1&revision=eq." + revision + "&select=" + fields, {
          method: "PATCH", body: { devices: snapshot, revision: revision + 1 }, accessToken: token
        });
        if (updated.length !== 1) {
          enabled = false;
          queued = null;
          endSession("发布被拒绝，或其他设备已发布新版本。请用站主账号重新登录，核对后再发布。");
          return;
        }
        revision = updated[0].revision;
        status.textContent = "公开台账已更新。本次登录期间保存设备改动会自动发布。";
      }
    } catch (error) {
      enabled = false;
      queued = null;
      status.textContent = error.status === 401
        ? "登录已过期，本机记录已保留。请退出后重新登录，再发布。"
        : "发布失败，本机记录已保留。网络恢复后，请点击「发布当前台账」重试。";
    } finally {
      running = false;
      button.disabled = signOut.disabled = false;
    }
  }

  function snapshot() {
    return personal?.map(device => ({
      name: device.name, brand: device.brand, category: device.category,
      status: statusLabels[statusOf(device)], purchased_on: device.date,
      disposed_on: device.disposedOn, value: recordValue(device)
    }));
  }

  button.addEventListener("click", () => {
    const current = snapshot();
    if (!current) {
      status.textContent = "请先建立个人台账或导入设备备份。";
      return;
    }
    if (!confirm("用这台浏览器里的 " + current.length + " 台设备更新公开台账？本次登录期间的设备修改也会公开。")) return;
    enabled = true;
    queued = current;
    publish();
  });
  function endSession(message) {
    token = undefined;
    enabled = false;
    queued = null;
    form.hidden = false;
    button.hidden = signOut.hidden = true;
    status.textContent = message;
  }
  signOut.addEventListener("click", () => endSession("已退出发布。"));
  window.urdeskPublishDeviceChanges = () => {
    if (!enabled) return;
    queued = snapshot();
    publish();
  };
})();
