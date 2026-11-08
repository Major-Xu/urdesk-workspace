# Urdesk 个人工作台

适用于 GitHub Pages 的浏览器本地版。支持设备台账、待办、笔记、主题和加密工资记录。

应用从仓库根目录的 `index.html` 发布。页面可公开访问，个人记录保存在使用者当前浏览器的数据区，工资记录继续使用单独的密码加密。仓库只存页面源码和虚构的示例设备。

换设备或换网址时，从原站「设置 → 下载完整备份」，再在新地址通过「设置 → 从备份恢复」导入。请把备份文件保存在自己的设备上。

## 公开设备台账

`ledger.html` 是访客只读页。编辑仍在 `index.html`，通过「设置 → 公开设备台账」使用独立发布账号。此功能需连接一个 Supabase 项目。

1. 在 Supabase Authentication 创建站主邮箱账号，记录该账号的用户 ID。关闭公开注册。
2. 在 SQL Editor 执行 `public-ledger.sql`，先把零 UUID 替换成站主用户 ID。验证匿名用户能读取公开行、其他用户无法修改、站主可以修改。
3. 执行 `public-ledger-module.sql`，增加完整设备台账字段。
4. 在 `public-ledger-config.js` 填写 `window.urdeskLedgerConfig = { url: "项目 URL", publishableKey: "公开 publishable key" };`。使用 HTTPS 项目 URL，省略尾部斜杠。密钥必须是可公开的 publishable key。
5. 发布网页。先用示例设备核对访客页和保存后更新，再用真实台账。已有浏览器备份格式继续适用。

升级后，旧版摘要仍可从公开页访问，站主重新发布一次即可切换到完整台账。公开内容包括设备购入明细、处置成交价、维修费用和设备备注。
