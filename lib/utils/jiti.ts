import { createJiti } from 'jiti';
import { ctx } from '../runtime/ctx';

export const jiti = createJiti(ctx.cwd);
