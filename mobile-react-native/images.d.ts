/* Metro resolves an imported image to an asset reference that <Image source>
   takes directly. expo-env.d.ts would declare this too, but it is gitignored
   and only exists after `expo start`, so a fresh checkout's typecheck needs
   it here. */
declare module "*.png" {
  const source: import("react-native").ImageSourcePropType;
  export default source;
}
