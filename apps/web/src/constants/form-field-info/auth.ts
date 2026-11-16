import { SHARED_FORM_FIELD_INFO } from "@/constants/form-field-info/shared";

export const AUTH_FORM_FIELD_INFO = {
  loginEmail: SHARED_FORM_FIELD_INFO.email,
  loginPassword: "Password for your CollabDesk account.",
  registerName: SHARED_FORM_FIELD_INFO.name,
  registerEmail: SHARED_FORM_FIELD_INFO.email,
  registerPassword: SHARED_FORM_FIELD_INFO.password,
} as const;
