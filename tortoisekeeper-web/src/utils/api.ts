// Centralise l'URL du backend et fournit une fonction d'appel API générique
import { ApiError } from '../storage';

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || `http://localhost:4000`;

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Timeout de 30s
    
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const text = await response.text();
      let errorMessage = text;
      try {
        const errorJson = JSON.parse(text);
        errorMessage = errorJson.error || text;
      } catch {
        // Garder le message texte si ce n'est pas du JSON
      }
      throw new ApiError(errorMessage, response.status, text);
    }
    
    // Gérer les réponses vides
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null as T;
    }
    
    return await response.json() as T;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Requête timeout - le serveur ne répond pas', 408);
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Erreur de connexion au serveur',
      0
    );
  }
}
