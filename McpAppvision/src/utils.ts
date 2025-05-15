import { keepAlive, getSession, getIp } from "./sessionManager.js";

/**
 * Cette fonction permet de vérifier si une session est active et récupère l'IP.
 * Elle renvoie également les en-têtes nécessaires pour les requêtes HTTP.
 * 
 * @returns {Promise<{sessionId: string, ip: string, headers: Record<string, string>}>} 
 * Retourne un objet contenant sessionId, ip et les headers nécessaires.
 */
export async function getSessionAndHeaders(): Promise<{ sessionId: string, ip: string, headers: Record<string, string> } | null> {
  keepAlive();

  const sessionId = getSession();
  const ip = getIp();

  if (!sessionId) {
    console.error('No active session. Please log in first.');
    return null;
  }

  const headers = {
    'SessionID': sessionId,
    'Content-Type': 'application/xml'
  };

  return { sessionId, ip, headers };
}
