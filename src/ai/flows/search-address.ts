'use server';
/**
 * @fileOverview Flow to search for an address using Yandex Maps Geocoder.
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
    coords: z.array(z.number()).length(2).describe('Координаты адреса [широта, долгота].')
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
    // We use the main map API key as it's more likely to have Geocoding permissions.
    const apiKey = process.env.YANDEX_MAP_API_KEY;
    if (!apiKey || apiKey === "ВАШ_API_КЛЮЧ_YANDEX_MAPS") {
        console.error("Yandex Geocoder API key is not set or is a placeholder in the .env file.");
        throw new Error("Ключ API Яндекс Карт не настроен. Пожалуйста, убедитесь, что YANDEX_MAP_API_KEY задан в .env.");
    }

    // Worldwide search, results are prioritized by Yandex based on relevance and language.
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(query)}&format=json&lang=ru_RU&results=20`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Error fetching from Yandex Geocoder:', response.statusText, await response.text());
        return [];
      }
      const data = await response.json();
      
      const featureMembers = data.response?.GeoObjectCollection?.featureMember;

      if (Array.isArray(featureMembers)) {
        return featureMembers
          .map((item: any) => {
            const geoObject = item.GeoObject;
            if (!geoObject) return null;
            
            const address = geoObject.metaDataProperty?.GeocoderMetaData?.text;
            const pos = geoObject.Point?.pos;
            if (!address || !pos) return null;
            
            const [lon, lat] = pos.split(' ').map(Number);
            return { address, coords: [lat, lon] };
          })
          .filter(Boolean) as SearchAddressOutput;
      }
      
      return [];
    } catch (error) {
      console.error('Error in searchAddressFlow:', error);
      return [];
    }
  }
);
