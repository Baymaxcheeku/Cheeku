import { Image } from "expo-image";

/*
 * CHEEKU'S 3D ICONS.
 *
 * The owner's own set (17 Nov 2026), drawn for Cheeku: soft blue and white
 * objects with one warm accent. Cut from the master sheet onto transparent
 * backgrounds, 192px square, in assets/icon3d. Use them where an object helps
 * someone find their way (services, areas, the plan); keep the thin line
 * icons for controls.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const ART = {
  doctor: require("../../../assets/icon3d/doctor.png"),
  stethoscope: require("../../../assets/icon3d/stethoscope.png"),
  "test-tube": require("../../../assets/icon3d/test-tube.png"),
  capsule: require("../../../assets/icon3d/capsule.png"),
  blister: require("../../../assets/icon3d/blister.png"),
  video: require("../../../assets/icon3d/video.png"),
  shoe: require("../../../assets/icon3d/shoe.png"),
  dumbbell: require("../../../assets/icon3d/dumbbell.png"),
  food: require("../../../assets/icon3d/food.png"),
  water: require("../../../assets/icon3d/water.png"),
  lotus: require("../../../assets/icon3d/lotus.png"),
  heart: require("../../../assets/icon3d/heart.png"),
  clipboard: require("../../../assets/icon3d/clipboard.png"),
  glucose: require("../../../assets/icon3d/glucose.png"),
  scale: require("../../../assets/icon3d/scale.png"),
  moon: require("../../../assets/icon3d/moon.png"),
  watch: require("../../../assets/icon3d/watch.png"),
  calendar: require("../../../assets/icon3d/calendar.png"),
  "calendar-check": require("../../../assets/icon3d/calendar-check.png"),
  bell: require("../../../assets/icon3d/bell.png"),
  report: require("../../../assets/icon3d/report.png"),
  folder: require("../../../assets/icon3d/folder.png"),
  family: require("../../../assets/icon3d/family.png"),
  trophy: require("../../../assets/icon3d/trophy.png"),
  lock: require("../../../assets/icon3d/lock.png"),
  headset: require("../../../assets/icon3d/headset.png"),
  gift: require("../../../assets/icon3d/gift.png"),
  shield: require("../../../assets/icon3d/shield.png"),
  star: require("../../../assets/icon3d/star.png"),
  chat: require("../../../assets/icon3d/chat.png"),
  blood: require("../../../assets/icon3d/blood.png"),
  syringe: require("../../../assets/icon3d/syringe.png"),
  hospital: require("../../../assets/icon3d/hospital.png"),
  monitor: require("../../../assets/icon3d/monitor.png"),
  ambulance: require("../../../assets/icon3d/ambulance.png"),
  "brain": require("../../../assets/icon3d/brain.png"),
  "call": require("../../../assets/icon3d/call.png"),
  "clock": require("../../../assets/icon3d/clock.png"),
  "cloud": require("../../../assets/icon3d/cloud.png"),
  "cloud-sync": require("../../../assets/icon3d/cloud-sync.png"),
  "dna": require("../../../assets/icon3d/dna.png"),
  "first-aid": require("../../../assets/icon3d/first-aid.png"),
  "gear": require("../../../assets/icon3d/gear.png"),
  "handshake": require("../../../assets/icon3d/handshake.png"),
  "house": require("../../../assets/icon3d/house.png"),
  "laptop": require("../../../assets/icon3d/laptop.png"),
  "map": require("../../../assets/icon3d/map.png"),
  "message": require("../../../assets/icon3d/message.png"),
  "people": require("../../../assets/icon3d/people.png"),
  "phone": require("../../../assets/icon3d/phone.png"),
  "pin": require("../../../assets/icon3d/pin.png"),
  "plant": require("../../../assets/icon3d/plant.png"),
  "shield-check": require("../../../assets/icon3d/shield-check.png"),
  "signpost": require("../../../assets/icon3d/signpost.png"),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

export type Icon3DName = keyof typeof ART;

export function Icon3D({ name, size = 32 }: { name: Icon3DName; size?: number }) {
  return <Image source={ART[name]} style={{ width: size, height: size }} contentFit="contain" accessibilityIgnoresInvertColors accessible={false} />;
}
