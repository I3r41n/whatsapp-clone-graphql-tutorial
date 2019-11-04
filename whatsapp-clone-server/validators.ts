export const validatePassword = (ctx: string, str: string) => {
  if (typeof str !== 'string') {
    throw TypeError(`${ctx} must be a string`);
  }

  validateLength(ctx, str, 8, 30);

  if (!/[a-zA-Z]+/.test(str)) {
    throw TypeError(`${ctx} must contain english letters`);
  }

  if (!/\d+/.test(str)) {
    throw TypeError(`${ctx} must contain numbers`);
  }

  if (!/[^\da-zA-Z]+/.test(str)) {
    throw TypeError(`${ctx} must contain special charachters`);
  }
};

export const validateLength = (ctx: string, str: string, ...args: number[]) => {
  const min = args.length === 1 ? 0 : args[0]
  const max = args.length === 1 ? args[0] : args[1]

  if (typeof str !== 'string') {
    throw TypeError(`${ctx} must be a string`);
  }

  if (str.length < min) {
    throw TypeError(`${ctx} must be at least ${min} chars long`);
  }

  if (str.length > max) {
    throw TypeError(`${ctx} must contain ${max} chars at most`);
  }
};
