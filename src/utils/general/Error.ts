type ErrorShape = {
  response?: {
    data?: {
      message?: string;
      errors?: Array<{ message?: string }> | Record<string, { message?: string } | string>;
    };
  };
  message?: string;
};

export function GetResponseValidationErrors({ error }: { error: unknown; RHF?: unknown }): string[] {
  const normalizedError = error as ErrorShape | undefined;
  const responseErrors = normalizedError?.response?.data?.errors;

  if (Array.isArray(responseErrors)) {
    return responseErrors.map((item) => item?.message).filter((message): message is string => Boolean(message));
  }

  if (responseErrors && typeof responseErrors === "object") {
    return Object.values(responseErrors)
      .map((item) => (typeof item === "string" ? item : item?.message))
      .filter((message): message is string => Boolean(message));
  }

  if (normalizedError?.response?.data?.message) {
    return [normalizedError.response.data.message];
  }

  if (normalizedError?.message) {
    return [normalizedError.message];
  }

  return [];
}