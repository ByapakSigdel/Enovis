import { Request } from "express";

export interface AuthPayload {
  userId: string;
  email: string;
  mode: string;
  enterpriseId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
  enterpriseId?: string;
  enterpriseRole?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
