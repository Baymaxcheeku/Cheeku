import {
  Activity,
  BadgeCheck,
  Bell,
  BookOpenCheck,
  CalendarClock,
  CalendarHeart,
  Clock3,
  ClipboardList,
  Cookie,
  CreditCard,
  DatabaseZap,
  Dna,
  Download,
  EyeOff,
  FileHeart,
  FileStack,
  FileText,
  FlaskConical,
  Globe,
  HardDrive,
  HeartHandshake,
  HeartPulse,
  History,
  IdCard,
  KeyRound,
  Lock,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircleHeart,
  MonitorSmartphone,
  Pill,
  PillBottle,
  Rocket,
  ScanEye,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Sunrise,
  Tag,
  Users,
  Users2,
  type LucideIcon,
} from "lucide-react-native";

import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { brand } from "@/theme/tokens";

/*
 * One place that turns the old line icons into Cheeku's 3D objects, so the
 * settings pages can keep passing a lucide icon and still draw the new art.
 * Anything without a matching object stays a line icon in brand violet.
 */
const MAP = new Map<LucideIcon, Icon3DName>([
  [Activity, "heart"],
  [BadgeCheck, "shield-check"],
  [Bell, "bell"],
  [BookOpenCheck, "signpost"],
  [CalendarClock, "calendar"],
  [CalendarHeart, "calendar"],
  [Clock3, "clock"],
  [ClipboardList, "clipboard"],
  [Cookie, "shield-check"],
  [CreditCard, "trophy"],
  [DatabaseZap, "cloud"],
  [Dna, "dna"],
  [Download, "cloud"],
  [EyeOff, "lock"],
  [FileHeart, "folder"],
  [FileStack, "folder"],
  [FileText, "report"],
  [FlaskConical, "test-tube"],
  [Globe, "signpost"],
  [HardDrive, "cloud"],
  [HeartHandshake, "family"],
  [HeartPulse, "heart"],
  [History, "clock"],
  [IdCard, "people"],
  [KeyRound, "lock"],
  [Lock, "lock"],
  [LockKeyhole, "lock"],
  [Mail, "message"],
  [MapPin, "pin"],
  [MessageCircleHeart, "chat"],
  [MonitorSmartphone, "phone"],
  [Pill, "capsule"],
  [PillBottle, "blister"],
  [Rocket, "star"],
  [ScanEye, "shield-check"],
  [ScanLine, "report"],
  [ShieldAlert, "first-aid"],
  [ShieldCheck, "shield-check"],
  [Stethoscope, "stethoscope"],
  [Sunrise, "shoe"],
  [Tag, "gift"],
  [Users, "people"],
  [Users2, "family"],
]);

export function art3dFor(icon: LucideIcon): Icon3DName | undefined {
  return MAP.get(icon);
}

/** A 3D object when there is one for this icon; the line icon otherwise. */
export function IconArt({ icon: Icon, size = 30, color = brand[600] }: { icon: LucideIcon; size?: number; color?: string }) {
  const art = MAP.get(Icon);
  if (art) return <Icon3D name={art} size={size} />;
  return <Icon size={Math.round(size * 0.6)} color={color} strokeWidth={1.9} />;
}
