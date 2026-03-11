import { getExistingConflict } from "@/lib/db";
import type { SignupInput } from "@/lib/validation";

export async function ensureNoExistingTeam(input: SignupInput) {
  const conflict = await getExistingConflict({
    teamName: input.teamName.trim(),
    playerOneEmail: input.playerOneEmail.toLowerCase(),
    playerTwoEmail: input.playerTwoEmail.toLowerCase()
  });

  if (conflict) {
    throw new Error("That team name or one of those emails has already been used.");
  }
}
