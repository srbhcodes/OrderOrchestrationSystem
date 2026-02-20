/**
 * Single mock external service. Simulates delay and optional failure.
 */
const DELAY_MS_MIN = 1000;
const DELAY_MS_MAX = 3000;
const FAILURE_RATE = 0.15; // 15% chance to fail

export async function executeMockTask(taskType: string): Promise<{ success: boolean; data?: unknown }> {
  const delay = DELAY_MS_MIN + Math.random() * (DELAY_MS_MAX - DELAY_MS_MIN);
  await new Promise((r) => setTimeout(r, delay));

  if (Math.random() < FAILURE_RATE) {
    throw new Error(`Mock failure for ${taskType}`);
  }

  return { success: true, data: { taskType, completedAt: new Date().toISOString() } };
}
