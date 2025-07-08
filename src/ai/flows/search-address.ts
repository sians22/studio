'use server';
/**
 * @fileOverview Flow to search for an address using Google Maps Geocoding API.
 *
 * - searchAddress - A function that searches for an address.
 * - SearchAddressInput - The input type for the searchAddress function.
 * - SearchAddressOutput - The return type for the searchAddress function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SearchAddressInputSchema = z.object({
  query: z.string().describe('Адресный запрос для поиска.'),
});
export type SearchAddressInput = z.infer<typeof SearchAddressInputSchema>;

const AddressSuggestionSchema = z.object({
    address: z.string().describe('Полный текст адреса.'),
    coords: z.array(z.number()).length(2).describe('Координаты адреса [широта, долгота].'),
    kind: z.string().optional().describe('Тип объекта (например, house, street).')
});

const SearchAddressOutputSchema = z.array(AddressSuggestionSchema).describe('Список подходящих адресных предложений.');
export type SearchAddressOutput = z.infer<typeof SearchAddressOutputSchema>;

export async function searchAddress(input: SearchAddressInput): Promise<SearchAddressOutput> {
  return searchAddressFlow(input);
}

const searchAddressFlow = ai.defineFlow(
  {
    name: 'searchAddressFlow',
    inputSchema: SearchAddressInputSchema,
    outputSchema: SearchAddressOutputSchema,
  },
  async ({ query }) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        console.error("Google Maps API key is not set in the .env file.");
        throw new Error("Ключ API Google Карт не настроен. Пожалуйста, убедитесь, что NEXT_PUBLIC_GOOGLE_MAPS_API_KEY задан в .env и имеет права на 'Geocoding API'.");
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=ru`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Error fetching from Google Geocoding API:', data.status, data.error_message);
        throw new Error(data.error_message || `Ошибка API Google Карт: ${data.status}`);
      }

      if (data.results) {
        return data.results.map((item: any) => {
          const location = item.geometry?.location;
          if (!item.formatted_address || !location) return null;

          return { 
            address: item.formatted_address, 
            coords: [location.lat, location.lng],
            kind: item.types?.[0] || 'geocode'
          };
        }).filter(Boolean) as SearchAddressOutput;
      }
      
      return [];
    } catch (error) {
      console.error('Error in searchAddressFlow:', error);
      if (error instanceof Error) throw error;
      throw new Error('Неизвестная ошибка при поиске адреса.');
    }
  }
);
