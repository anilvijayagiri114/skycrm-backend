import { createLog } from "../services/logService.js";

export function loggerMiddleware(req, res, next) {
  const originalJson = res.json;

  // wrap res.json to capture response body
  res.json = function (body) {
    res._logBody = body;
    return originalJson.call(this, body);
  };

  res.on("finish", async () => {
    if (req.shouldLog || req.logInfo) {
      const level =
        res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
          ? "warn"
          : "info";

      await createLog({
        level,
        statusCode: res.statusCode,
        message:
          req.logInfo?.message ||
          req.logInfo?.error ||
          res._logBody?.message ||
          res._logBody?.error ||
          `${req.method} ${req.originalUrl}`,
        user: req.user? req.user?.email : "system",
        role: req.user?  req.user?.roleName : "No Role",
        target: req.logInfo?.target || res._logBody?.target || null,
        source: "backend",
        meta: { endpoint: req.originalUrl, method: req.method },
      });
    }
  });

  next();
}
