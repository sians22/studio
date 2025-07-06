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
    const apiKey = process.env.YANDEX_API_KEY;
    if (!apiKey || apiKey === "ВАШ_API_КЛЮЧ_YANDEX_MAPS") {
        console.error("Yandex API key is not set or is a placeholder in the .env file.");
        throw new Error("Ключ API Яндекс не настроен. Пожалуйста, получите ключ и добавьте его в файл .env.");
    }

    // Bounding box for Chechen Republic: [lon,lat~lon,lat] -> [44.5,42.4~46.8,44.0]
    const bbox = "44.5,42.4~46.8,44.0";
    
    // Using Yandex Maps Geocoding API, relying on bbox for region restriction
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(query)}&format=json&lang=ru_RU&results=20&bbox=${bbox}&rspn=1`;
    
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
