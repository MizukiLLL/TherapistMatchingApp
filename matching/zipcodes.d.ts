declare module 'zipcodes' {
  export type ZipLookup = {
    zip: string;
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
  };

  export function lookup(zip: string | number): ZipLookup | undefined;
  export function distance(zipA: string | number, zipB: string | number): number | undefined;
  export function radius(zip: string | number, miles: number): string[];

  const _default: {
    lookup: typeof lookup;
    distance: typeof distance;
    radius: typeof radius;
  };
  export default _default;
}
