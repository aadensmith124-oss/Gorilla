import { createApp, initializeApp } from "./app.js";

const { app, httpServer } = createApp();
let initialization: Promise<void> | undefined;

export default async function vercelHandler(req: any, res: any) {
  initialization ??= initializeApp(app, httpServer, { startBackgroundJobs: false });
  try {
    await initialization;
  } catch (error) {
    initialization = undefined;
    console.error(
      "[vercel] application initialization failed:",
      error instanceof Error ? error.stack ?? error.message : error,
    );
    if (!res.headersSent) {
      return res.status(503).json({
        message: "Application initialization failed. Check the Vercel Function logs.",
        code: "APP_INITIALIZATION_FAILED",
      });
    }
    throw error;
  }
  return app(req, res);
}