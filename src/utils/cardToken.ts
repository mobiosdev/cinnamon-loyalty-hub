import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a 30-character random alphanumeric token
 */
export const generateCardToken = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 30; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Ensures that a member has a 30-character card token in the database.
 * If one already exists, it is returned.
 * If not, a new token is generated, stored in the database, and returned.
 */
export const ensureCardToken = async (memberId: string, currentToken?: string | null): Promise<string> => {
  if (currentToken && currentToken.length === 30) {
    return currentToken;
  }

  try {
    // Check database to see if the token is already populated
    const { data: member, error: fetchError } = await supabase
      .from("members")
      .select("card_token")
      .eq("id", memberId)
      .maybeSingle();

    if (!fetchError && member?.card_token && member.card_token.length === 30) {
      return member.card_token;
    }

    // Generate a new 30-character token
    const newToken = generateCardToken();

    // Update the member row in the database
    const { error: updateError } = await supabase
      .from("members")
      .update({ card_token: newToken })
      .eq("id", memberId);

    if (updateError) {
      console.error("Failed to update card token in database:", updateError);
    }

    return newToken;
  } catch (err) {
    console.error("Error in ensureCardToken:", err);
    // Return a newly generated token as a fallback so the flow doesn't crash
    return generateCardToken();
  }
};
