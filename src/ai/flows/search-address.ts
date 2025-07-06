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
    // Use the single public map key for all Yandex services
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAP_API_KEY;
    if (!apiKey) {
        console.error("Yandex API key is not set in the .env file.");
        throw new Error("Ключ API Яндекс Карт не настроен. Пожалуйста, убедитесь, что NEXT_PUBLIC_YANDEX_MAP_API_KEY задан в .env и имеет права на 'JavaScript API and HTTP Geocoder'.");
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
