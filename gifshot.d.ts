declare module "gifshot" {
  interface GifOptions {
    images: string[];
    gifWidth?: number;
    gifHeight?: number;
    interval?: number;
    numWorkers?: number;
    frameDuration?: number;
    sampleInterval?: number;
    transparent?: string | null;
  }

  interface GifResponse {
    error: boolean;
    errorCode?: number;
    errorMsg?: string;
    image?: string;
  }

  export function createGIF(
    options: GifOptions,
    callback: (response: GifResponse) => void
  ): void;
}
