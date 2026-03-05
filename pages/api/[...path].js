/**
 * Catch-all Next.js API route that delegates every /api/* request to the
 * Express app. This is the most Vercel-compatible pattern — no custom
 * vercel.json builds/routes needed.
 *
 * Next.js body-parser is disabled so Express can parse the body itself.
 */
import app from "../../api/index";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default function handler(req, res) {
  // req.url already contains the full path (e.g. /api/auth/login)
  // so Express routing works without any modification.
  return app(req, res);
}
