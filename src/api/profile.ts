import { apiJson } from "./http";

export type UserProfile = {
  id: string;
  email: string;
  monthly_budget: string | null;
  default_currency: string | null;
  created_at: string;
  updated_at: string;
};

export function getProfile(accessToken: string): Promise<UserProfile> {
  return apiJson<UserProfile>("/auth/me", accessToken);
}
