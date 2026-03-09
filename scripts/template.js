function statRow(label, value, max = 180) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return `
    <div class="stat">
      <div>${label}</div>
      <div class="bar"><div style="width:${pct}%"></div></div>
      <div style="text-align:right;opacity:.9">${value}</div>
    </div>
  `;
}

function cardTemplate(p) {

  const mainType = p.types?.[0] ?? "normal";
  const secondType = p.types?.[1] ?? "";

  return `
    <article class="card"
      data-id="${p.id}"
      data-type1="${mainType}"
      data-type2="${secondType}"
      style="animation-delay:${p.id * 0.03}s"
      onclick="openDialog(${p.id})">

      <div class="dex-number">${formatDexNumber(p.id)}</div>

      ${favoriteIcon(p.id)}
      ${cardName(p)}
      ${cardImage(p)}
      ${cardTypes(p)}
      ${cardIcons(mainType, secondType)}

    </article>
  `;
}

function formatDexNumber(id) {
  return "#" + String(id).padStart(3, "0");
}

function favoriteIcon(id) {
  const isFav = favorites.includes(id);

  return `
    <div class="favorite" onclick="event.stopPropagation(); toggleFavorite(${id})">
      ${isFav ? "❤️" : "🤍"}
    </div>
  `;
}

function cardName(p) {
  return `<div class="name">${p.nameCap}</div>`;
}

function cardImage(p) {
  return `
    <div class="img">
      <img src="${p.sprite}" alt="${p.nameCap}" loading="lazy">
    </div>
  `;
}

function cardTypes(p) {
  return `
    <div class="types">
      ${p.types.map(t => `<span class="badge" data-type="${t}">${t}</span>`).join("")}
    </div>
  `;
}

function cardIcons(mainType, secondType) {
  return `
    <div class="type-icons">
      <span class="type-icon" data-type="${mainType}"></span>
      ${secondType ? `<span class="type-icon" data-type="${secondType}"></span>` : ""}
    </div>
  `;
}

function render() {

  const q = currentSearch.trim().toLowerCase();
  let list = cache;

  if (q.length >= 3) {
    list = cache.filter(p =>
      p.name.includes(q) || String(p.id).includes(q)
    );
  }

  pokedexEl.innerHTML = list.map(cardTemplate).join("");

  applyTypeGradients();
}

function applyTypeGradients() {
  document.querySelectorAll(".card").forEach(card => {

    const t1 = card.dataset.type1 || "normal";
    const t2 = card.dataset.type2 || "";

    const c1 = TYPE_COLORS[t1] || TYPE_COLORS.normal;
    const c2 = TYPE_COLORS[t2] || c1;

    card.style.setProperty("--c1", c1);
    card.style.setProperty("--c2", c2);

  });
}

function buildDialogHTML(p, evolution) {

  const typeBadges = p.types
    .map(t => `<span class="badge" data-type="${t}">${t}</span>`)
    .join(" ");

  const evolutionHTML = evolution
    .map(name => `<span class="evo-item">${cap(name)}</span>`)
    .join(" ➜ ");

  return `
    <div class="dialog-top">
      <button class="nav-btn" onclick="showPrevious(${p.id})">←</button>

      <h2 class="dialog-title">
        ${p.nameCap} <span style="opacity:.7">#${String(p.id).padStart(3, "0")}</span>
      </h2>

      <button class="nav-btn" onclick="showNext(${p.id})">→</button>
      <button class="dialog-close" onclick="closeDialog()">✕</button>
    </div>

    <div class="evolution">
      <h3>Evolution</h3>
      <div class="evo-chain">${evolutionHTML}</div>
    </div>

    <div class="meta">${typeBadges}</div>

    <div class="dialog-body">



      <div class="dialog-img">
  <img src="${p.sprite}" alt="${p.nameCap}">

  <button class="cry-btn" onclick="playPokemonCry(${p.id})">
    🔊
  </button>
</div>

      <div>

        <div class="meta">
          Größe: <b>${toMeters(p.heightDm)} m</b> •
          Gewicht: <b>${toKg(p.weightHg)} kg</b>
        </div>

        <div class="stats">
          ${statRow("HP", p.stats.hp)}
          ${statRow("Attack", p.stats.attack)}
          ${statRow("Defense", p.stats.defense)}
          ${statRow("Sp. Atk", p.stats.spAttack)}
          ${statRow("Sp. Def", p.stats.spDefense)}
          ${statRow("Speed", p.stats.speed)}
        </div>

      </div>
    </div>
  `;
}

async function openDialog(id) {
  playPokemonCry(id);
  lastScrollY = window.scrollY;
  const p = cache.find(x => x.id === id);
  if (!p) return;

  const evolution = await fetchEvolutionChain(id);

  setDialogGradient(p);
  dialogEl.innerHTML = buildDialogHTML(p, evolution);
  dialogEl.showModal();
}

function closeDialog() {
  dialogEl.close();
  if (document.activeElement) {
    document.activeElement.blur();
  }
  setTimeout(() => {
    window.scrollTo({
      top: lastScrollY,
      behavior: "auto"
    });
  }, 0);
}



function renderTicker() {

  const ticker = document.getElementById("pokemonTicker");

  ticker.innerHTML = cache.map(p => `
    <div class="ticker-item">
      <img src="${p.sprite}" alt="${p.name}">
      <span>${p.nameCap}</span>
    </div>
  `).join("");

}