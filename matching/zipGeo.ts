import zipcodes from 'zipcodes';

export function getStateForZip(zip: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const record = zipcodes.lookup(zip);
  return record?.state ?? null;
}

export function distanceMilesBetweenZips(zipA: string, zipB: string): number | null {
  if (!/^\d{5}$/.test(zipA) || !/^\d{5}$/.test(zipB)) return null;
  const miles = zipcodes.distance(zipA, zipB);
  return typeof miles === 'number' && Number.isFinite(miles) ? miles : null;
}

export function isWithinMiles(zipA: string, zipB: string, miles: number): boolean {
  const distance = distanceMilesBetweenZips(zipA, zipB);
  return distance !== null && distance <= miles;
}

export function anyZipWithinMiles(userZip: string, therapistZips: string[], miles: number): boolean {
  return therapistZips.some((zip) => isWithinMiles(userZip, zip, miles));
}
