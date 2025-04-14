// https://github.com/nmamali/expo-barcode-generator/issues/6
declare module "expo-barcode-generator" {
    import { BaseOptions as JsBarcodeOptions } from "jsbarcode";
    export const Barcode: React.FC<{
        value: string;
        options?: JsBarcodeOptions;
        rotation?: number;
    }>;
}