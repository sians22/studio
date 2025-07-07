'use server';
/**
 * @fileOverview A conversational flow to create a delivery order using Genkit tools.
 *
 * - processChat - A function that processes the chat history and determines the next step.
 * - ConversationalOrderInput - The input type for the processChat function.
 * - ConversationalOrderOutput - The return type for the processChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { searchAddress } from './search-address';
import { calculateDeliveryPrice } from './calculate-delivery-price';
import type { CalculateDeliveryPriceInput, CalculateDeliveryPriceOutput } from './calculate-delivery-price';
import type { SearchAddressOutput } from './search-address';


// Schemas for Tools - defined locally to avoid 'use server' export issues

const AddressSuggestionSchema = z.object({
    address: z.string().describe('Полный текст адреса.'),
    coords: z.array(z.number()).length(2).describe('Координаты адреса [широта, долгота].')
});
const SearchAddressOutputSchema = z.array(AddressSuggestionSchema).describe('Список подходящих адресных предложений.');

const PricingTierSchemaForTools = z.object({
  range: z.string().describe('The distance range for this price tier (e.g., "0-3 km").'),
  price: z.number().describe('Цена для этого тарифа в рублях.'),
});

const CalculateDeliveryPriceInputSchema = z.object({
  pickupAddress: z.string().describe('Адрес, откуда будет осуществляться доставка.'),
  dropoffAddress: z.string().describe('Адрес, куда будет осуществляться доставка.'),
  pickupCoords: z.array(z.number()).length(2).describe('Координаты точки отправления [широта, долгота].'),
  dropoffCoords: z.array(z.number()).length(2).describe('Координаты точки доставки [широта, долгота].'),
  pricingTiers: z.array(PricingTierSchemaForTools).describe('Массив тарифных планов для расчета.'),
});

const CalculateDeliveryPriceOutputSchema = z.object({
  distanceKm: z.number().describe('Расстояние между точками отправления и доставки в километрах.'),
  priceTl: z.number().describe('Рассчитанная стоимость доставки в рублях.'),
  pricingDetails: z.string().describe('Подробности о том, как была рассчитана цена на основе тарифных планов.'),
});


// Define tools for the AI to use
const searchAddressTool = ai.defineTool(
  {
    name: 'searchAddress',
    description: 'Use this to find and validate a real-world address based on a user query. Returns a list of possible addresses.',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: SearchAddressOutputSchema,
  },
  async (input) => searchAddress(input)
);

const calculatePriceTool = ai.defineTool(
  {
    name: 'calculateDeliveryPrice',
    description: "Use this to calculate the delivery price and route after you have confirmed BOTH the pickup and dropoff addresses.",
    inputSchema: CalculateDeliveryPriceInputSchema,
    outputSchema: CalculateDeliveryPriceOutputSchema,
  },
  async (input) => calculateDeliveryPrice(input)
);


const ChatMessageSchema = z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
});

const PricingTierSchema = z.object({
  range: z.string().describe('The distance range for this price tier (e.g., "0-3 km").'),
  price: z.number().describe('Цена для этого тарифа в рублях.'),
});

// Input for the main conversational flow
const ConversationalOrderInputSchema = z.object({
  chatHistory: z.array(ChatMessageSchema).describe("The history of the conversation so far."),
  pricingTiers: z.array(PricingTierSchema).describe('The pricing tiers to use for calculation.'),
});
export type ConversationalOrderInput = z.infer<typeof ConversationalOrderInputSchema>;


// Final confirmed order data
const ConfirmedOrderDataSchema = z.object({
    pickupAddress: z.string(),
    dropoffAddress: z.string(),
    senderPhone: z.string(),
    receiverPhone: z.string(),
    description: z.string().optional(),
    distanceKm: z.number(),
    priceTl: z.number(),
});
export type ConfirmedOrderData = z.infer<typeof ConfirmedOrderDataSchema>;

// Output of the conversational flow
const ConversationalOrderOutputSchema = z.object({
  response: z.string().describe("The chatbot's next response to the user."),
  isComplete: z.boolean().describe("Set to true ONLY when the user has confirmed the final order."),
  orderData: ConfirmedOrderDataSchema.nullable().describe("The final order details, available only when the user confirms."),
});
export type ConversationalOrderOutput = z.infer<typeof ConversationalOrderOutputSchema>;


export async function processChat(input: ConversationalOrderInput): Promise<ConversationalOrderOutput> {
  return conversationalOrderFlow(input);
}


// The main prompt that drives the conversation
const conversationalPrompt = ai.definePrompt({
  name: 'conversationalOrderPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [searchAddressTool, calculatePriceTool],
  input: { schema: ConversationalOrderInputSchema },
  output: { schema: ConversationalOrderOutputSchema },
  prompt: `You are a friendly and professional AI assistant for a courier service in Russia. Your goal is to guide the user through creating a delivery order conversationally. Your first message should be a greeting like "Здравствуйте! Я помогу вам создать заказ на доставку. Сначала укажите, пожалуйста, адрес, откуда нужно забрать посылку."

  Follow these steps strictly:
  1.  **Greet the user** and ask for the pickup address.
  2.  **Validate Pickup Address:** When the user provides a pickup address, use the 'searchAddress' tool.
      *   If the tool returns one or more results, pick the most likely one, confirm it with the user (e.g., "Got it, picking up from [Full Address]. Where should I deliver to?"), and proceed.
      *   If the tool returns no results, say "I couldn't find that address. Could you please provide a more specific pickup address?" and wait for their reply.
  3.  **Validate Dropoff Address:** Once the pickup address is confirmed, ask for the dropoff address. When the user provides it, use the 'searchAddress' tool again.
      *   If the tool returns results, confirm the address.
      *   If not, say "I couldn't find the delivery address. Could you please provide a more specific one?"
  4.  **Calculate Price:** After confirming BOTH pickup and dropoff addresses, use the 'calculateDeliveryPrice' tool to get the distance and price. Inform the user of the price and distance.
  5.  **Collect Phone Numbers:** After telling them the price, ask for the sender's phone number. Once provided, ask for the receiver's phone number.
  6.  **Collect Description:** After getting both phone numbers, ask if there are any special instructions or a description for the order.
  7.  **Final Confirmation:** Once all information (pickup, dropoff, phones, description) is collected, present a clear summary of the entire order including the final price. Ask for their final confirmation (e.g., "Everything looks correct. Shall I place the order?").
  8.  **Complete Order:** If the user confirms, set 'isComplete' to true and fill 'orderData' with all the collected information. Your response should be a confirmation message like "Your order has been placed!".

  Analyze the provided 'chatHistory' to determine the current step of the process and what information you still need to collect. BE CONCISE and FRIENDLY. Speak in Russian.

  Conversation History:
  {{#each chatHistory}}
  - {{role}}: {{content}}
  {{/each}}
  `,
});


const conversationalOrderFlow = ai.defineFlow(
  {
    name: 'conversationalOrderFlow',
    inputSchema: ConversationalOrderInputSchema,
    outputSchema: ConversationalOrderOutputSchema,
  },
  async (input) => {
    const { output } = await conversationalPrompt(input);
    if (!output) {
      throw new Error("AI failed to generate a response.");
    }
    return output;
  }
);
