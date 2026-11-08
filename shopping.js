"use strict";
const storeKey = "urdesk.shopping.v1";
const money = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" });
const timestamp = new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" });
const day = 86400000;
const priorities = [
  ["拍照", /拍照|相机|摄影|视频拍摄/i], ["性能", /性能|游戏|剪辑|渲染|办公|编程/i],
  ["耐用与可靠", /质量|耐用|可靠|寿命|故障/i], ["续航", /续航|电池/i],
  ["降噪与佩戴", /降噪|佩戴|通勤|耳压/i], ["售后", /售后|保修|维修/i],
  ["使用成本", /耗材|电费|长期成本/i], ["价格", /性价比|便宜|划算|最低价/i]
];
const categories = [
  ["手机", /手机|iphone|galaxy|mate\s?\d|一加/i],
  ["笔记本电脑", /macbook|笔记本|电脑|thinkpad|laptop/i],
  ["扫地机器人", /扫地机|扫拖|洗地|扫地机器人/i],
  ["耳机", /耳机|airpods|headphone/i], ["平板", /平板|ipad/i],
  ["显示器", /显示器|monitor/i], ["相机", /相机|单反|微单/i]
];
const brands = [
  ["Apple", /apple|苹果|macbook|iphone|ipad|airpods/i, "https://www.apple.com.cn/store"],
  ["华为", /华为|huawei/i, "https://www.vmall.com/"], ["小米", /小米|红米|redmi|xiaomi/i, "https://www.mi.com/shop"],
  ["联想", /联想|lenovo|thinkpad/i, "https://www.lenovo.com.cn/"],
  ["三星", /三星|samsung|galaxy/i, "https://www.samsung.com.cn/"],
  ["索尼", /索尼|sony/i, "https://www.sony.com.cn/"],
  ["石头", /石头|roborock/i, "https://www.roborock.com/"]
];
const topics = [
  ["拍照", /拍照|画质|成像|摄像|夜景|对焦/],
  ["续航与充电", /续航|电池|掉电|充电/],
  ["性能与流畅度", /流畅|卡顿|性能|速度|死机|闪退/],
  ["噪声、降噪与佩戴", /噪声|噪音|降噪|佩戴|夹耳|耳压/],
  ["故障与耐用性", /故障|坏了|断裂|漏水|失灵|返修|磨损|耐用/],
  ["做工与用料", /做工|用料|质感|松动|划痕|异味/],
  ["售后与维修", /售后|保修|维修|换货|退货|客服/],
  ["清洁体验", /清洁|扫地|拖地|污渍|避障|缠毛|耗材/]
];
const praise = /满意|喜欢|不错|很棒|很好|好用|耐用|安静|清晰|顺滑|流畅|给力|舒服/;
const concern = /不满意|不耐用|不流畅|不清晰|差评|太差|失望|故障|坏了|断裂|漏水|失灵|返修|死机|闪退|卡顿|夹耳|松动|异味|掉电快|耗电快/;
const longUse = /用了|使用了|用过|到手|使用.{0,12}(周|个月|半年|一年)|长期|半年|一年/;
const textKey = value => String(value).normalize("NFKC").toLocaleLowerCase("zh-CN").replace(/\s+/g,"");
const offerKey = item => JSON.stringify([item.brand,item.model,item.config,item.condition].map(textKey));
const title = item => [item.brand,item.model,item.config,item.condition].join(" · ");
const dollars = cents => money.format(cents/100);

function parseNeed(text) {
  const normalized = text.normalize("NFKC").replace(/(?<=\d),(?=\d{3}(?:\D|$))/g,"");
  const rangePattern = "(\\d+(?:\\.\\d+)?)\\s*(万|千|[kK])?\\s*(?:到|至|[-–—~～])\\s*(\\d+(?:\\.\\d+)?)\\s*(万|千|[kK])?";
  const range = normalized.match(new RegExp("(?:预算|价位)\\s*(?:是|在|为|约|：|:)?\\s*" + rangePattern)) ??
    normalized.match(new RegExp(rangePattern + "\\s*(?:元|块|人民币)"));
  const cash = normalized.match(/(?:预算|价位|不超过|低于|最多|上限)\s*(?:是|在|为|约|：|:)?\s*[¥￥]?\s*(\d+(?:\.\d+)?)\s*(万|千|[kK])?/) ??
    normalized.match(/(?:[¥￥]\s*)?(\d+(?:\.\d+)?)\s*(万|千|[kK])?\s*(?:元|块|以内|以下|预算)/);
  const units = {"万":10000,"千":1000,k:1000,K:1000};
  const cents = (number,unit) => Math.round(Number(number)*(units[unit] ?? 1)*100);
  const min = range ? cents(range[1],range[2]) : null;
  const max = range ? cents(range[3],range[4] ?? range[2]) : cash ? cents(cash[1],cash[2]) : null;
  const category = categories.find(([,pattern])=>pattern.test(normalized))?.[0] ?? null;
  const brand = brands.find(([,pattern])=>pattern.test(normalized)) ?? null;
  const flags = priorities.filter(([,pattern])=>pattern.test(normalized)).map(([name])=>name);
  const config = normalized.match(/\d+\s*(?:TB|GB)\b/gi) ?? [];
  const use = normalized.match(/通勤|办公|学习|摄影|拍照|游戏|剪辑|编程|家用|宠物|跑步/g) ?? [];
  return {category,brand,flags,config,use:[...new Set(use)], min:min!==null && min<=max?min:null,max:max!==null && Number.isSafeInteger(max)?max:null,
    term:[brand?.[0],/macbook/i.test(normalized)?"MacBook":/iphone/i.test(normalized)?"iPhone":category,...config].filter(Boolean).join(" ")};
}

function validLink(value) {
  try {
    const url = new URL(value);
    return url.protocol==="https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function payable(item) {
  return item.shipping===null ? null : item.base-item.coupon-item.subsidy+item.shipping;
}

function priceStatus(item,now=Date.now()) {
  const date=Date.parse(item.checked);
  if (!item.confirmed || payable(item)===null) return "条件待确认";
  if (!Number.isFinite(date) || date>now) return "时间未核实";
  if (now-date>2*day) return "超过 48 小时";
  return "已录入核对价";
}

function compareOffers(offers,need,now=Date.now()) {
  const groups=new Map();
  for (const offer of offers) {
    const key=offerKey(offer);
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(offer);
  }
  return [...groups.values()].map(items=>{
    const sorted=[...items].sort((a,b)=>Number(priceStatus(b,now)==="已录入核对价")-Number(priceStatus(a,now)==="已录入核对价") ||
      (payable(a) ?? Infinity)-(payable(b) ?? Infinity));
    const eligible=sorted.filter(item=>priceStatus(item,now)==="已录入核对价" &&
      (need.min===null || payable(item)>=need.min) && (need.max===null || payable(item)<=need.max));
    return {items:sorted,best:eligible[0] ?? null};
  });
}

function summarizeReviews(value) {
  const lines=value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const unique=[...new Map(lines.map(line=>[textKey(line).replace(/[\p{P}\p{S}]/gu,""),line])).values()];
  const metrics={total:lines.length,unique:unique.length,repeated:lines.length-unique.length,long:unique.filter(line=>longUse.test(line)).length,positive:0,negative:0};
  const breakdown=topics.map(([label,pattern])=>({label,positive:0,negative:0,mentions:0}));
  for (const line of unique) {
    let good=false,bad=false;
    for (const phrase of line.split(/[，。；;！!？?]|但是|不过|但/g)) {
      const risk=concern.test(phrase), benefit=!risk && praise.test(phrase);
      good ||= benefit;
      bad ||= risk;
      breakdown.forEach((topic,index)=>{
        if (!topics[index][1].test(phrase)) return;
        if (benefit) topic.positive++;
        if (risk) topic.negative++;
      });
    }
    if (good) metrics.positive++;
    if (bad) metrics.negative++;
    breakdown.forEach((topic,index)=>{if (topics[index][1].test(line)) topic.mentions++;});
  }
  return {metrics,topics:breakdown.filter(topic=>topic.mentions).sort((a,b)=>b.mentions-a.mentions)};
}

function initShopping() {
  const $=id=>document.getElementById(id);
  let state={need:"",term:"",offers:[],evidence:[],reviews:[]};
  try {
    const saved=JSON.parse(localStorage.getItem(storeKey));
    if (saved && typeof saved.need==="string" && typeof saved.term==="string" &&
        ["offers","evidence","reviews"].every(key=>Array.isArray(saved[key]))) state=saved;
  } catch { /* Use an empty work area if browser data is unreadable. */ }
  let need=parseNeed(state.need);
  const make=(tag,value,css)=>{
    const el=document.createElement(tag);
    if (value!=null) el.textContent=value;
    if (css) el.className=css;
    return el;
  };
  function link(text,url,css) {
    const element=make("a",text,css);
    element.href=validLink(url) ?? "#";
    element.target="_blank";
    element.rel="noopener noreferrer";
    return element;
  }
  function persist(message) {
    try {
      localStorage.setItem(storeKey,JSON.stringify(state));
      $("shoppingStatus").textContent=message;
    } catch {
      $("shoppingStatus").textContent="浏览器未能保存，本次填写仅在当前页面保留。";
    }
  }
  const details={
    "官方资料":"适合核对规格与保修条款；品牌自述",
    "第三方专业测评":"需核对测试方法、版本和利益披露",
    "用户经验":"个人经验；结论不能外推到整个型号"
  };
  function remove(label,list,index) {
    const button=make("button","移除");
    button.type="button";
    button.setAttribute("aria-label","移除"+label);
    button.onclick=()=>{
      state[list].splice(index,1);
      persist("已移除。");
      render();
    };
    return button;
  }
  function renderShops() {
    const q=encodeURIComponent(state.term.trim());
    const shops=[
      ["京东",q?"https://search.jd.com/Search?keyword="+q:"https://www.jd.com/"],
      ["淘宝 / 天猫",q?"https://s.taobao.com/search?q="+q:"https://www.taobao.com/"],
      ["拼多多","https://www.pinduoduo.com/"],
      ["苏宁易购",q?"https://search.suning.com/"+q+"/":"https://www.suning.com/"],
      ...(need.brand?[[need.brand[0]+" 官网",need.brand[2]]]:[])
    ];
    $("shops").replaceChildren(...shops.map(([label,url])=>link(label,url,"button")));
  }
  function render() {
    $("needSummary").textContent=!state.need?"输入一句话开始。":need.category
      ? (need.max===null?"已识别品类。补充预算可以缩小候选范围。":"已识别条件。请前往平台核对实际报价。")
      : "可以补充商品类别，或直接修改平台搜索关键词。";
    const chips=[need.category && "品类 "+need.category,need.max!==null &&
      (need.min!==null?"预算 "+dollars(need.min)+"–"+dollars(need.max):"预算上限 "+dollars(need.max)),
      need.brand && "提到 "+need.brand[0],need.use.length && "用途 "+need.use.join("、"),...need.flags.map(flag=>"关注 "+flag)];
    $("needChips").replaceChildren(...chips.filter(Boolean).map(value=>make("span",value,"chip")));
    renderShops();
    const groups=compareOffers(state.offers,need);
    const quoteNodes=groups.flatMap(group=>{
      const wrapper=make("div",null,"table-scroll");
      const table=make("table");
      const head=table.createTHead().insertRow();
      for (const label of ["平台 / 商家","原价与优惠","到手价","核对时间与状态","售后 / 使用成本","操作"]) {
        const th=make("th",label);th.scope="col";head.append(th);
      }
      const body=table.createTBody();
      for (const item of group.items) {
        const row=body.insertRow();
        const amount=payable(item);
        const url=validLink(item.url);
        row.insertCell().append(make("strong",item.platform),make("div",item.seller || "商家未登记"),
          ...(url?[link("查看商品",url)]:[]));
        row.insertCell().textContent=dollars(item.base)+" · 券 "+dollars(item.coupon)+" · 补贴 "+dollars(item.subsidy)+" · 运费 "+(item.shipping===null?"待确认":dollars(item.shipping));
        row.insertCell().append(make("strong",amount===null?"待确认":dollars(amount)),...(group.best===item?[make("div","本组符合预算最低核对价","muted")]:[]));
        row.insertCell().append(make("div",item.checked && Number.isFinite(Date.parse(item.checked))?timestamp.format(new Date(item.checked)):"未登记"),make("div",priceStatus(item)));
        row.insertCell().textContent=(item.service || "未登记")+(item.running===null?"":" · 额外成本估计 "+dollars(item.running));
        row.insertCell().append(remove("报价","offers",state.offers.indexOf(item)));
      }
      wrapper.append(table);
      return [make("h3",title(group.items[0])),wrapper];
    });
    $("quotes").replaceChildren(...(quoteNodes.length?quoteNodes:[make("p","暂无报价。请在平台查到具体商品后添加。","empty")]));
    const evidenceList=make("ul",null,"evidence");
    state.evidence.forEach((item,index)=>{
      const li=make("li");
      li.append(make("strong",[item.product,item.kind,item.aspect,item.signal].join(" · ")),
        make("div",item.text),make("small",details[item.kind]+" "),link("查看来源",item.url)," ",remove("证据","evidence",index));
      evidenceList.append(li);
    });
    $("evidenceList").replaceChildren(state.evidence.length?evidenceList:make("p","暂无规格、质量或售后证据。","empty"));
    const reviewNodes=state.reviews.map((item,index)=>{
      const area=make("div",null,"panel");
      const {metrics,topics:items}=item.summary;
      area.append(make("h3",item.product+" · "+item.platform),link("评价来源",item.url),
        make("p","共 "+metrics.total+" 条，合并 "+metrics.repeated+" 条完全或规范化重复文本；分析 "+metrics.unique+" 条。含正向词 "+metrics.positive+" 条，含顾虑词 "+metrics.negative+" 条，提及使用时长 "+metrics.long+" 条。","muted"));
      const list=make("ul",null,"evidence");
      items.forEach(topic=>list.append(make("li",topic.label+" · 涉及 "+topic.mentions+" 条；正向片段 "+topic.positive+" 个，顾虑片段 "+topic.negative+" 个")));
      area.append(list,make("p","这是关键词摘要，不能判定评价真伪、故障率或设计缺陷。不同平台样本请分开比较。","muted"),remove("评价样本","reviews",index));
      return area;
    });
    $("reviewsResult").replaceChildren(...reviewNodes);
    const bests=groups.filter(group=>group.best);
    $("decision").textContent=!state.offers.length?"先添加商品报价，再结合质量、售后和评价做取舍。":
      !bests.length?"目前没有符合预算且已核对的到手价。请补齐运费、优惠资格或报价时间后再比较。":
      "有 "+bests.length+" 个同款组具备符合预算的核对价。"+(bests.length===1?
        title(bests[0].best)+" 在已录入报价中可优先核对 "+bests[0].best.platform+"（"+dollars(payable(bests[0].best))+"）。":
        "每组最低核对价已在上方标出；不同配置请结合需求和证据选择。")+
      (state.evidence.length?" 建议先核对与用途相关的测评、售后条款和负面证据。":" 质量证据尚未录入，暂时只能判断价格。");
  }

  function readForm(form) { return Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,value.trim()])); }
  function report(form,message) {
    const field=form.querySelector('[name="url"]');
    field.setCustomValidity(message);
    form.reportValidity();
    field.setCustomValidity("");
  }
  $("shoppingNeed").value=state.need;
  $("platformTerm").value=state.term;
  $("shoppingSearch").addEventListener("submit",event=>{
    event.preventDefault();
    state.need=$("shoppingNeed").value.trim();
    need=parseNeed(state.need);
    state.term=need.term;
    $("platformTerm").value=state.term;
    persist("需求已更新。");
    render();
  });
  document.querySelectorAll(".examples button").forEach(button=>button.onclick=()=>{
    $("shoppingNeed").value=button.textContent;
    $("shoppingSearch").requestSubmit();
  });
  $("platformTerm").addEventListener("input",()=>{
    state.term=$("platformTerm").value;
    renderShops();
  });
  $("platformTerm").addEventListener("change",()=>persist("搜索关键词已保存。"));
  function accept(formId,collection,process,message) {
    $(formId).addEventListener("submit",event=>{
      event.preventDefault();
      const form=event.currentTarget,data=readForm(form);
      if (!data.url || !(data.url=validLink(data.url))) return report(form,"请输入可访问的 HTTPS 来源链接。");
      const item=process(data,form);
      if (!item) return;
      state[collection].push(item);
      form.reset();
      persist(message);
      render();
    });
  }
  accept("quoteForm","offers",(data,form)=>{
    for (const key of ["brand","model","config"]) {
      if (!data[key]) { form.elements[key].focus(); return null; }
    }
    const asCents=key=>data[key]===""?null:Math.round(Number(data[key])*100);
    const item={...data,base:asCents("base"),coupon:asCents("coupon") ?? 0,subsidy:asCents("subsidy") ?? 0,shipping:asCents("shipping"),running:asCents("running"),confirmed:form.elements.confirmed.checked};
    if (item.coupon+item.subsidy>item.base) { report(form,"优惠券与补贴合计不能超过商品报价。"); return null; }
    return item;
  },"报价已保存。");
  accept("evidenceForm","evidence",data=>data.product && data.text ? data : null,"证据已保存。");
  accept("reviewsForm","reviews",({product,platform,url,reviews})=>
    product && platform && reviews?{product,platform,url,summary:summarizeReviews(reviews)}:null,"评价摘要已保存。");
  render();
}
if (typeof document!=="undefined") initShopping();
