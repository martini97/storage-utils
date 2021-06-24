interface CustomStorageEventData {
  key: string;
  value: unknown;
}

const createEventId = (): string => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const package_ = require('../package.json');
  const baseName = process.env.npm_package_name || package_.name;
  return `${baseName}:__storage__`;
};

export const eventId = createEventId();

export function dispatch(key: string, value: unknown): void {
  const event = new CustomEvent<CustomStorageEventData>(eventId, {
    detail: {key, value},
  });
  window.dispatchEvent(event);
}
