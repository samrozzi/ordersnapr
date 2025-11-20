import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset="80px"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:backdrop-blur-sm",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          success: "group-[.toaster]:border-emerald-500/20 group-[.toaster]:bg-emerald-50/90 dark:group-[.toaster]:bg-emerald-950/90",
          error: "group-[.toaster]:border-red-500/20 group-[.toaster]:bg-red-50/90 dark:group-[.toaster]:bg-red-950/90",
          warning: "group-[.toaster]:border-amber-500/20 group-[.toaster]:bg-amber-50/90 dark:group-[.toaster]:bg-amber-950/90",
          info: "group-[.toaster]:border-cyan-500/20 group-[.toaster]:bg-cyan-50/90 dark:group-[.toaster]:bg-cyan-950/90",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
