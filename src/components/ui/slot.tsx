import {
  Children,
  cloneElement,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type SlotProps = HTMLAttributes<HTMLElement> & { children?: ReactNode };

/**
 * Passes styling down to a single child element instead of rendering a wrapper.
 * It lets a Link carry button styling without nesting an anchor inside a button,
 * which keeps the markup semantic and keyboard behaviour correct.
 */
export function Slot({ children, className, ...props }: SlotProps) {
  const child = Children.only(children);

  if (!isValidElement(child)) return null;

  const element = child as ReactElement<HTMLAttributes<HTMLElement>>;

  return cloneElement(element, {
    ...props,
    ...element.props,
    className: cn(className, element.props.className),
  });
}
