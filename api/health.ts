export default function healthHandler(_req: any, res: any) {
  return res.status(200).json({
    ok: true,
    service: "api",
  });
}