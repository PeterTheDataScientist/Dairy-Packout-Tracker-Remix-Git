import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import type { Express, Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface User {
      id: number;
      name: string;
      email: string;
      role: "ADMIN" | "DATA_ENTRY";
    }
  }
}

export function setupAuth(app: Express) {
  const PgStore = connectPg(session);

  app.use(
    session({
      store: new PgStore({
        pool: pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "yomilk-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) return done(null, false, { message: "Invalid email" });

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return done(null, false, { message: "Invalid password" });

          if (user.active === false) return done(null, false, { message: "Account is deactivated" });

          return done(null, {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          });
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(null, false);
      done(null, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (err) {
      done(err);
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (req.user!.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}
