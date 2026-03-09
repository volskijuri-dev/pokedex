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

function showLoader() {
  loadingEl.classList.remove("hidden");
}

function hideLoader() {
  loadingEl.classList.add("hidden");
}

function showAttention(msg) {
  attentionEl.textContent = msg;
  attentionEl.classList.remove("hidden");
}

function hideAttention() {
  attentionEl.classList.add("hidden");
}

function saveFavorites(){
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function toggleFavorite(id){

  if(favorites.includes(id)){
    favorites = favorites.filter(f => f !== id);
  } else {
    favorites.push(id);
  }

  saveFavorites();
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

function toMeters(dm) { return (dm / 10).toFixed(1); }
function toKg(hg) { return (hg / 10).toFixed(1); }

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
    d.stats.map(s => [statMap[s.stat.name] ?? s.stat.name, s.base_stat])
  );

  return {
    id: d.id,
    name: d.name,
    nameCap: cap(d.name),
    types: d.types.map(x => x.type.name),
    sprite: d.sprites?.other?.["official-artwork"]?.front_default
      ?? d.sprites?.front_default
      ?? null,
    heightDm: d.height,
    weightHg: d.weight,
    stats,
  };
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

function render() {
  const q = currentSearch.trim().toLowerCase();
  let list = cache;

  if (q.length >= 3) {
    list = cache.filter(p => p.name.includes(q) || String(p.id).includes(q));
  }

  pokedexEl.innerHTML = list.map(cardTemplate).join("");
  applyTypeGradients();
}

async function init() {
  hideAttention();
  await loadMore();
}

async function loadMore() {
  if (!nextUrl) return;

  showLoader();

  const startTime = Date.now();
  const minTime = 2000;

  try {
    const page = await fetchJson(nextUrl);
    nextUrl = page.next;

    loadBtn.style.display = nextUrl ? "block" : "none";

    const details = await Promise.all(page.results.map(p => fetchJson(p.url)));
    const mapped = details.map(mapDetails);

    cache.push(...mapped);

  } catch (err) {
    console.error(err);
    showAttention("Fehler beim Laden. Bitte probiere es nochmal.");
  }

  const elapsed = Date.now() - startTime;

  if (elapsed < minTime) {
    await new Promise(r => setTimeout(r, minTime - elapsed));
  }

  hideLoader();
  render();
  renderTicker();
}

function searchPokemon() {
  currentSearch = searchEl.value || "";

  const q = currentSearch.trim();
  if (q.length > 0 && q.length < 3) {
    showAttention("Bitte mindestens 3 Buchstaben eingeben.");
    loadBtn.style.display = "none";
  } else {
    hideAttention();
    loadBtn.style.display = nextUrl && q.length === 0 ? "block" : "none";
  }
  render();
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
}

async function showNext(currentId) {

  let nextPokemon = cache.find(p => p.id === currentId + 1);

  if(!nextPokemon && nextUrl){
    await loadMore();
    nextPokemon = cache.find(p => p.id === currentId + 1);
  }

  if(nextPokemon){
    openDialog(nextPokemon.id);
  }
}

function showPrevious(currentId) {
  const prevPokemon = cache.find(p => p.id === currentId - 1);
  if (prevPokemon) openDialog(prevPokemon.id);
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
    e.clientX >= rect.left && e.clientX <= rect.right &&
    e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) closeDialog();
});