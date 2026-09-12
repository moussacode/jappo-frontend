
export interface AuthResponse {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  emailVerified: boolean;
  token: string;
}