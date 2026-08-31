import { createApp, initializeApp } from "./app";

const { app, httpServer } = createApp();
let initialization: Promise<void> | undefined;

export default async function vercelHandler(req: any, res: any) {
  initialization ??= initializeApp(app, httpServer, { startBackgroundJobs: false });
  await initialization;
  return app(req, res);
}