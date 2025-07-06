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

const CalculateDeliveryPriceInputSchema = z.object({
  pickupAddress: z.string().describe('The address where the delivery will be picked up from.'),
  dropoffAddress: z.string().describe('The address where the delivery will be dropped off at.'),
});
export type CalculateDeliveryPriceInput = z.infer<typeof CalculateDeliveryPriceInputSchema>;

const CalculateDeliveryPriceOutputSchema = z.object({
  distanceKm: z.number().describe('The distance between the pickup and drop-off locations in kilometers.'),
  priceTl: z.number().describe('The calculated delivery price in Turkish Lira (TL).'),
  pricingDetails: z.string().describe('Details of how the pricing was calculated based on distance tiers.'),
});
export type CalculateDeliveryPriceOutput = z.infer<typeof CalculateDeliveryPriceOutputSchema>;

export async function calculateDeliveryPrice(input: CalculateDeliveryPriceInput): Promise<CalculateDeliveryPriceOutput> {
  return calculateDeliveryPriceFlow(input);
}

const calculateDeliveryPricePrompt = ai.definePrompt({
  name: 'calculateDeliveryPricePrompt',
  input: {schema: CalculateDeliveryPriceInputSchema},
  output: {schema: CalculateDeliveryPriceOutputSchema},
  prompt: `You are a delivery price calculator. You take the pickup address and drop-off address as input, calculate the distance between them, and then calculate the delivery price based on the following pricing tiers:

- 0-3 km: 10 TL
- 3-5 km: 20 TL
- 5-10 km: 30 TL
- 10+ km: 50 TL

Return the distance in kilometers, the calculated price in TL, and a brief explanation of the pricing details.

Pickup Address: {{{pickupAddress}}}
Drop-off Address: {{{dropoffAddress}}}`,
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
