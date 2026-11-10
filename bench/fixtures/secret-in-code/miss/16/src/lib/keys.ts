import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
const client = new SecretManagerServiceClient();
export async function openaiKey() {
  const [v] = await client.accessSecretVersion({ name: 'projects/p/secrets/openai/versions/latest' });
  return v.payload?.data?.toString() ?? '';
}
