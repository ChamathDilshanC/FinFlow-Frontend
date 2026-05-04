export type AuthSessionResponse = {
  access_token: string | null;
  refresh_token: string | null;
  expires_in: number | null;
  token_type: string;
  requires_email_confirmation: boolean;
  user_id: string;
  email: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
