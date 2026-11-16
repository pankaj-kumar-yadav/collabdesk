import { cn } from "@/lib/utils";

type SkeletonProps = React.ComponentProps<"div">;

function Skeleton(props: SkeletonProps) {
  const { className, ...rest } = props;

  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-shimmer rounded-md", className)}
      {...rest}
    />
  );
}

export { Skeleton };
