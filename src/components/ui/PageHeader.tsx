import { Breadcrumb, type Crumb } from "./Breadcrumb";
import { cn } from "@/lib/utils";

/** The consistent top of every inner page: breadcrumb, title, optional lead. */
export function PageHeader({
  crumbs,
  title,
  description,
  className,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("border-b border-border bg-subtle", className)}>
      <div className="container-page py-8 md:py-12">
        <Breadcrumb items={crumbs} />

        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl leading-tight tracking-tight text-balance text-foreground md:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
