import { z } from 'zod';

export const ProductEntitySchema = z.object({
  key: z.string().describe('Product key'),
  name: z.string().describe('Product name'),
});

export const GetProductsResponseSchema = z.object({
  data: z.array(ProductEntitySchema),
});
