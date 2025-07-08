'use server';
/**
 * @fileOverview Flow to get an address from coordinates using Google Maps Geocoding API (reverse geocoding).
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
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; 
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        console.error("Google Maps API key is not set in the .env file.");
        throw new Error("Ключ API Google Карт не настроен. Пожалуйста, убедитесь, что NEXT_PUBLIC_GOOGLE_MAPS_API_KEY задан в .env и имеет права на 'Geocoding API'.");
    }
    
    const [lat, lon] = coords;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}&language=ru&result_type=street_address|route|locality|political`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Error fetching from Google Geocoding API (reverse):', data.status, data.error_message);
        return null;
      }
      
      const firstResult = data.results?.[0];

      if (firstResult) {
        const address = firstResult.formatted_address;
        const location = firstResult.geometry?.location;
        if (!address || !location) return null;
        
        return { address, coords: [location.lat, location.lng] };
      }
      
      return null;
    } catch (error) {
      console.error('Error in reverseGeocodeFlow:', error);
      return null;
    }
  }
);
