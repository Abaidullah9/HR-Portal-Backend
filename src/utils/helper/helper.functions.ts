import jwt from "jsonwebtoken";

/**
 * The token records which session generation it belongs to. Bumping
 * `tokenVersion` on the user (password change, reset, deactivation) invalidates
 * every token minted before that moment, which a stateless JWT cannot do alone.
 */
const generateToken = (userId: string, tokenVersion = 0): string => {
  return jwt.sign(
    { userId, tokenVersion },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
};

export  {
    generateToken,
}