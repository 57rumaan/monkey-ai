import 'express';
import type { JwtPayload } from './types.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      validatedBody?: any;
      validatedQuery?: any;
      validatedParams?: any;
    }
  }
}
