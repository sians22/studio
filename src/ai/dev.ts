import { config } from 'dotenv';
config();

import '@/ai/flows/calculate-delivery-price.ts';
import '@/ai/flows/search-address.ts';
import '@/ai/flows/reverse-geocode.ts';
import '@/ai/flows/conversational-order.ts';
