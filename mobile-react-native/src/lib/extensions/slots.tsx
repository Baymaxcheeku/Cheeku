import { Component, type ReactNode } from "react";
import { View } from "react-native";

import { extensions, type HomeCardProps } from "@/lib/extensions";

/** A layer's card that crashes takes itself out, not Home. */
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Every registered Home card, in registration order. Renders nothing when there are none. */
export function HomeExtensions(props: HomeCardProps) {
  const cards = extensions().filter((e) => e.homeCard);
  if (!cards.length) return null;
  return (
    <View>
      {cards.map((e) => {
        const Card = e.homeCard as NonNullable<typeof e.homeCard>;
        return (
          <Quiet key={e.id}>
            <Card {...props} />
          </Quiet>
        );
      })}
    </View>
  );
}
