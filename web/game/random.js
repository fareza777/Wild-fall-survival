// A saved seed makes outcomes repeatable across previews, reloads, and Android.
export function random(state) {
  let n=state.seed|0;
  n^=n<<13;n^=n>>>17;n^=n<<5;
  state.seed=n>>>0;
  return state.seed/4294967296;
}
export const range=(state,min,max)=>min+Math.floor(random(state)*(max-min+1));
