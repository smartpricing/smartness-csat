import { z } from 'zod';

export const ProductEntitySchema = z.object({
  key: z.string().describe('Product key'),
  name: z.string().describe('Product name'),
  created_at: z.string().describe('Created at'),
});

export const GetProductsResponseSchema = z.object({
  data: z.array(ProductEntitySchema),
});
