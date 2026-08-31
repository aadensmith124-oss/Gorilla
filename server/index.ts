import { createApp, initializeApp } from "./app";
import { serveStatic } from "./static";

const { app, httpServer } = createApp();

(async () => {
  await initializeApp(app, httpServer);

  // Set up Vite in development and serve the compiled client in production.
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    console.log(`[express] serving on port ${port}`);
  });

  const shutdown = () => {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});