function playPokemonCry(id){

  const cry = new Audio(
    `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`
  );

  cry.volume = 0.4;
  cry.play().catch(()=>{});

}