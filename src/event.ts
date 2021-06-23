interface CustomStorageEventData {
  key: string;
  value: unknown;
}

export const eventId = `${process.env.npm_package_name}:__storage__`;

export function dispatch(key: string, value: unknown): void {
  const event = new CustomEvent<CustomStorageEventData>(eventId, {
    detail: {key, value},
  });
  window.dispatchEvent(event);
}
