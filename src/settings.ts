const DEFAULT_API_BASE_URL = "https://api.example.com";

export const apiSettings = {
  getApiUrl({ path }: { path: string }) {
    return new URL(path, process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL);
  }
};