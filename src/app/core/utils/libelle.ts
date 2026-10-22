/**
 * Transforme une valeur d'énumération technique en libellé lisible :
 * « EN_PAUSE » → « En pause », « ACTIF » → « Actif ».
 */
export function humaniserEnum(valeur: string | null | undefined, defaut = '—'): string {
  if (!valeur) return defaut;
  const texte = valeur.replace(/_/g, ' ').toLowerCase().trim();
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
