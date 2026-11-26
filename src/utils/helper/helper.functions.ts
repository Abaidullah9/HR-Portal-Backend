import jwt from "jsonwebtoken";

/**
 * The token records which session generation it belongs to. Bumping
 * `tokenVersion` on the user (password change, reset, deactivation) invalidates
 * every token minted before that moment, which a stateless JWT cannot do alone.
 */
const generateToken = (userId: string, tokenVersion = 0): string => {
  // The JWT and the cookie must expire together; both read SESSION_DAYS so a
  // deployment-wide lifetime change cannot leave one of them behind.
  const days = Number(process.env.SESSION_DAYS || 7);
  const lifetime = Number.isFinite(days) && days > 0 ? days : 7;

  return jwt.sign(
    { userId, tokenVersion },
    process.env.JWT_SECRET!,
    { expiresIn: `${lifetime}d` }
  );
};

export  {
    generateToken,
}