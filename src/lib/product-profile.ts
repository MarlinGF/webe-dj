export const WEBE_DJ_PRODUCT_ID = 'webe-dj';

export function webeDjProfilePath(uid: string) {
  return `products/${WEBE_DJ_PRODUCT_ID}/users/${uid}`;
}
