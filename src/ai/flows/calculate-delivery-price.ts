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
import type { PricingTier } from '@/context/pricing-context';


/**
 * Calculates the straight-line (haversine) distance between two points on Earth.
 * @param coords1 - [lat, lon] for the first point.
 * @param coords2 - [lat, lon] for the second point.
 * @returns The distance in kilometers.
 */
function haversineDistance(coords1: [number, number], coords2: [number, number]): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (coords2[0] - coords1[0]) * Math.PI / 180;
  const dLon = (coords2[1] - coords1[1]) * Math.PI / 180;
  const lat1 = coords1[0] * Math.PI / 180;
  const lat2 = coords2[0] * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


// Helper function to get route distance from Yandex Maps Directions API
async function getRouteDistance(startCoords: [number, number], endCoords: [number, number]): Promise<{distance: number, isEstimate: boolean}> {
    const apiKey = process.env.YANDEX_ROUTING_API_KEY; // Use the dedicated, server-side routing key
    
    // If no routing key is provided, fall back to an estimated straight-line distance
    if (!apiKey || apiKey === "YOUR_YANDEX_ROUTING_API_KEY_HERE") {
        console.warn("Yandex ROUTING API key is not set. Falling back to straight-line distance calculation.");
        // A common "circuity factor" is between 1.1 and 1.5. Let's use 1.3 to make it more realistic.
        const distance = haversineDistance(startCoords, endCoords) * 1.3; 
        return { distance: distance, isEstimate: true };
    }

    const waypoints = `${startCoords[1]},${startCoords[0]}|${endCoords[1]},${endCoords[0]}`;
    const url = `https://api.routing.yandex.net/v2/route?apikey=${apiKey}&waypoints=${waypoints}&mode=driving`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("Yandex Directions API error response:", JSON.stringify(data, null, 2));
             if(response.status === 401) {
                throw new Error("Ошибка аутентификации (401). Ваш ключ API для маршрутов (YANDEX_ROUTING_API_KEY) недействителен или у него нет доступа к 'Directions API'. Пожалуйста, проверьте в Кабинете разработчика Яндекс, что для вашего ключа подключен сервис 'Directions API'.");
            }
            if(response.status === 403) {
                throw new Error("Ошибка доступа к API Маршрутов (403). Убедитесь, что ваш ключ (YANDEX_ROUTING_API_KEY) имеет права на 'Directions API' в кабинете разработчика Яндекс.");
            }
             if (response.status === 404 && data?.message?.includes("point not found")) {
                throw new Error("Ошибка 404: Не удалось найти одну из точек на дороге. Попробуйте выбрать точки ближе к проезжей части.");
            }
            const errorMessage = data?.message || `Ошибка API Яндекс Маршрутов: ${response.status}.`;
            throw new Error(errorMessage);
        }

        const route = data.routes?.[0];
        if (!route) {
          console.error("Yandex API did not return a route. Full response:", JSON.stringify(data, null, 2));
           if (data?.message) {
               throw new Error(`Маршрут не найден: ${data.message}. Попробуйте другие адреса.`);
           }
          throw new Error("Маршрут не найден. Возможно, между точками нет автомобильной дороги. Пожалуйста, выберите другие адреса.");
        }
        
        const distanceMeters = route.summary?.distance?.value;
        return { distance: distanceMeters ? distanceMeters / 1000 : 0, isEstimate: false };
    } catch (error) {
        console.error("Routing error:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Неизвестная ошибка при построении маршрута.");
    }
}

const CalculateDeliveryPriceInputSchema = z.object({
  pickupAddress: z.string().describe('Адрес, откуда будет осуществляться доставка.'),
  dropoffAddress: z.string().describe('Адрес, куда будет осуществляться доставка.'),
  pickupCoords: z.array(z.number()).length(2).describe('Координаты точки отправления [широта, долгота].'),
  dropoffCoords: z.array(z.number()).length(2).describe('Координаты точки доставки [широта, долгота].'),
  pricingTiers: z.array(z.object({
    range: z.string().describe('The distance range for this price tier (e.g., "0-3 km").'),
    price: z.number().describe('Цена для этого тарифа в рублях.'),
  })).describe('Массив тарифных планов для расчета.'),
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

/**
 * Parses a range string like "0-3 km" or "10+ km" into a [min, max] tuple.
 * @param rangeStr The string to parse.
 * @returns A tuple [min, max].
 */
function parseRange(rangeStr: string): [number, number] {
    const cleaned = rangeStr.replace(/km|\s/g, '');
    if (cleaned.includes('+')) {
        return [parseFloat(cleaned.replace('+', '')), Infinity];
    }
    if (cleaned.includes('-')) {
        const parts = cleaned.split('-');
        return [parseFloat(parts[0]), parseFloat(parts[1])];
    }
    const num = parseFloat(cleaned);
    return [num, num];
}

const calculateDeliveryPriceFlow = ai.defineFlow(
  {
    name: 'calculateDeliveryPriceFlow',
    inputSchema: CalculateDeliveryPriceInputSchema,
    outputSchema: CalculateDeliveryPriceOutputSchema,
  },
  async input => {
    const pickupCoords = input.pickupCoords as [number, number];
    const dropoffCoords = input.dropoffCoords as [number, number];

    if (!pickupCoords || !dropoffCoords) {
        throw new Error('Не удалось получить координаты для одного или обоих адресов.');
    }

    const { distance: rawDistanceKm, isEstimate } = await getRouteDistance(pickupCoords, dropoffCoords);
    
    const distanceKm = parseFloat(rawDistanceKm.toFixed(2));

    // --- Price calculation logic ---
    let calculatedPrice = 0;
    let matchedTier: PricingTier | null = null;

    const sortedTiers = [...input.pricingTiers].sort((a, b) => parseRange(a.range)[0] - parseRange(b.range)[0]);

    for (const tier of sortedTiers) {
        const [min, max] = parseRange(tier.range);
        if (distanceKm >= min && distanceKm <= max) {
            calculatedPrice = tier.price;
            matchedTier = tier as PricingTier;
            break;
        }
    }
    
    let pricingDetails = '';

    if (isEstimate) {
        pricingDetails += '(Приблизительно) ';
    }

    if (matchedTier) {
        pricingDetails += `Расстояние ${distanceKm} км соответствует тарифу "${matchedTier.range}", поэтому стоимость составляет ${calculatedPrice} руб.`;
    } else {
         const highestTier = sortedTiers[sortedTiers.length - 1];
        if (highestTier) {
            calculatedPrice = highestTier.price;
            pricingDetails += `Расстояние ${distanceKm} км превышает максимальный тариф, применяется цена "${highestTier.range}": ${calculatedPrice} руб.`;
        } else {
             pricingDetails += 'Для данного расстояния не найден подходящий тариф.';
        }
    }
    
    return {
        distanceKm: distanceKm,
        priceTl: calculatedPrice,
        pricingDetails: pricingDetails,
    };
  }
);
