// Simple service to wake up the backend on app launch
import { backend_url } from './api';

let isWakingUp = false;

/**
 * Wake up the backend server to avoid cold starts
 */
export async function wakeUpBackend(): Promise<void> {
  if (isWakingUp) return;
  
  isWakingUp = true;
  console.log('Waking up backend');

  try {
    const response = await fetch(`${backend_url}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      console.log('Backend awake');
    }
  } catch (error) {
    console.warn('Failed to wake up backend:', error);
  } finally {
    isWakingUp = false;
  }
}
