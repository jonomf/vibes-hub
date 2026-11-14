const $ = (s) => document.querySelector(s);

const res = await fetch("projects.json", { cache: "no-cache" });
const data = await res.json();
const all = data.projects || [];

document.title = data.title || "vibes hub";
$("#title").textContent = data.title || "vibes hub";
$("#tagline").textContent = data.tagline || "";
$("#ghlink").href = `https://github.com/${data.owner}`;
$("#generated").textContent = ago(data.generated);

const state = { q: "", tag: null, sort: "updated" };

// tag chips, most common first
const counts = {};
all.forEach((p) => (p.topics || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
const tags = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
const chips = $("#chips");
if (tags.length) {
  for (const t of [null, ...tags]) {
    const b = document.createElement("button");
    b.textContent = t ?? "all";
    if (t === null) b.classList.add("on");
    b.onclick = () => {
      state.tag = t;
      chips.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      render();
    };
    chips.append(b);
  }
}

$("#search").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); render(); });
document.querySelectorAll(".sort button").forEach((b) =>
  b.addEventListener("click", () => {
    state.sort = b.dataset.sort;
    document.querySelectorAll(".sort button").forEach((x) => x.classList.toggle("on", x === b));
    render();
  })
);

render();

function render() {
  const grid = $("#grid");
  grid.replaceChildren();
  let list = all.filter((p) => {
    if (state.tag && !(p.topics || []).includes(state.tag)) return false;
    if (!state.q) return true;
    return [p.title, p.description, p.id, ...(p.topics || [])].join(" ").toLowerCase().includes(state.q);
  });
  list.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (state.sort === "title") return a.title.localeCompare(b.title);
    return (b[state.sort] || "").localeCompare(a[state.sort] || "");
  });

  $("#count").textContent = `${all.length} project${all.length === 1 ? "" : "s"}`;
  $("#empty").hidden = list.length > 0;

  list.forEach((p, i) => grid.append(card(p, i)));
}

function card(p, i) {
  const el = $("#card-tpl").content.firstElementChild.cloneNode(true);
  el.style.setProperty("--h", hue(p.id));
  el.style.setProperty("--i", i);
  if (p.featured) el.classList.add("featured");

  const cover = el.querySelector(".cover");
  cover.href = p.url;
  cover.setAttribute("aria-label", `Open ${p.title}`);
  const img = el.querySelector("img");
  const src = p.image || p.thumb;
  if (src) {
    img.src = src;
    cover.classList.add("has-img");
    img.onerror = () => { img.removeAttribute("src"); cover.classList.remove("has-img"); fillEmoji(); };
  }
  const emoji = el.querySelector(".emoji");
  function fillEmoji() {
    emoji.replaceChildren();
    if (p.emoji) emoji.textContent = p.emoji;
    else if (!cover.classList.contains("has-img")) {
      const s = document.createElement("span");
      s.className = "initial";
      s.textContent = p.title.slice(0, 1);
      emoji.append(s);
    }
  }
  fillEmoji();

  const title = el.querySelector(".title");
  title.textContent = p.title;
  title.href = p.url;
  el.querySelector(".desc").textContent = p.description || "";
  el.querySelector(".when").textContent = p.updated ? `touched ${ago(p.updated)}` : "";
  const code = el.querySelector(".code");
  if (p.repoUrl) code.href = p.repoUrl; else code.remove();

  const ul = el.querySelector(".tags");
  for (const t of p.topics || []) {
    const li = document.createElement("li");
    li.textContent = t;
    ul.append(li);
  }
  return el;
}

function hue(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

function ago(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso)) / 1000;
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, n] of units) {
    const v = Math.floor(s / n);
    if (v >= 1) return `${v} ${u}${v > 1 ? "s" : ""} ago`;
  }
  return "just now";
}
