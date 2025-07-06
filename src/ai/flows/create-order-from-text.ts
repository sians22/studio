'use server';
/**
 * @fileOverview Flow to create a delivery order from a natural language text string using Gemini.
 *
 * - createOrderFromText - A function that processes a text query to generate a complete order proposal.
 * - CreateOrderFromTextInput - The input type for the function.
 * - CreateOrderFromTextOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {searchAddress} from './search-address';
import {calculateDeliveryPrice} from './calculate-delivery-price';
import type {PricingTier} from '@/context/pricing-context';

// Schema for the data extracted by the initial prompt
const ExtractedInfoSchema = z.object({
  pickupAddressQuery: z.string().describe('The pickup location extracted from the text. Example: "Таксим" or "улица Истикляль, 12"'),
  dropoffAddressQuery: z.string().describe('The dropoff location extracted from the text. Example: "Галатская башня"'),
  senderPhone: z.string().optional().describe('The phone number of the sender.'),
  receiverPhone: z.string().optional().describe('The phone number of the receiver.'),
  description: z.string().optional().describe('Any additional notes or description for the delivery.'),
});

const PricingTierSchema = z.object({
  range: z.string().describe('The distance range for this price tier (e.g., "0-3 km").'),
  price: z.number().describe('Цена для этого тарифа в рублях.'),
});


// Input for the main flow
const CreateOrderFromTextInputSchema = z.object({
  query: z.string().describe('The user\'s delivery request in natural language.'),
  pricingTiers: z.array(PricingTierSchema).describe('The pricing tiers to use for calculation.'),
});
export type CreateOrderFromTextInput = z.infer<typeof CreateOrderFromTextInputSchema>;

// Final output of the flow, ready to be confirmed by the user
const CreateOrderFromTextOutputSchema = z.object({
    pickupAddress: z.string(),
    dropoffAddress: z.string(),
    senderPhone: z.string().optional(),
    receiverPhone: z.string().optional(),
    description: z.string().optional(),
    distanceKm: z.number(),
    priceTl: z.number(),
    pricingDetails: z.string(),
    routeGeometry: z.array(z.array(z.number())),
});
export type CreateOrderFromTextOutput = z.infer<typeof CreateOrderFromTextOutputSchema>;

export async function createOrderFromText(input: CreateOrderFromTextInput): Promise<CreateOrderFromTextOutput> {
  return createOrderFromTextFlow(input);
}

// Prompt to extract structured information from the user's text
const extractionPrompt = ai.definePrompt({
    name: 'orderExtractionPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: z.object({ query: z.string() }) },
    output: { schema: ExtractedInfoSchema },
    prompt: `You are an intelligent order processing agent for a courier service based in Russia. Your task is to extract delivery details from a user's request in Russian.
    The user's request is: "{{query}}"

    Carefully analyze the text and extract the following information:
    - pickupAddressQuery: The starting point for the delivery. This should be a real-world place, like a street address, a landmark, or a well-known location. (e.g., "проспект Путина, 1", "мечеть Сердце Чечни", "ТРЦ Грозный Молл").
    - dropoffAddressQuery: The destination for the delivery. This should also be a real-world place.
    - senderPhone: The phone number of the person sending the package.
    - receiverPhone: The phone number of the person receiving the package.
    - description: Any other relevant details or notes for the courier.

    Be very precise with the addresses. If an address seems vague or nonsensical (like "Ftc"), try to find the most plausible real address mentioned in the text. If no valid address can be identified, leave the field empty.
    `,
});


const createOrderFromTextFlow = ai.defineFlow(
  {
    name: 'createOrderFromTextFlow',
    inputSchema: CreateOrderFromTextInputSchema,
    outputSchema: CreateOrderFromTextOutputSchema,
  },
  async (input) => {
    // Step 1: Extract information using Gemini
    const { output: extractedInfo } = await extractionPrompt({ query: input.query });

    if (!extractedInfo) {
        throw new Error('Не удалось извлечь информацию из вашего запроса. Пожалуйста, попробуйте сформулировать его иначе.');
    }
    
    if (!extractedInfo.pickupAddressQuery || !extractedInfo.dropoffAddressQuery) {
        throw new Error('Не удалось определить адрес отправления или назначения. Пожалуйста, укажите оба адреса в запросе.');
    }

    // Step 2: Find coordinates for the extracted addresses using our search flow
    const [pickupResults, dropoffResults] = await Promise.all([
        searchAddress({ query: extractedInfo.pickupAddressQuery }),
        searchAddress({ query: extractedInfo.dropoffAddressQuery }),
    ]);

    const pickup = pickupResults[0];
    const dropoff = dropoffResults[0];

    if (!pickup) {
        throw new Error(`Не удалось найти адрес отправления: "${extractedInfo.pickupAddressQuery}". Попробуйте указать более точный адрес.`);
    }
    if (!dropoff) {
        throw new Error(`Не удалось найти адрес назначения: "${extractedInfo.dropoffAddressQuery}". Попробуйте указать более точный адрес.`);
    }

    // Step 3: Calculate the route and price using the validated addresses
    const priceInfo = await calculateDeliveryPrice({
        pickupAddress: pickup.address,
        dropoffAddress: dropoff.address,
        pickupCoords: pickup.coords,
        dropoffCoords: dropoff.coords,
        pricingTiers: input.pricingTiers,
    });

    // Step 4: Assemble the final order object
    return {
        pickupAddress: pickup.address,
        dropoffAddress: dropoff.address,
        senderPhone: extractedInfo.senderPhone,
        receiverPhone: extractedInfo.receiverPhone,
        description: extractedInfo.description,
        distanceKm: priceInfo.distanceKm,
        priceTl: priceInfo.priceTl,
        pricingDetails: priceInfo.pricingDetails,
        routeGeometry: priceInfo.routeGeometry,
    };
  }
);
