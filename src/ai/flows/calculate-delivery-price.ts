'use server';

/**
 * @fileOverview Flow to calculate the delivery price based on the distance between pickup and drop-off locations.
 *
 * - calculateDeliveryPrice - A function that calculates the delivery price.
 * - CalculateDeliveryPriceInput - The input type for the calculateDeliveryPrice function.
 * - CalculateDeliveryPriceOutput - The return type for the calculateDeliveryPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PricingTierSchema = z.object({
  range: z.string().describe('The distance range for this price tier (e.g., "0-3 km").'),
  price: z.number().describe('The price for this tier in TL.'),
});

const CalculateDeliveryPriceInputSchema = z.object({
  pickupAddress: z.string().describe('Адрес, откуда будет осуществляться доставка.'),
  dropoffAddress: z.string().describe('Адрес, куда будет осуществляться доставка.'),
  pricingTiers: z.array(PricingTierSchema).describe('Массив тарифных планов для расчета.'),
});
export type CalculateDeliveryPriceInput = z.infer<typeof CalculateDeliveryPriceInputSchema>;

const CalculateDeliveryPriceOutputSchema = z.object({
  distanceKm: z.number().describe('Расстояние между точками отправления и доставки в километрах.'),
  priceTl: z.number().describe('Рассчитанная стоимость доставки в турецких лирах (TL).'),
  pricingDetails: z.string().describe('Подробности о том, как была рассчитана цена на основе тарифных планов.'),
});
export type CalculateDeliveryPriceOutput = z.infer<typeof CalculateDeliveryPriceOutputSchema>;

export async function calculateDeliveryPrice(input: CalculateDeliveryPriceInput): Promise<CalculateDeliveryPriceOutput> {
  return calculateDeliveryPriceFlow(input);
}

const calculateDeliveryPricePrompt = ai.definePrompt({
  name: 'calculateDeliveryPricePrompt',
  input: {schema: CalculateDeliveryPriceInputSchema},
  output: {schema: CalculateDeliveryPriceOutputSchema},
  prompt: `Вы — калькулятор стоимости доставки. Вы принимаете адрес отправления и адрес доставки в качестве входных данных, рассчитываете расстояние между ними, а затем рассчитываете стоимость доставки на основе предоставленных динамических тарифных планов.

Верните расстояние в километрах, рассчитанную цену в TL и краткое объяснение деталей ценообразования.

Адрес отправления: {{{pickupAddress}}}
Адрес доставки: {{{dropoffAddress}}}

Используйте эти тарифные планы для расчета:
{{#each pricingTiers}}
- {{this.range}}: {{this.price}} TL
{{/each}}
`,
});

const calculateDeliveryPriceFlow = ai.defineFlow(
  {
    name: 'calculateDeliveryPriceFlow',
    inputSchema: CalculateDeliveryPriceInputSchema,
    outputSchema: CalculateDeliveryPriceOutputSchema,
  },
  async input => {
    const {output} = await calculateDeliveryPricePrompt(input);
    return output!;
  }
);
