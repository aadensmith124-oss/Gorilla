// Keep admin requests on an explicit Vercel function route. The shared
// Express handler uses the original request URL to dispatch /api/admin/*.
export { default } from "../../server/vercel-handler.js";