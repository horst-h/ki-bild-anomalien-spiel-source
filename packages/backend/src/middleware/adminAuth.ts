import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // cookie-session legt die Session direkt unter req.session ab
  const session = (req as any).session;
  if (!session?.isAdmin) {
    res.status(401).json({ error: "Nicht angemeldet" });
    return;
  }
  next();
}
