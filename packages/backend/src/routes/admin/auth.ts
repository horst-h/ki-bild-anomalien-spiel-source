import { Router } from "express";
import { z } from "zod";

export const adminAuthRouter = Router();

const LoginSchema = z.object({
  password: z.string().min(1),
});

adminAuthRouter.post("/login", (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Passwort fehlt" });
    return;
  }

  const expected = process.env.ADMIN_PASSWORD ?? "changeme";
  if (parsed.data.password !== expected) {
    res.status(401).json({ error: "Falsches Passwort" });
    return;
  }

  (req as any).session.isAdmin = true;
  res.json({ status: "ok" });
});

adminAuthRouter.post("/logout", (req, res) => {
  (req as any).session = null;
  res.json({ status: "ok" });
});
