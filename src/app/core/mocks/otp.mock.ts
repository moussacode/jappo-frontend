export interface SessionOtp {
  email: string;
  code: string;
  expiresAt: number;
  tentatives: number;
}