// Swappable RNG so headless tests can run the simulation deterministically.
let source: () => number = Math.random;

export const setRandom = (fn: () => number): void => {
  source = fn;
};
export const random = (): number => source();
export const rand = (a: number, b: number): number => a + random() * (b - a);
export const chance = (p: number): boolean => random() < p;
export const randInt = (n: number): number => Math.floor(random() * n);
export const pickOne = <T>(arr: readonly T[]): T => arr[randInt(arr.length)] as T;
