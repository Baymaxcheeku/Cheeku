import { View, type ViewProps } from "react-native";

import { shadow } from "@/theme/tokens";

/** The white panel every grouped section sits on. Web `components/ui/card`. */
export function Card({ className = "", style, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      {...props}
      className={`rounded-card bg-surface ${className}`}
      style={[shadow.e1, style]}
    />
  );
}
