import { createAvatar } from "@dicebear/core";
import { lorelei } from "@dicebear/collection";

export function dicebearAvatarDataUri(props: {
  seed: string;
  size?: number;
  backgroundColor?: string;
}) {
  const { seed, size = 128, backgroundColor } = props;
  const avatar = createAvatar(lorelei, {
    seed,
    size,
    ...(backgroundColor
      ? { backgroundColor: [backgroundColor.replace("#", "")] }
      : {}),
  });
  return avatar.toDataUri();
}
