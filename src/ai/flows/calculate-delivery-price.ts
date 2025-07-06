'use server';

/**
 * @fileOverview Flow to calculate the delivery price based on the distance between pickup and drop-off locations using Yandex Maps.
 *
 * - calculateDeliveryPrice - A function that calculates the delivery price.
 * - CalculateDeliveryPriceInput - The input type for the calculateDeliveryPrice function.
 * - CalculateDeliveryPriceOutput - The return type for the calculateDeliveryPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Helper function to geocode an address using Yandex Maps API
async function geocodeAddress(address: string): Promise<[number, number] | null> {
    const apiKey = process.env.YANDEX_API_KEY;
    if (!apiKey || apiKey === "ВАШ_API_КЛЮЧ_YANDEX_MAPS") {
        console.error("Yandex API key is not set or is a placeholder in the .env file.");
        throw new Error("Ключ API Яндекс не настроен. Пожалуйста, получите ключ и добавьте его в файл .env.");
    }
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(address)}&format=json&lang=ru_RU&results=1`;
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        const pos = data.response?.GeoObjectCollection?.featureMember[0]?.GeoObject?.Point?.pos;
        if (pos) {
            const [lon, lat] = pos.split(' ').map(Number);
            return [lon, lat];
        }
        return null;
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

// Helper function to get route distance from Yandex Maps Directions API
async function getRouteDistance(startCoords: [number, number], endCoords: [number, number]): Promise<number | null> {
    const apiKey = process.env.YANDEX_API_KEY;
     if (!apiKey || apiKey === "ВАШ_API_КЛЮЧ_YANDEX_MAPS") {
        console.error("Yandex API key is not set or is a placeholder in the .env file.");
        throw new Error("Ключ API Яндекс не настроен. Пожалуйста, получите ключ и добавьте его в файл .env.");
    }
    // Yandex Directions API expects lat,lon format for waypoints
    const waypoints = `${startCoords[1]},${startCoords[0]}|${endCoords[1]},${endCoords[0]}`;
    const url = `https://api.routing.yandex.net/v2/route?apikey=${apiKey}&waypoints=${waypoints}&mode=driving`;
     try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        const distanceMeters = data.routes?.[0]?.summary?.distance?.value;
        return distanceMeters ? distanceMeters / 1000 : null; // Convert meters to km
    } catch (error) {
        console.error("Routing error:", error);
        return null;
    }
}

const PricingTierSchema = z.object({
  range: z.string().describe('The distance range for this price tier (e.g., "0-3 km").'),
  price: z.number().describe('Цена для этого тарифа в рублях.'),
});

const CalculateDeliveryPriceInputSchema = z.object({
  pickupAddress: z.string().describe('Адрес, откуда будет осуществляться доставка.'),
  dropoffAddress: z.string().describe('Адрес, куда будет осуществляться доставка.'),
  pricingTiers: z.array(PricingTierSchema).describe('Массив тарифных планов для расчета.'),
});
export type CalculateDeliveryPriceInput = z.infer<typeof CalculateDeliveryPriceInputSchema>;

const CalculateDeliveryPriceOutputSchema = z.object({
  distanceKm: z.number().describe('Расстояние между точками отправления и доставки в километрах.'),
  priceTl: z.number().describe('Рассчитанная стоимость доставки в рублях.'),
  pricingDetails: z.string().describe('Подробности о том, как была рассчитана цена на основе тарифных планов.'),
});
export type CalculateDeliveryPriceOutput = z.infer<typeof CalculateDeliveryPriceOutputSchema>;

export async function calculateDeliveryPrice(input: CalculateDeliveryPriceInput): Promise<CalculateDeliveryPriceOutput> {
  return calculateDeliveryPriceFlow(input);
}

// The prompt input now includes the pre-calculated distance
const PricePromptInputSchema = CalculateDeliveryPriceInputSchema.extend({
    distanceKm: z.number().describe('Точное расстояние в километрах, рассчитанное по API.'),
});

const calculateDeliveryPricePrompt = ai.definePrompt({
  name: 'calculateDeliveryPricePrompt',
  input: {schema: PricePromptInputSchema},
  output: {schema: CalculateDeliveryPriceOutputSchema},
  prompt: `Вы — калькулятор стоимости доставки. Вам дано точное расстояние в километрах. Ваша задача — рассчитать стоимость доставки на основе предоставленных тарифных планов и вернуть подробное объяснение.

Адрес отправления: {{{pickupAddress}}}
Адрес доставки: {{{dropoffAddress}}}
Точное расстояние: {{{distanceKm}}} км

Используйте эти тарифные планы для расчета:
{{#each pricingTiers}}
- {{this.range}}: {{this.price}} руб.
{{/each}}

Верните расстояние (используйте предоставленное значение distanceKm), рассчитанную цену в рублях и краткое объяснение деталей ценообразования.
`,
});

const calculateDeliveryPriceFlow = ai.defineFlow(
  {
    name: 'calculateDeliveryPriceFlow',
    inputSchema: CalculateDeliveryPriceInputSchema,
    outputSchema: CalculateDeliveryPriceOutputSchema,
  },
  async input => {
    // 1. Geocode both addresses
    const pickupCoords = await geocodeAddress(input.pickupAddress);
    const dropoffCoords = await geocodeAddress(input.dropoffAddress);

    if (!pickupCoords || !dropoffCoords) {
        throw new Error('Не удалось геокодировать один или оба адреса.');
    }

    // 2. Get route distance
    const distanceKm = await getRouteDistance(pickupCoords, dropoffCoords);
    
    if (distanceKm === null) {
        throw new Error('Не удалось рассчитать расстояние маршрута.');
    }

    // 3. Call the LLM with the calculated distance
    const promptInput = { ...input, distanceKm: parseFloat(distanceKm.toFixed(2)) };
    const {output} = await calculateDeliveryPricePrompt(promptInput);
    
    if (!output) {
        throw new Error('Не удалось получить ответ от модели ИИ.');
    }
    
    // Ensure the output from the model respects the calculated distance
    return {
        ...output,
        distanceKm: promptInput.distanceKm,
    };
  }
);
