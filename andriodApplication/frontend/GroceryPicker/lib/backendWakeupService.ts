// Simple service to wake up the backend on app launch
import { backend_url } from './api';

let isWakingUp = false;
let hasWokenUp = false;

/**
 * Wake up the backend server to avoid cold starts
 */
export async function wakeUpBackend(): Promise<void> {
  // Skip if already woken up or currently waking up
  if (isWakingUp || hasWokenUp) return;
  
  isWakingUp = true;
  console.log('Waking up backend');

  try {
    const response = await fetch(`${backend_url}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      console.log('Backend awake');
      hasWokenUp = true;
    }
  } catch (error) {
    console.warn('Failed to wake up backend:', error);
  } finally {
    isWakingUp = false;
  }
}
