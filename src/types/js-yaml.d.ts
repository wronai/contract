declare module 'js-yaml' {
  export function load(content: string): any;
  export function dump(value: any): string;
}
