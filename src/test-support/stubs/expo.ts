export const nativeModuleRegistry = new Map<string, unknown>();
export const requireOptionalNativeModule = (name: string): unknown => nativeModuleRegistry.get(name) ?? null;
export default { requireOptionalNativeModule };
