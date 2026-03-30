import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth } from '../firebase';
import { OperationType, FirestoreErrorInfo } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateGuestId() {
  return 'G-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function getWhatsAppShareLink(phone: string, name: string, guestId: string) {
  const appUrl = window.location.origin;
  const message = `Bonjour ${name} ! 🥂 Nous sommes ravis de vous inviter à notre mariage. Veuillez utiliser votre ID unique : *${guestId}* pour confirmer votre présence ici : ${appUrl}?view=rsvp&id=${guestId}`;
  const encodedMessage = encodeURIComponent(message);
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified || undefined,
      isAnonymous: auth.currentUser?.isAnonymous || undefined,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
