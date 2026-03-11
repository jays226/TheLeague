import { z } from "zod";

const uvaEmail = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .refine((value) => value.toLowerCase().endsWith("@virginia.edu"), {
    message: "Use a valid UVA email ending in @virginia.edu."
  });

export const signupSchema = z
  .object({
    teamName: z.string().trim().min(3).max(40),
    playerOneName: z.string().trim().min(2).max(40),
    playerOneEmail: uvaEmail,
    playerTwoName: z.string().trim().min(2).max(40),
    playerTwoEmail: uvaEmail,
    password: z.string().min(6, "Use a password with at least 6 characters.").max(72)
  })
  .refine((value) => value.playerOneEmail.toLowerCase() !== value.playerTwoEmail.toLowerCase(), {
    message: "Each player needs a different UVA email.",
    path: ["playerTwoEmail"]
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  teamName: z.string().trim().min(1, "Enter your team name."),
  password: z.string().min(1, "Enter your password.")
});
