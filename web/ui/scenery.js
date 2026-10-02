import { art } from './helpers.js';
export function landscape(biome,night=false){return art(`assets/art/locations/${biome}.webp`,`hero-art landscape-art ${night?'after-dark':''}`,`${biome} in Ashen Valley`,false);}
