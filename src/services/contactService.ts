import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export interface ContactInquiry {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export async function sendContactInquiry(inquiry: ContactInquiry): Promise<void> {
  const response = await axios.post(`${API_BASE_URL}/contact`, inquiry, { timeout: 30000 });
  if (response.data?.success !== true) throw new Error('CONTACT_DELIVERY_FAILED');
}

export function contactErrorKey(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 400) return 'contact.invalidInput';
    if (error.response?.status === 429) return 'contact.rateLimit';
    if (!error.response) return 'contact.networkError';
  }
  return 'contact.deliveryError';
}
