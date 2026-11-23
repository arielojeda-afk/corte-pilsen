import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';

import {
  createDbAdapter,
  hashPasscodeScrypt,
  SUPER_ADMIN_EMAIL,
  verifyPasscodeScrypt,
  type DayVoteKey,
} from './src/server/dbAdapter.ts';
import { VALID_CUT_IDS } from './src/server/seedData.ts';
import type {
  AdminAuthMode,
  CutId,
  ExperiencePost,
  GroupZoneFilter,
  ParrilleroProfile,
  UserRole,
} from './src/types.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

const db = createDbAdapter();
const activeAdminTokens = new Map<string, number>();

const VALID_AVATAR_STYLES = new Set<ParrilleroProfile['avatarStyle']>([
  'brasa',
  'chop',
  'estaca',
  'cuchillo',
]);

const VALID_GROUP_ZONES = new Set<Exclude<GroupZoneFilter, 'Todas'>>([
  'Asunción',
  'Gran Asunción',
  'Ciudad del Este',
  'Interior',
]);

const VALID_COOKING_POINTS = new Set<ExperiencePost['cookingPoint']>([
  'Jugoso',
  'A Punto',
  'Bien Cocido',
  'Vuelta y Vuelta',
]);

const VALID_DAY_KEYS = new Set<DayVoteKey>([
  'day1',
  'day2',
  'day3',
  'day4',
  'day5',
  'day6',
  'day7Tradicional',
  'day7Boss',
]);

interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
}

function sha256Hex(input: string): Buffer {
  return crypto.createHash('sha256').update(input).digest();
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  return crypto.timingSafeEqual(sha256Hex(a), sha256Hex(b));
}

function issueUserToken(user: ParrilleroProfile): string {
  const isSuper =
    user.role === 'superadmin' ||
    user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email.toLowerCase(),
    role: isSuper ? 'superadmin' : 'voter',
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const rawPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(rawPayload).digest('base64url');
  return `${rawPayload}.${sig}`;
}

function verifyUserToken(authHeader: string | undefined): SessionPayload | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return null;
  const rawPayload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(rawPayload).digest('base64url');
  if (!timingSafeCompareStrings(sig, expectedSig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(rawPayload, 'base64url').toString('utf-8')) as SessionPayload;
    if (!payload.userId || !payload.exp || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function issueAdminToken(): string {
  const now = Date.now();
  for (const [token, expiresAt] of activeAdminTokens.entries()) {
    if (expiresAt <= now) activeAdminTokens.delete(token);
  }
  const nonce = crypto.randomBytes(24).toString('hex');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(nonce).digest('hex');
  const token = `${nonce}.${sig}`;
  activeAdminTokens.set(token, now + TOKEN_TTL_MS);
  return token;
}

function verifyAdminToken(authHeader: string | undefined): { valid: boolean; token: string | null; isSuperAdmin?: boolean } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, token: null };
  }
  const token = authHeader.slice('Bearer '.length).trim();

  // Check if this is an authenticated superadmin user session
  const userSession = verifyUserToken(authHeader);
  if (userSession && (userSession.role === 'superadmin' || userSession.email === SUPER_ADMIN_EMAIL.toLowerCase())) {
    return { valid: true, token, isSuperAdmin: true };
  }

  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return { valid: false, token: null };

  const nonce = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(nonce).digest('hex');
  if (!timingSafeCompareStrings(sig, expectedSig)) {
    return { valid: false, token: null };
  }

  const expiresAt = activeAdminTokens.get(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    activeAdminTokens.delete(token);
    return { valid: false, token: null };
  }
  return { valid: true, token, isSuperAdmin: false };
}

async function getAuthMode(): Promise<AdminAuthMode> {
  if (process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0) {
    return 'env_passcode';
  }
  const hash = await db.getAdminPasscodeHash();
  return hash ? 'claimed_hash' : 'unclaimed';
}

function sanitizeImageInput(image: unknown): string | null {
  if (typeof image !== 'string') return null;
  const trimmed = image.trim();
  if (trimmed.startsWith('/src/assets/') || trimmed.startsWith('/assets/')) {
    if (trimmed.length <= 240 && !trimmed.includes('..')) return trimmed;
    return null;
  }
  const dataUriPattern = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
  if (dataUriPattern.test(trimmed) && trimmed.length <= 1_600_000) {
    return trimmed;
  }
  return null;
}

function getVisitorId(req: Request): string {
  const raw = req.header('x-visitor-id') ?? '';
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return cleaned || 'anon-visitor';
}

function getParrilleroId(req: Request): string | null {
  const session = verifyUserToken(req.header('authorization'));
  if (session?.userId) return session.userId;
  const raw = req.header('x-parrillero-id') ?? '';
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  return cleaned || null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const check = verifyAdminToken(req.header('authorization'));
  if (!check.valid) {
    res.status(401).json({ error: 'Sesión de administrador requerida o expirada.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      backendMode: db.backendMode,
      supabaseConfigured: db.supabaseConfigured,
      superAdmin: SUPER_ADMIN_EMAIL,
    });
  });

  // Public state hydration
  app.get('/api/state', async (req, res) => {
    try {
      const visitorId = getVisitorId(req);
      const parrilleroId = getParrilleroId(req);
      const state = await db.getPublicState(visitorId, parrilleroId);
      res.json(state);
    } catch (error) {
      console.error('Error loading public state:', error);
      res.status(500).json({ error: 'No pudimos cargar el estado de la parrilla.' });
    }
  });

  // User Auth: Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, phone, ci, city, favoriteCut, avatarStyle } = req.body ?? {};
      const cleanName = typeof name === 'string' ? name.trim() : '';
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const cleanPassword = typeof password === 'string' ? password.trim() : '';
      const cleanCity = typeof city === 'string' ? city.trim() : '';
      const cleanCut = typeof favoriteCut === 'string' ? favoriteCut.trim() : '';

      if (cleanName.length < 2 || cleanName.length > 60) {
        res.status(400).json({ error: 'Ingresá tu nombre o apodo parrillero (2 a 60 caracteres).' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        res.status(400).json({ error: 'Ingresá un correo electrónico válido.' });
        return;
      }
      if (cleanPassword.length < 6 || cleanPassword.length > 100) {
        res.status(400).json({
          error: 'La contraseña debe tener al menos 6 caracteres para proteger tu carnet.',
        });
        return;
      }
      if (cleanCity.length < 2 || cleanCity.length > 80) {
        res.status(400).json({ error: 'Indicá tu barrio o ciudad (2 a 80 caracteres).' });
        return;
      }
      if (!cleanCut || cleanCut.length > 60) {
        res.status(400).json({ error: 'Elegí tu corte favorito de la parrilla.' });
        return;
      }
      const safeAvatar = VALID_AVATAR_STYLES.has(avatarStyle) ? avatarStyle : 'brasa';
      const passwordHash = hashPasscodeScrypt(cleanPassword);

      const profile = await db.registerUser({
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        phone: typeof phone === 'string' ? phone.trim() : undefined,
        ci: typeof ci === 'string' ? ci.trim() : undefined,
        city: cleanCity,
        favoriteCut: cleanCut,
        avatarStyle: safeAvatar,
      });

      const token = issueUserToken(profile);
      const isAdmin = profile.role === 'superadmin' || cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
      if (isAdmin) {
        activeAdminTokens.set(token, Date.now() + TOKEN_TTL_MS);
      }

      res.status(201).json({
        profile,
        token,
        role: profile.role || 'voter',
        isAdmin,
      });
    } catch (error) {
      console.error('Registration error:', error);
      const msg = error instanceof Error ? error.message : 'No se pudo completar el registro.';
      res.status(400).json({ error: msg });
    }
  });

  // User Auth: Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const cleanPassword = typeof password === 'string' ? password.trim() : '';

      if (!cleanEmail || !cleanPassword) {
        res.status(400).json({ error: 'Ingresá tu correo y contraseña.' });
        return;
      }

      const user = await db.findUserByEmail(cleanEmail);
      if (!user) {
        res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        return;
      }

      let valid = false;
      if (user.passwordHash) {
        valid = verifyPasscodeScrypt(cleanPassword, user.passwordHash);
      }
      // Also allow admin passcode fallback if this is super admin
      if (!valid && (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase() || user.role === 'superadmin')) {
        const storedPasscodeHash = await db.getAdminPasscodeHash();
        if (storedPasscodeHash && verifyPasscodeScrypt(cleanPassword, storedPasscodeHash)) {
          valid = true;
        } else if (
          process.env.ADMIN_PASSCODE &&
          timingSafeCompareStrings(cleanPassword, process.env.ADMIN_PASSCODE.trim())
        ) {
          valid = true;
        }
      }

      if (!valid) {
        res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        return;
      }

      const { passwordHash: _p, ...profile } = user;
      const token = issueUserToken(profile);
      const isAdmin = profile.role === 'superadmin' || cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
      if (isAdmin) {
        activeAdminTokens.set(token, Date.now() + TOKEN_TTL_MS);
      }

      res.json({
        profile,
        token,
        role: profile.role || 'voter',
        isAdmin,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Error al iniciar sesión.' });
    }
  });

  // User Auth: Me / Verify current session
  app.get('/api/auth/me', async (req, res) => {
    try {
      const session = verifyUserToken(req.header('authorization'));
      if (!session) {
        res.json({ authenticated: false, profile: null });
        return;
      }
      const user = await db.findUserById(session.userId);
      if (!user) {
        res.json({ authenticated: false, profile: null });
        return;
      }
      const { passwordHash: _p, ...profile } = user;
      const isAdmin =
        profile.role === 'superadmin' ||
        profile.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      res.json({
        authenticated: true,
        profile,
        role: profile.role || 'voter',
        isAdmin,
      });
    } catch (error) {
      console.error('Auth me error:', error);
      res.status(500).json({ error: 'Error verificando sesión.' });
    }
  });

  // User Auth: Logout
  app.post('/api/auth/logout', (_req, res) => {
    res.json({ ok: true });
  });

  // Carnet / Voter registration (backward compatible)
  app.post('/api/registrations', async (req, res) => {
    try {
      const { existingId, name, city, favoriteCut, avatarStyle } = req.body ?? {};
      const cleanName = typeof name === 'string' ? name.trim() : '';
      const cleanCity = typeof city === 'string' ? city.trim() : '';
      const cleanCut = typeof favoriteCut === 'string' ? favoriteCut.trim() : '';

      if (cleanName.length < 2 || cleanName.length > 60) {
        res.status(400).json({ error: 'Ingresá tu nombre o apodo parrillero (2 a 60 caracteres).' });
        return;
      }
      if (cleanCity.length < 2 || cleanCity.length > 80) {
        res.status(400).json({ error: 'Indicá tu barrio o ciudad (2 a 80 caracteres).' });
        return;
      }
      if (!cleanCut || cleanCut.length > 60) {
        res.status(400).json({ error: 'Elegí tu corte favorito de la parrilla.' });
        return;
      }
      const safeAvatar = VALID_AVATAR_STYLES.has(avatarStyle) ? avatarStyle : 'brasa';

      const profile = await db.upsertRegistration({
        existingId: typeof existingId === 'string' ? existingId.trim() : null,
        name: cleanName,
        city: cleanCity,
        favoriteCut: cleanCut,
        avatarStyle: safeAvatar,
      });

      res.status(201).json({ profile });
    } catch (error) {
      console.error('Error registering parrillero:', error);
      res.status(500).json({ error: 'No se pudo guardar tu Carnet Parrillero.' });
    }
  });

  // Official tournament vote (strictly requires existing registered profile + open voting)
  app.post('/api/votes', async (req, res) => {
    try {
      const parrilleroId =
        (typeof req.body?.parrilleroId === 'string' ? req.body.parrilleroId.trim() : '') ||
        getParrilleroId(req);
      const dayKey = req.body?.dayKey as DayVoteKey;
      const cutId = req.body?.cutId as CutId;
      const bossChoice = (req.body?.bossChoice ?? null) as 'retador' | 'challenger' | null;

      if (!parrilleroId) {
        res.status(401).json({
          error: 'Debés registrarte con tu Carnet Parrillero antes de votar.',
        });
        return;
      }

      const reg = await db.getRegistrationById(parrilleroId);
      if (!reg) {
        res.status(401).json({
          error: 'Tu Carnet no figura registrado en la base. Registrate para habilitar el voto.',
        });
        return;
      }

      const publicState = await db.getPublicState(getVisitorId(req), parrilleroId);
      if (!publicState.settings.votingOpen) {
        res.status(403).json({
          error: 'Las votaciones del torneo están pausadas temporalmente por el administrador.',
        });
        return;
      }

      if (!VALID_DAY_KEYS.has(dayKey)) {
        res.status(400).json({ error: 'Llave del torneo inválida.' });
        return;
      }

      const existingVotes = await db.getUserDayVotes(parrilleroId);
      let validatedCutId: CutId = cutId;
      let validatedBossChoice: 'retador' | 'challenger' | null = null;

      if (dayKey === 'day1') {
        if (cutId !== 'costilla' && cutId !== 'tira_fina') {
          res.status(400).json({ error: 'Corte inválido para el Día 1 (Lunes).' });
          return;
        }
      } else if (dayKey === 'day2') {
        if (cutId !== 'vacio' && cutId !== 'entrana') {
          res.status(400).json({ error: 'Corte inválido para el Día 2 (Martes).' });
          return;
        }
      } else if (dayKey === 'day3') {
        if (cutId !== 'colita' && cutId !== 'bife_chorizo') {
          res.status(400).json({ error: 'Corte inválido para el Día 3 (Miércoles).' });
          return;
        }
      } else if (dayKey === 'day4') {
        if (cutId !== 'tapa' && cutId !== 'ojo_bife') {
          res.status(400).json({ error: 'Corte inválido para el Día 4 (Jueves).' });
          return;
        }
      } else if (dayKey === 'day5') {
        if (!existingVotes.day1 || !existingVotes.day2) {
          res.status(400).json({ error: 'Completá Lunes y Martes antes de votar la Semifinal A.' });
          return;
        }
        if (cutId !== existingVotes.day1 && cutId !== existingVotes.day2) {
          res.status(400).json({ error: 'Ese corte no clasificó a tu Semifinal A.' });
          return;
        }
      } else if (dayKey === 'day6') {
        if (!existingVotes.day3 || !existingVotes.day4) {
          res.status(400).json({ error: 'Completá Miércoles y Jueves antes de votar la Semifinal B.' });
          return;
        }
        if (cutId !== existingVotes.day3 && cutId !== existingVotes.day4) {
          res.status(400).json({ error: 'Ese corte no clasificó a tu Semifinal B.' });
          return;
        }
      } else if (dayKey === 'day7Tradicional') {
        if (!existingVotes.day5 || !existingVotes.day6) {
          res.status(400).json({ error: 'Completá ambas semifinales antes de la Final Tradicional.' });
          return;
        }
        if (cutId !== existingVotes.day5 && cutId !== existingVotes.day6) {
          res.status(400).json({ error: 'Ese corte no clasificó a tu Final Tradicional.' });
          return;
        }
      } else if (dayKey === 'day7Boss') {
        if (!existingVotes.day7Tradicional) {
          res.status(400).json({ error: 'Elegí primero tu campeón tradicional del domingo.' });
          return;
        }
        if (bossChoice !== 'retador' && bossChoice !== 'challenger') {
          res.status(400).json({ error: 'Elección final inválida.' });
          return;
        }
        validatedBossChoice = bossChoice;
        validatedCutId =
          bossChoice === 'retador' ? 'retador' : existingVotes.day7Tradicional;
      }

      if (!VALID_CUT_IDS.includes(validatedCutId)) {
        res.status(400).json({ error: 'Corte no reconocido.' });
        return;
      }

      await db.castVote({
        parrilleroId,
        dayKey,
        cutId: validatedCutId,
        bossChoice: validatedBossChoice,
      });

      const updatedState = await db.getPublicState(getVisitorId(req), parrilleroId);
      res.json(updatedState);
    } catch (error) {
      console.error('Error casting vote:', error);
      res.status(500).json({ error: 'No se pudo registrar tu voto oficial.' });
    }
  });

  // Postulate a friend group (max 10 friends)
  app.post('/api/groups', async (req, res) => {
    try {
      const visitorId = getVisitorId(req);
      const state = await db.getPublicState(visitorId, getParrilleroId(req));
      if (!state.settings.groupSubmissionsOpen) {
        res.status(403).json({
          error: 'La postulación de nuevos grupos está cerrada temporalmente por el administrador.',
        });
        return;
      }

      const { name, zone, neighborhood, captainName, members, favoriteCut, motto } = req.body ?? {};
      const cleanName = typeof name === 'string' ? name.trim() : '';
      const cleanNeighborhood = typeof neighborhood === 'string' ? neighborhood.trim() : '';
      const cleanCaptain = typeof captainName === 'string' ? captainName.trim() : '';
      const cleanCut = typeof favoriteCut === 'string' ? favoriteCut.trim() : '';
      const cleanMotto = typeof motto === 'string' ? motto.trim() : '';
      const cleanMembers = Array.isArray(members)
        ? members
            .filter((m): m is string => typeof m === 'string')
            .map((m) => m.trim())
            .filter(Boolean)
        : [];

      if (cleanName.length < 3 || cleanName.length > 70) {
        res.status(400).json({ error: 'El nombre del grupo debe tener entre 3 y 70 caracteres.' });
        return;
      }
      if (!VALID_GROUP_ZONES.has(zone)) {
        res.status(400).json({ error: 'Zona geográfica inválida.' });
        return;
      }
      if (cleanNeighborhood.length < 2 || cleanNeighborhood.length > 60) {
        res.status(400).json({ error: 'Indicá el barrio o ciudad de tu grupo.' });
        return;
      }
      if (cleanCaptain.length < 2 || cleanCaptain.length > 60) {
        res.status(400).json({ error: 'Indicá el nombre del capitán del grupo.' });
        return;
      }
      if (cleanMembers.length < 2 || cleanMembers.length > 10) {
        res.status(400).json({ error: 'El grupo debe tener entre 2 y 10 amigos como máximo.' });
        return;
      }
      if (!cleanCut || cleanCut.length > 60) {
        res.status(400).json({ error: 'Elegí el corte favorito del grupo.' });
        return;
      }
      if (cleanMotto.length < 8 || cleanMotto.length > 280) {
        res.status(400).json({ error: 'El lema debe tener entre 8 y 280 caracteres.' });
        return;
      }

      const group = await db.createFriendGroup({
        visitorId,
        name: cleanName,
        zone,
        neighborhood: cleanNeighborhood,
        captainName: cleanCaptain,
        members: cleanMembers,
        favoriteCut: cleanCut,
        motto: cleanMotto,
      });

      res.status(201).json({ group });
    } catch (error) {
      console.error('Error creating friend group:', error);
      res.status(500).json({ error: 'No se pudo postular el grupo.' });
    }
  });

  // Toggle group like
  app.post('/api/groups/:id/like', async (req, res) => {
    try {
      const ok = await db.toggleGroupLike(req.params.id, getVisitorId(req));
      if (!ok) {
        res.status(404).json({ error: 'Grupo no encontrado.' });
        return;
      }
      const state = await db.getPublicState(getVisitorId(req), getParrilleroId(req));
      res.json(state);
    } catch (error) {
      console.error('Error toggling group like:', error);
      res.status(500).json({ error: 'No se pudo actualizar el like del grupo.' });
    }
  });

  // Create experience post
  app.post('/api/posts', async (req, res) => {
    try {
      const visitorId = getVisitorId(req);
      const parrilleroId = getParrilleroId(req);
      const state = await db.getPublicState(visitorId, parrilleroId);
      if (!state.settings.wallPostingOpen) {
        res.status(403).json({
          error: 'Las publicaciones en el Muro están pausadas por el administrador.',
        });
        return;
      }

      const { caption, cookingPoint, image, authorRank } = req.body ?? {};
      const cleanCaption = typeof caption === 'string' ? caption.trim() : '';
      if (cleanCaption.length < 8 || cleanCaption.length > 600) {
        res.status(400).json({ error: 'La reseña debe tener entre 8 y 600 caracteres.' });
        return;
      }
      if (!VALID_COOKING_POINTS.has(cookingPoint)) {
        res.status(400).json({ error: 'Punto de cocción inválido.' });
        return;
      }
      const safeImage = sanitizeImageInput(image);
      if (!safeImage) {
        res.status(400).json({ error: 'Formato o tamaño de imagen no permitido.' });
        return;
      }

      const allowedRanks: ParrilleroProfile['rank'][] = [
        'Aprendiz de Fuego',
        'Asador de Domingo',
        'Maestro Parrillero Pilsen',
      ];
      const safeRank = allowedRanks.includes(authorRank)
        ? authorRank
        : state.profile?.rank ?? 'Aprendiz de Fuego';

      const post = await db.createPost({
        authorName: state.profile?.name ?? 'Parrillero Invitado',
        authorCity: state.profile?.city ?? 'Asunción, Paraguay',
        authorRank: safeRank,
        cookingPoint,
        caption: cleanCaption,
        image: safeImage,
      });

      res.status(201).json({ post });
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: 'No se pudo publicar en el Muro.' });
    }
  });

  // Toggle post fire
  app.post('/api/posts/:id/fire', async (req, res) => {
    try {
      const ok = await db.togglePostFire(req.params.id, getVisitorId(req));
      if (!ok) {
        res.status(404).json({ error: 'Publicación no encontrada.' });
        return;
      }
      const state = await db.getPublicState(getVisitorId(req), getParrilleroId(req));
      res.json(state);
    } catch (error) {
      console.error('Error toggling fire:', error);
      res.status(500).json({ error: 'No se pudo registrar tu fuego.' });
    }
  });

  // Add comment to post
  app.post('/api/posts/:id/comments', async (req, res) => {
    try {
      const visitorId = getVisitorId(req);
      const parrilleroId = getParrilleroId(req);
      const state = await db.getPublicState(visitorId, parrilleroId);
      if (!state.settings.wallPostingOpen) {
        res.status(403).json({
          error: 'Los comentarios del Muro están pausados por el administrador.',
        });
        return;
      }

      const cleanText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      if (cleanText.length < 1 || cleanText.length > 400) {
        res.status(400).json({ error: 'Escribí un comentario válido (máx. 400 caracteres).' });
        return;
      }

      const comment = await db.addComment({
        postId: req.params.id,
        author: state.profile?.name ?? 'Parrillero Invitado',
        text: cleanText,
      });

      if (!comment) {
        res.status(404).json({ error: 'Publicación no encontrada.' });
        return;
      }
      res.status(201).json({ comment });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'No se pudo guardar el comentario.' });
    }
  });

  // ==========================================================================
  // Admin Auth & Moderation Routes
  // ==========================================================================
  app.get('/api/admin/status', async (req, res) => {
    try {
      const authMode = await getAuthMode();
      const check = verifyAdminToken(req.header('authorization'));
      res.json({
        authMode,
        authenticated: check.valid,
        backendMode: db.backendMode,
        supabaseConfigured: db.supabaseConfigured,
        superAdminEmail: SUPER_ADMIN_EMAIL,
      });
    } catch (error) {
      console.error('Admin status error:', error);
      res.status(500).json({ error: 'Error consultando estado del administrador.' });
    }
  });

  app.post('/api/admin/claim', async (req, res) => {
    try {
      const authMode = await getAuthMode();
      if (authMode !== 'unclaimed') {
        res.status(409).json({
          error: 'La clave de administrador ya fue configurada. Iniciá sesión con tu clave.',
        });
        return;
      }

      const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
      if (passcode.length < 6 || passcode.length > 100) {
        res.status(400).json({
          error: 'Elegí una clave segura de al menos 6 caracteres.',
        });
        return;
      }

      const hash = hashPasscodeScrypt(passcode);
      await db.setAdminPasscodeHash(hash);
      const token = issueAdminToken();
      res.status(201).json({ token, authMode: 'claimed_hash' as AdminAuthMode });
    } catch (error) {
      console.error('Admin claim error:', error);
      res.status(500).json({ error: 'No se pudo configurar la clave de administrador.' });
    }
  });

  app.post('/api/admin/login', async (req, res) => {
    try {
      const { email, password, passcode } = req.body ?? {};
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const attemptPass =
        typeof password === 'string' && password.trim().length > 0
          ? password.trim()
          : typeof passcode === 'string'
            ? passcode.trim()
            : '';

      if (!attemptPass) {
        res.status(400).json({ error: 'Ingresá tu contraseña o clave de administrador.' });
        return;
      }

      let valid = false;
      // 1. Check Ariel Ojeda's user account
      if (!cleanEmail || cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
        const ariel = await db.findUserByEmail(SUPER_ADMIN_EMAIL);
        if (ariel && ariel.passwordHash && verifyPasscodeScrypt(attemptPass, ariel.passwordHash)) {
          valid = true;
        }
      }

      // 2. Check admin passcode
      if (!valid) {
        const authMode = await getAuthMode();
        if (authMode === 'env_passcode') {
          valid = timingSafeCompareStrings(attemptPass, process.env.ADMIN_PASSCODE!.trim());
        } else {
          const storedHash = await db.getAdminPasscodeHash();
          valid = Boolean(storedHash && verifyPasscodeScrypt(attemptPass, storedHash));
        }
      }

      if (!valid) {
        res.status(401).json({ error: 'Clave o contraseña de administrador incorrecta.' });
        return;
      }

      const token = issueAdminToken();
      res.json({
        token,
        authMode: await getAuthMode(),
        superAdminEmail: SUPER_ADMIN_EMAIL,
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: 'Error al iniciar sesión de administrador.' });
    }
  });

  app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
    try {
      const { newPassword } = req.body ?? {};
      const clean = typeof newPassword === 'string' ? newPassword.trim() : '';
      if (clean.length < 6 || clean.length > 100) {
        res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        return;
      }
      const newHash = hashPasscodeScrypt(clean);
      await db.changeAdminPassword(newHash);
      res.json({ ok: true, message: 'Contraseña de Super Administrador actualizada exitosamente.' });
    } catch (error) {
      console.error('Change admin password error:', error);
      res.status(500).json({ error: 'No se pudo actualizar la contraseña.' });
    }
  });

  app.get('/api/admin/export/voters.csv', requireAdmin, async (_req, res) => {
    try {
      const overview = await db.getAdminOverview();
      const csvRows = [
        'N° Carnet,Nombre,Email,Telefono,CI,Ciudad / Barrio,Corte Favorito,Rango,Votos Emitidos,Fecha Registro'
      ];
      for (const reg of overview.registrations) {
        const p = reg.profile;
        const escapeCsv = (val: string | undefined | null) => `"${(val || '').replace(/"/g, '""')}"`;
        csvRows.push([
          escapeCsv(p.memberNumber),
          escapeCsv(p.name),
          escapeCsv(p.email),
          escapeCsv(p.phone),
          escapeCsv(p.ci),
          escapeCsv(p.city),
          escapeCsv(p.favoriteCut),
          escapeCsv(p.rank),
          reg.votesCount,
          escapeCsv(p.createdAt),
        ].join(','));
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="padron-oficial-corte-pilsen.csv"');
      res.send('\uFEFF' + csvRows.join('\r\n'));
    } catch (error) {
      console.error('Export voters CSV error:', error);
      res.status(500).json({ error: 'No se pudo exportar el padrón de votantes.' });
    }
  });

  app.post('/api/admin/logout', requireAdmin, (req, res) => {
    const check = verifyAdminToken(req.header('authorization'));
    if (check.token) activeAdminTokens.delete(check.token);
    res.json({ ok: true });
  });

  app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
    try {
      const overview = await db.getAdminOverview();
      res.json(overview);
    } catch (error) {
      console.error('Admin overview error:', error);
      res.status(500).json({ error: 'No se pudo cargar el panel de administración.' });
    }
  });

  app.get('/api/admin/schema.sql', requireAdmin, async (_req, res) => {
    try {
      const schemaPath = path.resolve(process.cwd(), 'supabase', 'schema.sql');
      const sql = await fs.readFile(schemaPath, 'utf-8');
      res.json({ sql });
    } catch {
      res.status(404).json({ error: 'No se encontró supabase/schema.sql.' });
    }
  });

  app.patch('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const body = req.body ?? {};
      const patch: Record<string, unknown> = {};
      if (typeof body.votingOpen === 'boolean') patch.votingOpen = body.votingOpen;
      if (typeof body.groupSubmissionsOpen === 'boolean') {
        patch.groupSubmissionsOpen = body.groupSubmissionsOpen;
      }
      if (typeof body.wallPostingOpen === 'boolean') patch.wallPostingOpen = body.wallPostingOpen;
      if (typeof body.forceRevealed === 'boolean') patch.forceRevealed = body.forceRevealed;
      if (
        typeof body.challengerTargetIso === 'string' &&
        !Number.isNaN(Date.parse(body.challengerTargetIso))
      ) {
        patch.challengerTargetIso = body.challengerTargetIso;
      }

      const settings = await db.updateSettings(patch);
      res.json({ settings });
    } catch (error) {
      console.error('Admin settings error:', error);
      res.status(500).json({ error: 'No se pudo actualizar la configuración.' });
    }
  });

  app.delete('/api/admin/groups/:id', requireAdmin, async (req, res) => {
    try {
      const deleted = await db.deleteFriendGroup(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Postulación no encontrada.' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      console.error('Admin delete group error:', error);
      res.status(500).json({ error: 'No se pudo eliminar la postulación.' });
    }
  });

  app.delete('/api/admin/posts/:id', requireAdmin, async (req, res) => {
    try {
      const deleted = await db.deletePost(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Publicación no encontrada.' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      console.error('Admin delete post error:', error);
      res.status(500).json({ error: 'No se pudo eliminar la publicación.' });
    }
  });

  app.delete('/api/admin/posts/:postId/comments/:commentId', requireAdmin, async (req, res) => {
    try {
      const deleted = await db.deleteComment(req.params.postId, req.params.commentId);
      if (!deleted) {
        res.status(404).json({ error: 'Comentario no encontrado.' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      console.error('Admin delete comment error:', error);
      res.status(500).json({ error: 'No se pudo eliminar el comentario.' });
    }
  });

  app.delete('/api/admin/registrations/:id', requireAdmin, async (req, res) => {
    try {
      const deleted = await db.deleteRegistration(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Registro no encontrado.' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      console.error('Admin delete registration error:', error);
      res.status(500).json({ error: 'No se pudo eliminar el registro.' });
    }
  });

  app.post('/api/admin/votes/reset', requireAdmin, async (_req, res) => {
    try {
      const removed = await db.resetAllVotes();
      res.json({ ok: true, removed });
    } catch (error) {
      console.error('Admin reset votes error:', error);
      res.status(500).json({ error: 'No se pudieron reiniciar los votos.' });
    }
  });

  // Frontend middleware / static serving (solo cuando no corre como Serverless en Vercel)
  if (!process.env.VERCEL) {
    if (!IS_PROD) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distDir = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distDir));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`El Corte Pilsen server listening on http://0.0.0.0:${PORT} (${db.backendMode})`);
    });
  }

  return app;
}

export const appPromise = startServer();

if (!process.env.VERCEL) {
  appPromise.catch((err) => {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  });
}