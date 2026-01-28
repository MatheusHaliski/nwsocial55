"use server";

import { signupSchema, type SignupValues } from "./schema";

export type SignupResult = {
  success: boolean;
  message: string;
};

export async function submitSignup(
  values: SignupValues
): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields and try again.",
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    success: true,
    message: `Welcome, ${parsed.data.name}! Your account request is ready.`,
  };
}
