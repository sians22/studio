'use server';
/**
 * @fileOverview Flow to get an address from coordinates using Yandex Maps Geocoder (reverse geocoding).
 *
 * - getAddressFromCoords - A function that performs reverse geocoding.
 * - ReverseGeocodeInput - The input type for the getAddressFromCoords function.
 * - ReverseGeocodeOutput - The return type for the getAddressFromCoords function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ReverseGeocodeInputSchema = z.object({
  coords: z.array(z.number()).length(2).describe('Координаты для поиска адреса [широта, долгота].'),
});
export type ReverseGeocodeInput = z.infer<typeof ReverseGeocodeInputSchema>;

// The output will be a single address or null if not found
const ReverseGeocodeOutputSchema = z.object({
    address: z.string().describe('Полный текст адреса.'),
    coords: z.array(z.number()).length(2).describe('Координаты адреса [широта, долгота].')
}).nullable();
export type ReverseGeocodeOutput = z.infer<typeof ReverseGeocodeOutputSchema>;


export async function getAddressFromCoords(input: ReverseGeocodeInput): Promise<ReverseGeocodeOutput> {
  return reverseGeocodeFlow(input);
}

const reverseGeocodeFlow = ai.defineFlow(
  {
    name: 'reverseGeocodeFlow',
    inputSchema: ReverseGeocodeInputSchema,
    outputSchema: ReverseGeocodeOutputSchema,
  },
  async ({ coords }) => {
    // We use the main map API key as it's more likely to have Geocoding permissions.
    const apiKey = process.env.YANDEX_MAP_API_KEY; 
    if (!apiKey || apiKey === "ВАШ_API_КЛЮЧ_YANDEX_MAPS") {
        console.error("Yandex Geocoder API key is not set or is a placeholder in the .env file.");
        throw new Error("Ключ API Яндекс Карт не настроен. Пожалуйста, убедитесь, что YANDEX_MAP_API_KEY задан в .env.");
    }
    
    // Yandex geocoder expects lon,lat for coordinates
    const [lat, lon] = coords;
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${lon},${lat}&format=json&lang=ru_RU&results=1`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Error fetching from Yandex Geocoder (reverse):', response.statusText, await response.text());
        return null;
      }
      const data = await response.json();
      
      const featureMember = data.response?.GeoObjectCollection?.featureMember?.[0];

      if (featureMember) {
        const geoObject = featureMember.GeoObject;
        if (!geoObject) return null;
        
        const address = geoObject.metaDataProperty?.GeocoderMetaData?.text;
        const pos = geoObject.Point?.pos;
        if (!address || !pos) return null;
        
        const [resLon, resLat] = pos.split(' ').map(Number);
        return { address, coords: [resLat, resLon] };
      }
      
      return null;
    } catch (error) {
      console.error('Error in reverseGeocodeFlow:', error);
      return null;
    }
  }
);
