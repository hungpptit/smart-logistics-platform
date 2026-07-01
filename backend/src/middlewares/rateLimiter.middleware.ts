import { Request, Response, NextFunction } from 'express';

interface ClientRequestData {
  count: number;
  resetTime: number;
}

const ipRequestMap = new Map<string, ClientRequestData>();

/**
 * Custom Rate Limiter Middleware
 * @param maxRequests Maximum number of requests allowed in the window
 * @param windowMs Time window in milliseconds
 */
export const rateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();
    
    const clientData = ipRequestMap.get(ip);

    if (!clientData || now > clientData.resetTime) {
      // New client or window expired, reset rate limit counter
      ipRequestMap.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
    } else {
      clientData.count++;
      if (clientData.count > maxRequests) {
        res.status(429).json({
          success: false,
          message: 'Bạn đã thực hiện quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau ít phút.',
        });
      } else {
        next();
      }
    }
  };
};
