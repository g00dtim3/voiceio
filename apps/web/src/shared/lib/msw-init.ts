export async function initMSW() {
  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_MSW_ENABLED === "true"
  ) {
    const { worker } = await import("@/test/mocks/browser");
    await worker.start({
      onUnhandledRequest: "bypass",
    });
  }
}
