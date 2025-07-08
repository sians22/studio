'use server';

/**
 * @fileOverview Flow to calculate the delivery price based on the distance between pickup and drop-off locations using Google Maps.
 *
 * - calculateDeliveryPrice - A function that calculates the delivery price.
 * - CalculateDeliveryPriceInput - The input type for the calculateDeliveryPrice function.
 * - CalculateDeliveryPriceOutput - The return type for the calculateDeliveryPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { PricingTier } from '@/context/pricing-context';

// Function to decode Google's encoded polyline format
function decode(encoded: string): number[][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: number[][] = [];
  let shift = 0;
  let result = 0;
  let byte: number;
  let latitude_change: number;
  let longitude_change: number;

  while (index < encoded.length) {
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude_change = (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude_change = (result & 1) ? ~(result >> 1) : (result >> 1);

    lat += latitude_change;
    lng += longitude_change;
    coordinates.push([lat / 1e5, lng / 1e5]);
  }
  return coordinates;
}


// Helper function to get route distance from Google Maps Directions API
async function getGoogleRoute(startCoords: [number, number], endCoords: [number, number]): Promise<{ distance: number; geometry: number[][] }> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
        console.error("Google API key is not set. Routing is not possible.");
        throw new Error("Ключ API Google Карт не настроен. Пожалуйста, убедитесь, что NEXT_PUBLIC_GOOGLE_MAPS_API_KEY задан в переменных окружения вашего хостинга и имеет права на 'Directions API'.");
    }

    const origin = `${startCoords[0]},${startCoords[1]}`;
    const destination = `${endCoords[0]},${endCoords[1]}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}&language=ru`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
            console.error("Google Directions API error response:", JSON.stringify(data, null, 2));
            if (data.status === 'REQUEST_DENIED') {
                 throw new Error("Ошибка API Google Маршрутов. Похоже, ваш API-ключ недействителен или у него нет прав на 'Directions API'. Пожалуйста, перейдите в Google Cloud Console, выберите ваш проект и убедитесь, что сервис 'Directions API' для него включен.");
            }
             if (data.status === 'NOT_FOUND' || data.status === 'ZERO_RESULTS') {
                throw new Error("Маршрут не найден. Возможно, между точками нет автомобильной дороги. Пожалуйста, выберите другие адреса.");
            }
            const errorMessage = data.error_message || `Неизвестная ошибка от API Google Маршрутов (Статус: ${data.status}).`;
            throw new Error(errorMessage);
        }

        const route = data.routes?.[0];
        if (!route || !route.legs?.[0]) {
          console.error("Google API did not return a valid route. Full response:", JSON.stringify(data, null, 2));
          throw new Error("Маршрут не найден. Пожалуйста, попробуйте другие адреса.");
        }
        
        const distanceMeters = route.legs[0].distance.value;
        const encodedPolyline = route.overview_polyline.points;
        const geometry = decode(encodedPolyline);

        return { distance: distanceMeters / 1000, geometry };
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
  routeGeometry: z.array(z.array(z.number())).describe('Геометрия маршрута для отрисовки на карте.'),
});
export type CalculateDeliveryPriceOutput = z.infer<typeof CalculateDeliveryPriceOutputSchema>;


export async function calculateDeliveryPrice(input: CalculateDeliveryPriceInput): Promise<CalculateDeliveryPriceOutput> {
  return calculateDeliveryPriceFlow(input);
}

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

    const { distance: rawDistanceKm, geometry } = await getGoogleRoute(pickupCoords, dropoffCoords);
    
    const distanceKm = parseFloat(rawDistanceKm.toFixed(2));

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
        routeGeometry: geometry,
    };
  }
);
