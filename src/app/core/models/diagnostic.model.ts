export interface DiagnosticOnboarding {
  id?: string;
  entrepreneurId: string;
  projetId?: string;
  secteurActivite: string;
  stadeMaturite: 'IDEE' | 'PROTOTYPE' | 'COMMERCIALISATION' | 'CROISSANCE';
  besoinsPrincipaux: string[]; // ex: ['PITCH', 'BMC', 'RECHERCHE_FINANCEMENT', 'JURIDIQUE']
  niveauExperience: 'DEBUTANT' | 'INTERMEDIAIRE' | 'EXPERIMENTE';
  descriptionDefiPrincipal?: string;
  dateSoumission?: string;
}

export interface SoumettreDiagnosticRequest {
  invitationToken?: string;
  secteurActivite: string;
  stadeMaturite: string;
  besoinsPrincipaux: string[];
  niveauExperience: string;
  descriptionDefiPrincipal?: string;
}