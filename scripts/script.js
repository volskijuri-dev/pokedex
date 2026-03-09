const API = "https://pokeapi.co/api/v2";

const pokedexEl = document.getElementById("pokedex");
const loadBtn = document.getElementById("loadButton");
const loadingEl = document.getElementById("loading");
const attentionEl = document.getElementById("Attention");
const searchEl = document.getElementById("searchBar");
const dialogEl = document.getElementById("dialogpokemon");

let nextUrl = `${API}/pokemon?limit=15&offset=0`;
let cache = [];
let currentSearch = "";
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let allPokemonList = [];

const TYPE_COLORS = {
  normal: "#95a5a6",
  fire: "#f39c12",
  water: "#3498db",
  electric: "#f1c40f",
  grass: "#5dbb63",
  ice: "#74d0f6",
  fighting: "#e74c3c",
  poison: "#8e44ad",
  ground: "#cfa55b",
  flying: "#81b9ef",
  psychic: "#ff5a8a",
  bug: "#95a51b",
  rock: "#b09f6b",
  ghost: "#6c5ce7",
  dragon: "#2c3e50",
  dark: "#2d3436",
  steel: "#7f8c8d",
  fairy: "#ff7eb6",
};

async function loadAllPokemonList() {
  const data = await fetchJson(`${API}/pokemon?limit=100000&offset=0`);
  allPokemonList = data.results;
}

function showLoader() {
  loadingEl.classList.remove("hidden");
  document.body.classList.add("loading");
}

function hideLoader() {
  loadingEl.classList.add("hidden");
  document.body.classList.remove("loading");
}

function showLoader() {
  loadingEl.classList.remove("hidden");
  pokedexEl.classList.add("is-loading");
  loadBtn.classList.add("is-loading");
}

function hideLoader() {
  loadingEl.classList.add("hidden");
  pokedexEl.classList.remove("is-loading");
  loadBtn.classList.remove("is-loading");
}

function showAttention(msg) {
  attentionEl.textContent = msg;
  attentionEl.classList.remove("hidden");
}

function hideAttention() {
  attentionEl.textContent = "";
  attentionEl.classList.add("hidden");
}

function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function toggleFavorite(id) {
  const index = favorites.indexOf(id);

  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(id);
  }

  saveFavorites();

  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (!card) return;

  const icon = card.querySelector(".favorite");
  if (icon) {
    icon.textContent = favorites.includes(id) ? "❤️" : "🤍";
  }
}

async function loadMissingPokemon(value) {

  const matches = allPokemonList
    .filter(p => p.name.includes(value))
    .slice(0, 20);

  if (!matches.length) return;

  showLoader();

  try {
    const details = await Promise.all(matches.map(p => fetchJson(p.url)));
    const mapped = details.map(mapDetails);

    mapped.forEach(pokemon => {
      if (!cache.some(c => c.id === pokemon.id)) {
        cache.push(pokemon);
      }
    });

  } catch (err) {
    console.error(err);
    showAttention("Fehler bei der Suche.");
  } finally {
    hideLoader();
  }
}

async function searchPokemon() {

  const value = searchEl.value.trim().toLowerCase();

  if (value.length === 0) {
    currentSearch = "";
    loadBtn.style.display = nextUrl ? "block" : "none";
    render();
    return;
  }

  if (value.length < 3) {
    currentSearch = "__HIDE__";
    loadBtn.style.display = "none";
    render();
    return;
  }

  currentSearch = value;
  loadBtn.style.display = "none";

  const cachedMatches = cache.some(
    p => p.name.includes(value) || String(p.id).includes(value)
  );

  if (!cachedMatches) {
    await loadMissingPokemon(value);
  }

  render();
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`);
  return res.json();
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function toMeters(dm) {
  return (dm / 10).toFixed(1);
}

function toKg(hg) {
  return (hg / 10).toFixed(1);
}

function mapDetails(d) {
  const statMap = {
    hp: "hp",
    attack: "attack",
    defense: "defense",
    "special-attack": "spAttack",
    "special-defense": "spDefense",
    speed: "speed",
  };

  const stats = Object.fromEntries(
    d.stats.map((s) => [statMap[s.stat.name] ?? s.stat.name, s.base_stat])
  );

  return {
    id: d.id,
    name: d.name,
    nameCap: cap(d.name),
    types: d.types.map((x) => x.type.name),
    sprite:
      d.sprites?.other?.["official-artwork"]?.front_default ??
      d.sprites?.front_default ??
      null,
    heightDm: d.height,
    weightHg: d.weight,
    stats,
  };
}

function getFilteredPokemon() {
  if (currentSearch === "") return cache;

  if (currentSearch === "__HIDE__") return [];

  return cache.filter(
    (p) =>
      p.name.includes(currentSearch) ||
      String(p.id).includes(currentSearch)
  );
}

function applyTypeGradients() {
  document.querySelectorAll(".card").forEach((card) => {
    const t1 = card.dataset.type1 || "normal";
    const t2 = card.dataset.type2 || "";

    const c1 = TYPE_COLORS[t1] || TYPE_COLORS.normal;
    const c2 = TYPE_COLORS[t2] || c1;

    card.style.setProperty("--c1", c1);
    card.style.setProperty("--c2", c2);
  });
}

function render() {
  const list = getFilteredPokemon();

  if (currentSearch.length >= 3 && list.length === 0) {
    pokedexEl.innerHTML = `<p class="no-results">Kein Pokémon gefunden.</p>`;
    return;
  }

  pokedexEl.innerHTML = list.map(cardTemplate).join("");
  applyTypeGradients();
}

async function init() {
  hideAttention();

  try {
    await loadAllPokemonList();
  } catch (err) {
    console.error("Fehler beim Laden der Pokemon-Liste", err);
  }

  await loadMore();
}

async function loadMore() {
  if (!nextUrl) return;

  showLoader();

  const startTime = Date.now();
  const minTime = 1200;

  try {
    const page = await fetchJson(nextUrl);
    nextUrl = page.next;

    loadBtn.style.display = nextUrl ? "block" : "none";

    const details = await Promise.all(page.results.map((p) => fetchJson(p.url)));
    const mapped = details.map(mapDetails);

    cache.push(...mapped);
  } catch (err) {
    console.error(err);
    showAttention("Fehler beim Laden. Bitte probiere es nochmal.");
  } finally {
    const elapsed = Date.now() - startTime;

    if (elapsed < minTime) {
      await new Promise((resolve) => setTimeout(resolve, minTime - elapsed));
    }

    hideLoader();
    render();
    renderTicker();
  }
}

function setDialogGradient(p) {
  const type1 = p.types?.[0] ?? "normal";
  const type2 = p.types?.[1] ?? "";

  const c1 = TYPE_COLORS[type1] || TYPE_COLORS.normal;
  const c2 = TYPE_COLORS[type2] || c1;

  dialogEl.style.setProperty("--c1", c1);
  dialogEl.style.setProperty("--c2", c2);
}

function closeDialog() {
  dialogEl.close();

  if (document.activeElement) {
    document.activeElement.blur();
  }

  setTimeout(() => {
    window.scrollTo({
      top: lastScrollY,
      behavior: "auto",
    });
  }, 0);
}

async function showNext(currentId) {
  let nextPokemon = cache.find((p) => p.id === currentId + 1);

  if (!nextPokemon && nextUrl) {
    await loadMore();
    nextPokemon = cache.find((p) => p.id === currentId + 1);
  }

  if (nextPokemon) {
    openDialog(nextPokemon.id);
  }
}

function showPrevious(currentId) {
  const prevPokemon = cache.find((p) => p.id === currentId - 1);
  if (prevPokemon) {
    openDialog(prevPokemon.id);
  }
}

async function fetchEvolutionChain(id) {
  const species = await fetchJson(`${API}/pokemon-species/${id}`);
  const evoData = await fetchJson(species.evolution_chain.url);

  const chain = [];
  let evo = evoData.chain;

  do {
    chain.push(evo.species.name);
    evo = evo.evolves_to[0];
  } while (evo);

  return chain;
}

document.addEventListener("keydown", (e) => {
  if (!dialogEl.open) return;

  if (e.key === "Escape") closeDialog();

  const title = dialogEl.querySelector(".dialog-title");
  if (!title) return;

  const match = title.textContent.match(/#(\d+)/);
  const currentId = match ? Number(match[1]) : null;
  if (!currentId) return;

  if (e.key === "ArrowRight") showNext(currentId);
  if (e.key === "ArrowLeft") showPrevious(currentId);
});

dialogEl.addEventListener("click", (e) => {
  const rect = dialogEl.getBoundingClientRect();
  const inside =
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom;

  if (!inside) closeDialog();
});