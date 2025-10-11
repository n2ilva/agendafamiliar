// No-op stub to replace real Firebase config when running in local-only mode.
// Export minimal placeholders so existing imports don't fail during build.
const auth = {} as any;
const db = {} as any;
const storage = {} as any;
const analytics = null as any;
export { auth, db, storage, analytics };
export default {} as any;
